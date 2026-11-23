param([string]$RepoPath='E:\Supportcenter',[switch]$DryRun)
$ErrorActionPreference='Stop'
$repo=[System.IO.Path]::GetFullPath($RepoPath)
$native=Join-Path $repo 'native-android'
if(-not (Test-Path -LiteralPath (Join-Path $native 'settings.gradle.kts'))){throw 'UI_NATIVE_PROJECT_MISSING'}
if(-not (Test-Path -LiteralPath (Join-Path $native 'app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\ui\Batch3Screens.kt'))){throw 'UI_BATCH3_REQUIRED'}
$items=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw | ConvertFrom-Json
function Hash([string]$file){if(-not (Test-Path -LiteralPath $file -PathType Leaf)){return $null};return (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()}
$todo=@()
foreach($item in $items){
 $rel=[string]$item.path
 if($rel.Contains('..') -or $rel.Contains(':') -or $rel.StartsWith('/')){throw 'UI_UNSAFE_PATH'}
 $r=$rel.Replace('/','\')
 $src=Join-Path (Join-Path $PSScriptRoot 'PATCH_FILES') $r
 $dst=Join-Path $native $r
 $new=([string]$item.patched_sha256).ToLowerInvariant()
 if((Hash $src) -ne $new){throw "UI_PACKAGE_HASH_MISMATCH $rel"}
 $existing=Hash $dst
 if($existing -eq $new){Write-Host "UI_ALREADY_PATCHED $rel";continue}
 $allowed=@($item.allowed_base_sha256)
 if($null -ne $existing -and ($allowed -notcontains $existing)){
   throw "UI_BASE_VERSION_MISMATCH $rel. Preserve local changes; do not force overwrite."
 }
 if($null -eq $existing -and $allowed.Count -ne 0){throw "UI_EXPECTED_FILE_MISSING $rel"}
 if($null -ne $existing -and $allowed.Count -eq 0){throw "UI_NEW_FILE_CONFLICT $rel"}
 $todo+=@([pscustomobject]@{Src=$src;Dst=$dst;Rel=$rel;Before=$existing;Expected=$new})
 Write-Host "UI_READY $rel"
}
if($DryRun){Write-Host "UI_DRY_RUN_PASS files=$($todo.Count)" -ForegroundColor Green;return}
if($todo.Count -eq 0){Write-Host 'UI_ALREADY_APPLIED';return}
$backup=Join-Path (Split-Path -Parent $repo) ("SupportCenter_Native_UI_Backup_"+(Get-Date -Format 'yyyyMMdd_HHmmss'))
$changed=@()
try{
 foreach($item in $todo){
  $bak=Join-Path $backup ($item.Rel.Replace('/','\'))
  if($null -ne $item.Before){New-Item -ItemType Directory -Path (Split-Path -Parent $bak) -Force | Out-Null;Copy-Item -LiteralPath $item.Dst -Destination $bak -Force}
  New-Item -ItemType Directory -Path (Split-Path -Parent $item.Dst) -Force | Out-Null
  $changed+=@([pscustomobject]@{Source=$item;Backup=$bak})
  Copy-Item -LiteralPath $item.Src -Destination $item.Dst -Force
  if((Hash $item.Dst) -ne $item.Expected){throw "UI_WRITE_HASH_MISMATCH $($item.Rel)"}
  Write-Host "UI_PATCHED $($item.Rel)"
 }
}catch{
 foreach($c in $changed){
  if($null -ne $c.Source.Before){Copy-Item -LiteralPath $c.Backup -Destination $c.Source.Dst -Force}
  else{Remove-Item -LiteralPath $c.Source.Dst -Force -ErrorAction SilentlyContinue}
 }
 throw
}
Write-Host "UI_PATCH_APPLIED files=$($todo.Count)" -ForegroundColor Green
Write-Host "UI_BACKUP: $backup"
