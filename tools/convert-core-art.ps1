# ═══════════════════════════════════════════════════════════════════════════
# convert-core-art.ps1 — downscale + compress source art into a core art pack.
#
# WHAT THIS IS FOR
#   A game's default artwork ships as a core art pack (data/art/<kind>/img/) and is
#   PRECACHED, so every kilobyte lands in the install. Source art from an image
#   generator is typically 1.5–2 MB per card; this brings it under the ceiling.
#   See docs/expansion-guide.md § Core art packs for the full procedure — this
#   script is only step 1 of 4 (convert → manifest → registry → precache + SW bump).
#
# WHY POWERSHELL AND WHY JPEG
#   There is no cwebp / ImageMagick / sharp on the build machine and the project
#   forbids npm (CLAUDE.md § Anti-Patterns), so .NET System.Drawing is the tool
#   available. It has no WebP encoder — hence JPEG. That is fine for full-bleed art
#   with no transparency, which is what card faces are. If you need alpha (a die
#   face, a token with a cut-out), convert to PNG by hand instead and accept the
#   larger file, or install an encoder and swap the format — the pack manifest maps
#   id → filename, so nothing in the code cares about the extension.
#
# USAGE
#   1. Edit the CONFIG block below (source folder, destination kind, the id map).
#   2. Run:  & "tools\convert-core-art.ps1"
#   3. Check the printed table — every row should say "ok".
#   4. Write data/art/<kind>/pack.json using the id column as the `faces` keys.
#
# PKO's run for reference: 17 files, 896×1200 PNGs → 360 px JPEGs, 26 MB → 682 KB.
# ═══════════════════════════════════════════════════════════════════════════

Add-Type -AssemblyName System.Drawing

# ── CONFIG ─────────────────────────────────────────────────────────────────
# Edited per run — one game at a time. A previous run's id map is never lost:
# it is preserved verbatim in that game's data/art/<kind>/pack.json `faces` block.
#
# CURRENT RUN: Cookie Jar (cjar) — 14 owner-supplied masters become CJAR's default.
#
# Source folder of original art (masters; a skin-pack folder here, normally kept
# out of the repo).
$src = "d:\Coding Projects\Little-Sylly-Games\data\cjar"
# Destination — always data/art/<kind>/img.
$dst = "d:\Coding Projects\Little-Sylly-Games\data\art\cjar\img"
# source filename (no extension) -> the game's own card id / asset key.
# Art filenames do NOT have to match the game's ids: that is what this map and the
# manifest are for. Use 'back' for the face-down image; anything that isn't a card
# face (reference diagrams, board art) goes in the manifest's `extras` block.
# The per-game id keys are in docs/expansion-guide.md § `faces` id cheat-sheet.
# cjar's masters are named for their SUBJECT, not their manifest key, so this map is
# doing real work. treat1..treat5 are in REVEAL order, which is exactly
# treatSchedule["5"] — so treat5 (brownies) is the one that lands on the final Raid at
# either match length, and 1-3 are the 5-point specials while 4-5 are the 10-point
# supers. Owner-confirmed 2 Aug 2026; do not reorder.
$map = @{
  'handful'='cookie-handful';  'batch'='cookie-batch';  'mountain'='cookie-mountain'
  'mum'='family-mum';          'dad'='family-dad';      'bigsib'='family-big'
  'grandma'='family-grandma';  'fampet'='family-pet'
  'treat1'='treat-shortbread'; 'treat2'='treat-redvelvet'
  'treat3'='treat-macadamia';  'treat4'='treat-macarons'
  'treat5'='treat-brownies'
  'cardback'='back'
}
# The masters are 1024x1024 SQUARE but the hero card is portrait (15rem x 20.6rem,
# ratio 0.728), so background-size:cover discards ~27% horizontally. Width chosen by
# MEASUREMENT, not by copying an earlier run: at 480px the busiest cards (mountain,
# treat1) are forced to q58 by the 40KB cap and show JPEG blocking; 560px and 640px
# breach the cap outright. 360px holds every file at q80-88 for ~472KB total.
# NOTE this game breaks the suite's usual comfortable margin: PKO's card renders at
# 4.25rem so 360px is 5.3x its CSS width, whereas cjar's 15rem hero makes the same
# 360px only ~1.1x effective after the cover-crop. Illustrated art upscales far more
# gracefully than blocky JPEG, hence clean-and-soft over sharp-and-artefacted. If a
# sharper hero is ever wanted, pre-cropping the masters to the card aspect buys ~1.9x
# more VISIBLE pixels per byte — but it permanently discards 27% of the artwork, so
# that is an owner call, not a converter default.
$cardWidth  = 360;  $cardCap  = 40KB
$extraKeys  = @()                 # SHP has no non-card art
$extraWidth = 800;  $extraCap = 160KB
# ───────────────────────────────────────────────────────────────────────────

if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Force $dst | Out-Null }

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

function Save-Jpeg($bmp, $path, $quality) {
  $ps = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $ps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$quality)
  $bmp.Save($path, $codec, $ps)
  $ps.Dispose()
}

foreach ($key in $map.Keys) {
  $inPath = Join-Path $src "$key.png"
  if (-not (Test-Path $inPath)) { "MISSING SOURCE: $key.png"; continue }

  $id = $map[$key]
  if ($extraKeys -contains $id) { $targetW = $extraWidth; $cap = $extraCap }
  else                          { $targetW = $cardWidth;  $cap = $cardCap  }

  $img = [System.Drawing.Image]::FromFile($inPath)
  $targetH = [int][Math]::Round($targetW * $img.Height / $img.Width)   # aspect preserved
  $bmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($img, 0, 0, $targetW, $targetH)
  $g.Dispose()
  $img.Dispose()

  # Walk quality down until the file fits. Busy images land lower — PKO's bee.jpg
  # bottomed out at q68 and still reads fine at card size.
  $outPath = Join-Path $dst "$id.jpg"
  $final = 0
  foreach ($q in 88, 84, 80, 76, 72, 68, 64, 58, 52) {
    Save-Jpeg $bmp $outPath $q
    $final = $q
    if ((Get-Item $outPath).Length -le $cap) { break }
  }
  $bmp.Dispose()
  $size = (Get-Item $outPath).Length
  $flag = if ($size -le $cap) { 'ok' } else { 'OVER CAP - re-crop or lower the width' }
  "{0,-14} -> {1,-16} {2}x{3}  q{4,-3} {5,6:N0} KB  {6}" -f $key, "$id.jpg", $targetW, $targetH, $final, ($size/1KB), $flag
}

$total = (Get-ChildItem $dst -File | Measure-Object -Property Length -Sum).Sum
""; "TOTAL: {0:N0} KB across {1} files" -f ($total/1KB), (Get-ChildItem $dst -File).Count
""; "Next: write data/art/<kind>/pack.json, add the id to data/art/registry.json,"
"then add the manifest AND every image to PRECACHE_URLS in sw.js and bump CACHE_NAME."
