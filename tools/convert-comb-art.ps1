# ===========================================================================
# convert-comb-art.ps1 - downscale + compress Honeycomb Hills' delivered art
# into its NINE core art packs.
#
# WHAT THIS IS FOR
#   Honeycomb Hills is the suite's first game whose default art spans more
#   than one `kind` (js/lib/art.js resolves ONE kind per manifest, and COMB's
#   four render seams + four extras use nine distinct kind strings). Every
#   other game's core art fits tools/convert-core-art.ps1's two-tier
#   (card width / extra width) JPEG-only config; COMB needs nine different
#   target boxes and, because every one of its assets is drawn on a
#   transparent background (hex tiles tessellate on canvas by their OWN alpha,
#   pieces/pogs/blossoms/wasp/die are drawImage'd with no clip path), PNG with
#   real alpha rather than JPEG. See docs/expansion-guide.md § Core art packs
#   for the full 4-step procedure - this script is step 1 (the -Instinct group
#   IS opaque full-bleed card art, so it alone stays JPEG, matching every
#   other game's card faces).
#
# WHY POWERSHELL AND WHY PNG (mostly)
#   No cwebp / ImageMagick / sharp on the build machine, npm is forbidden
#   (CLAUDE.md § Anti-Patterns), so .NET System.Drawing is the tool available.
#   PNG has no quality knob, only size - so where a group lands over its cap
#   this script steps the target width down and retries, same idea as the
#   JPEG quality walk in convert-core-art.ps1 / make-skin-pack.ps1.
#
# EVERY GROUP RESIZES BY STRETCHING TO THE EXACT TARGET BOX, never
# crop-to-fill or letterbox-and-pad. This matches how every seam actually
# consumes these images: a fixed CSS box (background-size: cover/contain on
# an already near-target-aspect master) or an explicit canvas
# ctx.drawImage(img, x, y, w, h) with no clip - both stretch to a rect, so a
# source a few percent off the target aspect costs nothing extra by matching
# the consumer instead of guessing a crop it will never see.
#
# USAGE
#   & "tools\convert-comb-art.ps1"
#   Writes into data/art/comb/<sub>/img/ (all nine nested under one comb/
#   folder, not nine top-level data/art/comb-*/ dirs — cleanup 9 Sep 2026).
#   Then: each data/art/comb/<sub>/pack.json's own "id" field must read
#   "comb/<sub>" (assets.kind stays comb-hex/comb-res/etc — that's what
#   comb.js's assetFace/assetBack/assetExtra calls actually pass, unrelated to
#   where the manifest lives), add "comb/<sub>" for all nine to
#   data/art/registry.json, add the manifest AND every image to
#   PRECACHE_URLS in sw.js, bump CACHE_NAME.
# ===========================================================================

Add-Type -AssemblyName System.Drawing

$src     = "D:\Coding Projects\Little-Sylly-Games\data\art\pending\comb"
$dstRoot = "D:\Coding Projects\Little-Sylly-Games\data\art"

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
function Save-Jpeg($bmp, $path, $quality) {
  $ps = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $ps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$quality)
  $bmp.Save($path, $jpegCodec, $ps)
  $ps.Dispose()
}

# Renders $inPath into a new bitmap of exactly $w x $h, stretched (never
# cropped/letterboxed - see header). PNG keeps the source alpha; JPEG fills
# white first (a new Bitmap is NOT white by default, and any alpha in an
# "opaque" master would otherwise bake a black silhouette once JPEG drops it).
function Render-Stretched($inPath, $w, $h, $png) {
  $img = [System.Drawing.Image]::FromFile($inPath)
  $fmt = if ($png) { [System.Drawing.Imaging.PixelFormat]::Format32bppArgb } else { [System.Drawing.Imaging.PixelFormat]::Format24bppRgb }
  $bmp = New-Object System.Drawing.Bitmap($w, $h, $fmt)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  if (-not $png) { $g.Clear([System.Drawing.Color]::White) }
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($img, 0, 0, $w, $h)
  $g.Dispose(); $img.Dispose()
  return $bmp
}

