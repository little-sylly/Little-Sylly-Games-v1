# ===========================================================================
# make-skin-pack.ps1 - turn a folder of artwork into a finished Secret Mode skin.
#
# NOTE FOR EDITORS: this file is deliberately ASCII-ONLY. Windows PowerShell 5.1
# reads a .ps1 as ANSI unless it has a UTF-8 BOM, so an em-dash or a curly quote
# saved without one becomes mojibake and the script fails to PARSE. Keep it ASCII.
#
# WHAT THIS IS FOR
#   You have drawn or generated art for one game. This resizes and compresses
#   every image to that game's correct aspect ratio and size budget, writes the
#   pack manifest for you, and (with -Register) adds the pack to the live
#   registry. After it runs the skin is playable: no code to edit, no sw.js
#   entry, no service-worker version bump.
#
#   Full authoring guide, including what every id means:
#     docs/art-authoring-guide.md
#
# THE ONE RULE ABOUT FILENAMES
#   Name each source file after the id it is for: 0.png, 7.png, back.png,
#   elephant.png, treat-brownies.png. Run with -List to print the exact id list
#   for your game. Unknown filenames are reported and skipped, so a typo can
#   never silently ship as a missing card.
#
# USAGE
#   List the ids a game needs:
#     & "tools\make-skin-pack.ps1" -Game frt -List
#
#   Build a skin:
#     & "tools\make-skin-pack.ps1" -Game frt -Source "C:\art\my-fruit" -Id neon-fruit-2 -Label "NEON FRUIT II" -Register
#
#   Keep transparency (dice, cut-out tokens):  add  -Png
#
# WHY POWERSHELL AND WHY JPEG BY DEFAULT
#   There is no cwebp / ImageMagick / sharp on the build machine and the project
#   forbids npm (CLAUDE.md, Anti-Patterns), so .NET System.Drawing is the tool
#   available. It has no WebP encoder, hence JPEG - which is right for full-bleed
#   card art with no transparency. Use -Png when you need alpha.
#
# SKIN vs CORE ART - why this script's budget is generous
#   Skin packs are RUNTIME-cached (cache-first images, added by dropping a
#   folder), so they are not part of the app install and can afford ~100 KB per
#   image. A game's DEFAULT art is a different thing: it is precached, counts
#   against every install, and has a much tighter ceiling. For that, use
#   tools/convert-core-art.ps1.
# ===========================================================================

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('frt', 'shp', 'flw', 'pko', 'cjar', 'cards', 'dyb')]
  [string]$Game,

  [string]$Source,
  [string]$Id,
  [string]$Label,
  [int]$Width  = 800,
  [int]$CapKB  = 100,
  [switch]$Png,
  [switch]$Register,
  [switch]$List
)

Add-Type -AssemblyName System.Drawing

$repo = Split-Path -Parent $PSScriptRoot

# -- Per-game spec ----------------------------------------------------------
# Aspect is the card's REAL rendered width/height (from css/styles.css), so art
# generated at these proportions is never cropped by background-size:cover.
# Ids are the game's own stable, packet-safe ids. The manifest maps id to
# filename, which is why your art may be named anything as long as the SOURCE
# file carries the id.
$specs = @{
  'frt'   = @{ Games = @('frt');  Aspect = 72 / 96;     Render = '72x96 px';
               Ids = @('0','1','2','3','4','5','6','7');
               Note = 'Fruit ids are fixed: 0 Banana, 1 Lemon, 2 Peach, 3 Grape, 4 Watermelon, 5 Pear, 6 Strawberry, 7 Apple.' }
  'shp'   = @{ Games = @('shp');  Aspect = 64 / 88;     Render = '64x88 px';
               Ids = @('0','1','2','3','4','5','6','7','8','9','10','11','12','14','15','16');
               Note = 'There is deliberately NO id 13 (Fogged Dream). Its value is hidden from its own owner, so it can never be skinned.' }
  'flw'   = @{ Games = @('flw');  Aspect = 72 / 104;    Render = '72x104 px';
               Ids = @('0','1','2','3','4','5','6','7','8','9');
               Note = 'Gem id IS the carat value: 0 Obsidian through 9 Diamond.' }
  'pko'   = @{ Games = @('pko');  Aspect = 68 / 92;     Render = '68x92 px';
               Ids = @('mouse','mongoose','leopard','eagle','bear','elephant','bee','fish','octopus','seal','polar_bear','orca','stingray','human','mimic');
               Extras = @('chain');
               Note = '"human" is the Poacher and "mimic" is Invasive Mimicry. The "chain" extra is the food-chain reference diagram - wide, not card-shaped, and its own aspect is preserved.' }
  'cjar'  = @{ Games = @('cjar'); Aspect = 240 / 329.6; Render = '240x330 px (hero)';
               Ids = @('cookie-handful','cookie-batch','cookie-mountain','family-mum','family-dad','family-big','family-grandma','family-pet','treat-shortbread','treat-redvelvet','treat-macadamia','treat-macarons','treat-brownies');
               Note = 'Three cookie TIERS cover all 15 cookie values - the number is drawn as a text overlay, so do not put a number in the art. CJAR renders the largest card in the suite, so its art is seen up close.' }
  'cards' = @{ Games = @('pass'); Aspect = 56 / 80;     Render = '56x80 px';
               Ids = @();
               Note = 'Rank plus suit letter, e.g. AH, 10S, KD. Ranks 3 4 5 6 7 8 9 10 J Q K A 2; suits H D C S. Plus "Joker". 54 files is a big skin - consider a partial pack first.' }
  'dyb'   = @{ Games = @('dyb');  Aspect = 1.0;         Render = '52x52 px (square)';
               Ids = @('1','2','3','4','5','6');
               Note = 'Dice are SQUARE. If your die art is not a full square tile you need transparency - run with -Png. The five Tempest die types use an optional "specials" block added to pack.json by hand; see the authoring guide.' }
}

