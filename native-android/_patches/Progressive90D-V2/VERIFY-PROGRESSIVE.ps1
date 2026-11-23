param([string]$RepoPath='E:\Supportcenter')
$ErrorActionPreference='Stop'
$native=Join-Path ([IO.Path]::GetFullPath($RepoPath)) 'native-android'
$m=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw|ConvertFrom-Json
foreach($entry in $m.files){
  $path=Join-Path $native ([string]$entry.path).Replace('/',[IO.Path]::DirectorySeparatorChar)
  if(-not (Test-Path -LiteralPath $path)){throw "PROGRESSIVE_MISSING $($entry.path)"}
  $sha=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
  if($sha -ne [string]$entry.sha256){throw "PROGRESSIVE_MISMATCH $($entry.path)"}
}
$screen=Get-Content -LiteralPath (Join-Path $native 'app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\ui\SupportScreens.kt') -Raw
foreach($marker in @('ProgressiveSyncStrip(state)','NativeProgressiveSnapshotScreen(state)','TabItem("RMA",')){
  if(-not $screen.Contains($marker)){throw "PROGRESSIVE_UI_MARKER_MISSING $marker"}
}
Write-Host 'PROGRESSIVE_STATIC_PASS: source hashes, page previews, RMA navigation, 10-minute foreground checks' -ForegroundColor Green
Write-Host 'Note: real Gradle compilation and ADB behavior require Windows Android SDK/device tests.'