# One group per `kind`. Map keys are pending/ source filenames (no extension);
# values are the seam id. `Dims` returns [w,h] for a given id - a function
# because comb-piece's wall-* ids are landscape (112x40) while cell-*/dome-*
# are square (96x96); every other group is one fixed box for all its ids.
# `Sub` is the folder under data/art/comb/ (data/art/comb/<Sub>/img/…); `Id` stays
# the manifest's own kind-ish label for console output only. Both pack.json's own
# "id" field and its data/art/registry.json entry must read "comb/<Sub>" — the
# nesting is a pure location choice, `assets.kind` (comb-hex, comb-res, …, what
# comb.js's assetFace/assetBack/assetExtra calls actually pass) never changes.
# 10 Sep 2026 — hex/res/hero/die caps raised again, substantially, after owner
# review of the SHIPPED gallery: the DD-19 caps (tuned against the pre-art
# estimate, then only modestly loosened for hero/die) produced visibly
# pixelated art once the art viewer's DD-22 fix started scaling these small
# masters UP to fill its ~342-390px box — a 84px hex stretched to 342px is a
# 4x upscale, and no amount of encoder cleverness hides that. Owner's call:
# the precache KB/MB cost is not the constraint for gallery-facing art: bigger
# masters, ~4x resolution across hex/res/hero/die. board pieces, Trade
# Blossoms, the Wasp and the pogs are UNCHANGED — none of them render in a
# how-to gallery or the art viewer, only ever on the small canvas board, so
# their original small-render caps (DD-19) are still correctly sized.
$groups = @(
  @{ Id='comb-hex'; Sub='hex'; W=340; H=460; Ext='png'; Cap=350KB
     Map=[ordered]@{ grove='grove'; blossom='blossom'; sunflower='clover'; rock='rock'; nursery='nursery'; smoke='smoke' } },
  @{ Id='comb-res'; Sub='res'; W=260; H=260; Ext='png'; Cap=150KB
     Map=[ordered]@{ resin='resin'; wax='wax'; pollen='pollen'; nectar='nectar'; 'royal jelly'='jelly' } },
  @{ Id='comb-instinct'; Sub='instinct'; W=600; H=600; Ext='jpg'; Cap=40KB
     Map=[ordered]@{ guard='guard'; golden='golden'; rush='rush'; bloom='bloom'; pheromone='pheromone'; back='back' } },
  @{ Id='comb-piece'; Sub='piece'; Ext='png'; Cap=6KB
     Map=[ordered]@{
       'wall 1'='wall-0'; 'wall 2'='wall-1'; 'wall 3'='wall-2'; 'wall 4'='wall-3'
       'cell 1'='cell-0'; 'cell 2'='cell-1'; 'cell 3'='cell-2'; 'cell 4'='cell-3'
       'dome 1'='dome-0'; 'dome 2'='dome-1'; 'dome 3'='dome-2'; 'dome 4'='dome-3'
     }
     Dims = { param($id) if ($id -like 'wall-*') { 112,40 } else { 96,96 } } },
  # Cap raised 14KB -> 27KB -> 130KB across two passes (comb-implementation-notes
  # DD-19, DD-23): the ornate hero art (filigree/gems/crown) needs real
  # resolution to survive the art viewer's ~342-390px box, not just the
  # ~90-100px gallery tile it was originally sized for.
  @{ Id='comb-piece-hero'; Sub='piece-hero'; W=280; H=280; Ext='png'; Cap=130KB
     Map=[ordered]@{
       'wall 1 gallery'='wall-0'; 'wall 2 gallery'='wall-1'; 'wall 3 gallery'='wall-2'; 'wall 4 gallery'='wall-3'
       'cell 1 gallery'='cell-0'; 'cell 2 gallery'='cell-1'; 'cell 3 gallery'='cell-2'; 'cell 4 gallery'='cell-3'
       'dome 1 gallery'='dome-0'; 'dome 2 gallery'='dome-1'; 'dome 3 gallery'='dome-2'; 'dome 4 gallery'='dome-3'
     } },
  @{ Id='comb-blossom'; Sub='blossom'; W=112; H=112; Ext='png'; Cap=8KB
     Map=[ordered]@{ 'generic trade'='generic'; 'resin trade'='resin'; 'wax trade'='wax'; 'pollen trade'='pollen'; 'nectar trade'='nectar'; 'jelly trade'='jelly' } },
  @{ Id='comb-wasp'; Sub='wasp'; W=112; H=112; Ext='png'; Cap=10KB
     Map=[ordered]@{ wasp='wasp' } },
  @{ Id='comb-pog'; Sub='pog'; W=96; H=96; Ext='png'; Cap=4KB
     Map=[ordered]@{ blank='blank'; hot='hot' } },
  # Cap raised 12KB -> 26KB -> 150KB across two passes (comb-implementation-notes
  # DD-19, DD-23): a faceted, translucent, internally-glowing orb is exactly
  # the content lossless PNG compresses worst, and 260px is what it takes to
  # not look soft once this die is actually spinning at up to 160px render.
  @{ Id='comb-die'; Sub='die'; W=260; H=260; Ext='png'; Cap=150KB
     # Names are INVERTED vs the ids (comb-art-prompts.md § 8): the UNNUMBERED
     # master ships as id `die`; the NUMBERED master is the How-to comparison `die-numbered`.
     Map=[ordered]@{ 'die unnumbered'='die'; 'die'='die-numbered' } }
)