if ($Game -eq 'cards') {
  $ranks = @('3','4','5','6','7','8','9','10','J','Q','K','A','2')
  $suits = @('H','D','C','S')
  $deck = @()
  foreach ($r in $ranks) { foreach ($s in $suits) { $deck += "$r$s" } }
  $deck += 'Joker'
  $specs['cards'].Ids = $deck
}

$spec    = $specs[$Game]
$hasExtras = $spec.ContainsKey('Extras')
$validId = @($spec.Ids)
if ($hasExtras) { $validId += @($spec.Extras) }
$validId += 'back'

# -- -List: print the inventory and exit ------------------------------------
if ($List) {
  $artH = [int][Math]::Round($Width / $spec.Aspect)
  ""
  "{0} skin - art inventory" -f $Game.ToUpper()
  "-" * 62
  "Card renders at : {0}   (aspect {1:N3} w/h)" -f $spec.Render, $spec.Aspect
  "Recommended art : {0} x {1} px" -f $Width, $artH
  "Faces to supply : {0}" -f $spec.Ids.Count
  ""
  "Name each source file after its id:"
  foreach ($i in $spec.Ids) { "  $i.png" }
  "  back.png     (the face-down image)"
  if ($hasExtras) { foreach ($e in $spec.Extras) { "  $e.png     (extra - not a card)" } }
  ""
  "NOTE: " + $spec.Note
  ""
  "Partial packs are fine. Any id you leave out falls back to the default art."
  ""
  return
}

if (-not $Source) { throw "-Source is required (the folder holding your art). Use -List to see the ids first." }
if (-not $Id)     { throw "-Id is required (the pack's folder name and registry entry, e.g. neon-fruit-2)." }
if (-not (Test-Path $Source)) { throw "Source folder not found: $Source" }
if ($Id -notmatch '^[a-z0-9][a-z0-9-]*$') { throw "-Id must be lowercase letters, digits and hyphens: '$Id'" }
if (-not $Label) { $Label = $Id.ToUpper().Replace('-', ' ') }

$packDir = Join-Path $repo "data\packs\$Id"
$imgDir  = Join-Path $packDir 'img'
if (-not (Test-Path $imgDir)) { New-Item -ItemType Directory -Force $imgDir | Out-Null }

$targetH = [int][Math]::Round($Width / $spec.Aspect)
$cap     = $CapKB * 1KB
$ext     = 'jpg'
if ($Png) { $ext = 'png' }

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
function Save-Jpeg($bmp, $path, $quality) {
  $ps = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $ps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$quality)
  $bmp.Save($path, $codec, $ps)
  $ps.Dispose()
}

""
"{0} skin '{1}'  ->  data/packs/{1}/" -f $Game.ToUpper(), $Id
"art {0} x {1} px, cap {2} KB per file, format {3}" -f $Width, $targetH, $CapKB, $ext.ToUpper()
"-" * 74

$faces    = @{}
$extras   = @{}
$backFile = $null
$unknown  = @()
$done     = 0

