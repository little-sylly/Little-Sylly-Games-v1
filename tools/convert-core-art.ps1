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
# CURRENT RUN: Flawless (flw) — 10 gem masters + 1 case (back) become FLW's default.
#
# Source folder of original art (masters; a skin-pack folder here, normally kept
# out of the repo).
$src = "d:\Coding Projects\Little-Sylly-Games\data\flw"
# Destination — always data/art/<kind>/img.
$dst = "d:\Coding Projects\Little-Sylly-Games\data\art\flw\img"
# source filename (no extension) -> the game's own card id / asset key.
# Art filenames do NOT have to match the game's ids: that is what this map and the
# manifest are for. Use 'back' for the face-down image; anything that isn't a card
# face (reference diagrams, board art) goes in the manifest's `extras` block.
# flw's masters are named for the gem, not the carat id — FLW_DECK (flw.js) is the
# id<->name mapping this map is transcribing.
$map = @{
  'pinkdiamond'='9';    'bloodruby'='8';       'bluesapphire'='7'
  'greenemerald'='6';   'yellowtopaz'='5';     'imperialjade'='4'
  'blackopal'='3';      'purpleamethyst'='2';  'clearquartz'='1'
  'rawobsidian'='0'
  'case'='back'
}
# The masters are 1024x1024 SQUARE and so is the on-table card (spec §2 D1/D2 — no
# cover-crop discard here, unlike CJAR's portrait hero). 512px chosen against the
# RENDER size per logic-engine.md § PWA Guardian: FLW's largest consumer is the art
# viewer (~340 CSS px, ~1020 device px at 3x DPR), not the on-table card (lg = 88 CSS
# px, 5.8x smaller than 512). Do not inherit PKO's 360px/40KB — different render size.
$cardWidth  = 512;  $cardCap  = 60KB
$extraKeys  = @()                 # FLW has no non-card art
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
  # Masters aren't uniformly one format run to run (flw's are .jpg + one .png case) —
  # try both rather than hardcoding one extension.
  $inPath = Join-Path $src "$key.jpg"
  if (-not (Test-Path $inPath)) { $inPath = Join-Path $src "$key.png" }
  if (-not (Test-Path $inPath)) { "MISSING SOURCE: $key.(jpg|png)"; continue }

  $id = $map[$key]
  if ($extraKeys -contains $id) { $targetW = $extraWidth; $cap = $extraCap }
  else                          { $targetW = $cardWidth;  $cap = $cardCap  }

  $img = [System.Drawing.Image]::FromFile($inPath)
  $targetH = [int][Math]::Round($targetW * $img.Height / $img.Width)   # aspect preserved
  $bmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  # A new Bitmap is NOT white by default — any source with an alpha channel (a PNG
  # with transparency, e.g. flw's case.png) leaves those pixels black once JPEG
  # encoding drops alpha, baking a hard black silhouette around the subject. Filling
  # white first is a no-op for already-opaque sources (every plain JPEG master) and
  # the fix for anything with real transparency.
  $g.Clear([System.Drawing.Color]::White)
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