$grandTotal = 0
$grandCount = 0
$missing = @()

foreach ($grp in $groups) {
  $dst = Join-Path $dstRoot "comb\$($grp.Sub)\img"
  if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Force $dst | Out-Null }
  $isPng = $grp.Ext -eq 'png'

  "";  "=== $($grp.Id) ($($grp.Ext.ToUpper())) ===" ; "-" * 60

  foreach ($key in $grp.Map.Keys) {
    $inPath = Join-Path $src "$key.png"
    if (-not (Test-Path $inPath)) { "MISSING SOURCE: $key.png"; $missing += "$($grp.Id): $key.png"; continue }
    $id = $grp.Map[$key]

    if ($grp.ContainsKey('Dims')) { $wh = & $grp.Dims $id; $w = $wh[0]; $h = $wh[1] }
    else { $w = $grp.W; $h = $grp.H }

    $outPath = Join-Path $dst "$id.$($grp.Ext)"
    $cap = $grp.Cap
    $curW = $w; $curH = $h
    $usedW = $curW; $usedH = $curH   # dims actually behind the LAST save — see below
    $final = ''
    for ($attempt = 0; $attempt -lt 16; $attempt++) {
      $usedW = $curW; $usedH = $curH   # capture BEFORE any further shrink, or a
                                        # successful final save gets reported at
                                        # the size the loop was about to try NEXT
                                        # rather than the one actually on disk.
      $bmp = Render-Stretched $inPath $curW $curH $isPng
      if ($isPng) {
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $final = 'png'
      } else {
        $q = 0
        foreach ($try in 88, 84, 80, 76, 72, 68, 64, 58) {
          Save-Jpeg $bmp $outPath $try
          $q = $try
          if ((Get-Item $outPath).Length -le $cap) { break }
        }
        $final = "q$q"
      }
      $bmp.Dispose()
      $size = (Get-Item $outPath).Length
      if ($size -le $cap -or $curW -le 24) { break }
      # PNG has no quality knob - only width/height to retry with, stepped down ~15%.
      $curW = [int]($curW * 0.85); $curH = [int]($curH * 0.85)
    }

    $size = (Get-Item $outPath).Length
    $flag = if ($size -le $cap) { 'ok' } else { 'OVER CAP' }
    "{0,-22} -> {1,-18} {2}x{3}  {4,-5} {5,6:N0} KB  {6}" -f $key, "$id.$($grp.Ext)", $usedW, $usedH, $final, ($size / 1KB), $flag
    $grandTotal += $size; $grandCount++
  }
}

""; "=" * 60
"TOTAL: {0:N0} KB across {1} files, {2} groups" -f ($grandTotal / 1KB), $grandCount, $groups.Count
if ($missing.Count) { ""; "MISSING SOURCES:"; $missing | ForEach-Object { "  $_" } }
""; "Next: write nine data/art/comb/<sub>/pack.json manifests (id: `"comb/<sub>`"),"
"add `"comb/<sub>`" for all nine to data/art/registry.json, then add every manifest"
"+ image to PRECACHE_URLS in"
"sw.js and bump CACHE_NAME."