foreach ($f in Get-ChildItem -Path $Source -File) {
  if ($f.Extension -notmatch '^\.(png|jpg|jpeg|bmp|gif)$') { continue }
  $key = $f.BaseName
  if ($validId -notcontains $key) { $unknown += $f.Name; continue }

  $img = [System.Drawing.Image]::FromFile($f.FullName)
  # An extra (a reference diagram) is not card-shaped, so keep its own aspect.
  $isExtra = $hasExtras -and ($spec.Extras -contains $key)
  if ($isExtra) { $h = [int][Math]::Round($Width * $img.Height / $img.Width) } else { $h = $targetH }

  $bmp = New-Object System.Drawing.Bitmap($Width, $h)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  # Drawing to the exact target box matches what background-size:cover does on
  # the device, so what you see here is what the card will show.
  $g.DrawImage($img, 0, 0, $Width, $h)
  $g.Dispose(); $img.Dispose()

  $outPath = Join-Path $imgDir "$key.$ext"
  $q = 0
  if ($Png) {
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } else {
    # Walk quality down until it fits. Busy art lands lower and still reads fine.
    foreach ($try in 92, 88, 84, 80, 76, 72, 68, 64, 58) {
      Save-Jpeg $bmp $outPath $try
      $q = $try
      if ((Get-Item $outPath).Length -le $cap) { break }
    }
  }
  $bmp.Dispose()

  $size = (Get-Item $outPath).Length
  $flag = 'ok'
  if ($size -gt $cap) { $flag = 'OVER CAP - lower -Width or re-crop' }

  if     ($key -eq 'back') { $backFile = "$key.$ext" }
  elseif ($isExtra)        { $extras[$key] = "$key.$ext" }
  else                     { $faces[$key]  = "$key.$ext" }
  $done++

  $qtxt = ''
  if (-not $Png) { $qtxt = "q$q" }
  "{0,-20} -> {1,-22} {2}x{3}  {4,-5} {5,6:N0} KB  {6}" -f $f.Name, "$key.$ext", $Width, $h, $qtxt, ($size / 1KB), $flag
}

if ($done -eq 0) { throw "No usable images found in $Source. Filenames must match the ids - run with -List to see them." }

# -- Manifest ---------------------------------------------------------------
# Same shape as a word pack's manifest; the interesting field is `assets`
# instead of `words`.
$assets = [ordered]@{ kind = $Game; basePath = 'img/' }
$assets['faces'] = [ordered]@{}
foreach ($k in ($faces.Keys | Sort-Object)) { $assets['faces'][$k] = $faces[$k] }
if ($backFile)     { $assets['back'] = $backFile }
if ($extras.Count) {
  $assets['extras'] = [ordered]@{}
  foreach ($k in ($extras.Keys | Sort-Object)) { $assets['extras'][$k] = $extras[$k] }
}

$manifest = [ordered]@{
  id     = $Id
  label  = $Label
  locked = $false
  games  = @($spec.Games)
  assets = $assets
}
$manifestPath = Join-Path $packDir 'pack.json'
# BOM-free UTF-8. `Set-Content -Encoding utf8` on Windows PowerShell 5.1 writes a
# BOM, and Node's JSON.parse rejects one outright (the browser's fetch().json()
# happens to strip it, so this fails only in the repo's own tooling - the worst
# place for it to hide). Write through .NET with a BOM-less encoder instead.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 6), $utf8NoBom)

"-" * 74
"{0} image(s) written." -f $done
"manifest: data/packs/$Id/pack.json"

$missing = @($spec.Ids | Where-Object { -not $faces.ContainsKey($_) })
if ($missing.Count) {
  ""
  "PARTIAL PACK - {0} id(s) not supplied. These fall back to the default art:" -f $missing.Count
  "  " + ($missing -join ', ')
}
if (-not $backFile) {
  ""
  "No back.png supplied - the face-down card keeps its default look."
}
if ($unknown.Count) {
  ""
  "SKIPPED - filename does not match any id for this game:"
  foreach ($u in $unknown) { "  $u" }
  "Run with -List to see the valid ids."
}

# -- Registry ---------------------------------------------------------------
$regPath = Join-Path $repo 'data\packs\registry.json'
# The [string[]] cast is load-bearing. Windows PowerShell 5.1's ConvertFrom-Json
# hands back a JSON array as ONE object, so a plain `$reg += $Id` appends the id
# ALONGSIDE the original array rather than to it, and ConvertTo-Json then writes
# [{"value":[...],"Count":9},"new-id"] straight into the registry. Casting forces
# a real flat string array first.
$reg = [string[]](Get-Content $regPath -Raw | ConvertFrom-Json)
if ($Register) {
  if ($reg -contains $Id) {
    ""
    "Already in data/packs/registry.json - nothing to add."
  } else {
    $reg += $Id
    [System.IO.File]::WriteAllText($regPath, ($reg | ConvertTo-Json -Compress), $utf8NoBom)
    ""
    "Registered: added '$Id' to data/packs/registry.json"
  }
  ""
  "DONE. Open the Konami terminal, then GAME SKINS -> {0} -> {1}." -f $Game.ToUpper(), $Label
  "While developing online, hard-refresh to pick up the new manifest (pack config is network-first)."
} else {
  ""
  "NEXT: add `"$Id`" to data/packs/registry.json, then open the Konami terminal."
  "      (or re-run this command with -Register to do it automatically)"
}
""
