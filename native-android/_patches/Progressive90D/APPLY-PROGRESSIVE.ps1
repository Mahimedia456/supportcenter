param([string]$RepoPath='E:\Supportcenter',[switch]$DryRun)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$repo=[System.IO.Path]::GetFullPath($RepoPath)
$native=Join-Path $repo 'native-android'
if(-not (Test-Path -LiteralPath (Join-Path $native 'settings.gradle.kts') -PathType Leaf)){
  throw 'PROGRESSIVE_NATIVE_PROJECT_NOT_FOUND'
}
function Sha([string]$p) {
  if(-not (Test-Path -LiteralPath $p -PathType Leaf)){return $null}
  return (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()
}
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw | ConvertFrom-Json
if($manifest.files.Count -ne 5){throw 'PROGRESSIVE_BAD_MANIFEST'}
$pending=@()
foreach($e in $manifest.files){
  $rel=[string]$e.path
  if(-not $rel.StartsWith('app/') -or $rel.Contains('..') -or $rel.Contains(':') -or $rel.StartsWith('/')){
    throw "PROGRESSIVE_UNSAFE_PATH $rel"
  }
  $relative=$rel.Replace('/',[IO.Path]::DirectorySeparatorChar)
  $src=Join-Path (Join-Path $PSScriptRoot 'PATCH_FILES\native-android') $relative
  $dst=Join-Path $native $relative
  $needed=([string]$e.sha256).ToLowerInvariant()
  if((Sha $src) -ne $needed){throw "PROGRESSIVE_PACKAGE_HASH_FAILED $rel"}
  $current=Sha $dst
  if($current -eq $needed){Write-Host "PROGRESSIVE_ALREADY_APPLIED $rel";continue}
  if([bool]$e.new){
    if($null -ne $current){throw "PROGRESSIVE_NEW_FILE_EXISTS $rel (sha=$current)"}
  } else {
    $allowed=@(); foreach($value in $e.allowedSha256){$allowed+=([string]$value).ToLowerInvariant()}
    if($null -eq $current -or $allowed -notcontains $current){
      throw "PROGRESSIVE_LOCAL_VERSION_MISMATCH $rel sha=$current. Existing changes preserved."
    }
  }
  $pending+=@{src=$src;dst=$dst;rel=$rel;old=$current;new=$needed}
  Write-Host "PROGRESSIVE_READY $rel"
}
# One-line/tab and composable insertion only: do not overwrite existing professional UI screens.
$screenPath=Join-Path $native 'app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\ui\SupportScreens.kt'
if(-not (Test-Path -LiteralPath $screenPath -PathType Leaf)){throw 'PROGRESSIVE_SUPPORT_SCREENS_MISSING'}
$screen=[IO.File]::ReadAllText($screenPath)
$screenOld=Sha $screenPath
$needle1='            if (state.error != null) ErrorBanner(state.error, state.cached)'
$needle2='                    state.selectedTicketId != null -> NativeTicketDetailScreen('
$added1='            ProgressiveSyncStrip(state)'
$added2='                    state.snapshot == null && state.refreshing -> NativeProgressiveSnapshotScreen(state)'
if($screen.Contains($added1) -ne $screen.Contains($added2)){throw 'PROGRESSIVE_UI_PARTIAL_CHANGE_FOUND'}
$oldRma='TabItem("Insights", Icons.Outlined.Assessment)'
$hasOldRma=$screen.Contains($oldRma)
$hasNewRma=$screen.Contains('TabItem("RMA", Icons.Outlined.Assessment)') -or $screen.Contains('TabItem("RMA", Icons.Outlined.Repeat)')
if(-not $hasOldRma -and -not $hasNewRma){throw 'PROGRESSIVE_RMA_TAB_MAPPING_UNKNOWN'}
if(-not $screen.Contains($added1)){
  if([regex]::Matches($screen,[regex]::Escape($needle1)).Count -ne 1){throw 'PROGRESSIVE_BANNER_ANCHOR_MISMATCH'}
  if([regex]::Matches($screen,[regex]::Escape($needle2)).Count -ne 1){throw 'PROGRESSIVE_SCREEN_ROUTE_ANCHOR_MISMATCH'}
  $nl=if($screen.Contains("`r`n")){"`r`n"}else{"`n"}
  $screen=$screen.Replace($needle1,$needle1+$nl+$added1)
  $screen=$screen.Replace($needle2,$added2+$nl+$needle2)
}
if($hasOldRma){
  if([regex]::Matches($screen,[regex]::Escape($oldRma)).Count -ne 1){throw 'PROGRESSIVE_RMA_MAPPING_AMBIGUOUS'}
  $screen=$screen.Replace($oldRma,'TabItem("RMA", Icons.Outlined.Assessment)')
}
$screenChanged=($screen -ne [IO.File]::ReadAllText($screenPath))
if($screenChanged){Write-Host 'PROGRESSIVE_READY SupportScreens.kt (two UI insertions, preserve all existing styling and RMA tab)'}
if($DryRun){Write-Host 'PROGRESSIVE_DRY_RUN_PASS: source files untouched' -ForegroundColor Green;return}
if($pending.Count -eq 0 -and -not $screenChanged){Write-Host 'PROGRESSIVE_ALREADY_APPLIED' -ForegroundColor Green;return}
$backup=Join-Path (Split-Path $repo -Parent) ('SupportCenter_Progressive90D_Backup_'+(Get-Date -Format 'yyyyMMdd_HHmmss'))
$changed=New-Object System.Collections.ArrayList
try {
  foreach($i in $pending){
    $bak=Join-Path $backup ($i.rel.Replace('/',[IO.Path]::DirectorySeparatorChar))
    if($null -ne $i.old){
      New-Item -ItemType Directory -Force (Split-Path $bak -Parent)|Out-Null
      Copy-Item -LiteralPath $i.dst -Destination $bak
    }
    New-Item -ItemType Directory -Force (Split-Path $i.dst -Parent)|Out-Null
    [void]$changed.Add(@{dst=$i.dst;bak=$bak;old=$i.old})
    Copy-Item -LiteralPath $i.src -Destination $i.dst -Force
    if((Sha $i.dst) -ne $i.new){throw "PROGRESSIVE_WRITE_VERIFY_FAILED $($i.rel)"}
  }
  if($screenChanged){
    $bak=Join-Path $backup 'app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\ui\SupportScreens.kt'
    New-Item -ItemType Directory -Force (Split-Path $bak -Parent)|Out-Null
    Copy-Item -LiteralPath $screenPath -Destination $bak
    [void]$changed.Add(@{dst=$screenPath;bak=$bak;old=$screenOld})
    # Preserve original UTF-8, do not change unrelated sections.
    [IO.File]::WriteAllText($screenPath,$screen,[Text.UTF8Encoding]::new($false))
  }
} catch {
  foreach($x in $changed){
    if($null -ne $x.old){Copy-Item -LiteralPath $x.bak -Destination $x.dst -Force}
    else{Remove-Item -LiteralPath $x.dst -Force -ErrorAction SilentlyContinue}
  }
  throw
}
Write-Host "PROGRESSIVE_PATCH_APPLIED: $($pending.Count) source files + UI guard" -ForegroundColor Green
Write-Host "PROGRESSIVE_BACKUP: $backup"
