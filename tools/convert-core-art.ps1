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
# Source folder of original art (keep this OUT of the repo — masters only).
$src = "d:\Coding Projects\Little-Sylly-Games\data\pko"
# Destination — always data/art/<kind>/img.
$dst = "d:\Coding Projects\Little-Sylly-Games\data\art\pko\img"
# source filename (no extension) -> the game's own card id / asset key.
# Art filenames do NOT have to match the game's ids: that is what this map and the
# manifest are for. Use 'back' for the face-down image; anything that isn't a card
# face (reference diagrams, board art) goes in the manifest's `extras` block.
# The per-game id keys are in docs/expansion-guide.md § `faces` id cheat-sheet.
$map = @{
  'mouse'='mouse'; 'mongoose'='mongoose'; 'leopard'='leopard'; 'eagle'='eagle';
  'bear'='bear'; 'elephant'='elephant'; 'bee'='bee'; 'fish'='fish';
  'octopus'='octopus'; 'seal'='seal'; 'polarbear'='polar_bear'; 'orca'='orca';
  'stingray'='stingray'; 'poacher'='human'; 'mimic'='mimic';
  'cardback'='back'; 'chaindiagram'='chain'
}
# Cards render at ~68×92 CSS px, so 360 px wide is ~1.5× a 3×-DPR render — plenty.
# Anything read rather than glanced at (a chain/reference diagram) gets more pixels.
$cardWidth  = 360;  $cardCap  = 40KB
$extraKeys  = @('chain')          # ids that use the looser budget below
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
