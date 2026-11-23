param(
  [string]$RepoPath = 'E:\Supportcenter',
  [string]$Serial = ''
)
$ErrorActionPreference='Stop'
$native=Join-Path ([IO.Path]::GetFullPath($RepoPath)) 'native-android'
& (Join-Path $PSScriptRoot 'VERIFY-OOM-FIX.ps1') -RepoPath $RepoPath
Write-Host 'Compiling updated streaming client with Gradle...'
& (Join-Path $native 'RUN-BUILD.ps1') -RepoPath $RepoPath
if(-not (Test-Path -LiteralPath (Join-Path $native 'app\build\outputs\apk\debug\app-debug.apk'))){
  throw 'OOM_APK_BUILD_OUTPUT_MISSING'
}
Write-Host 'OOM_APK_BUILD_PRESENT' -ForegroundColor Green
$adb=Get-Command adb -ErrorAction Stop
& $adb.Source devices -l
if($LASTEXITCODE -ne 0){throw 'ADB_DEVICE_LIST_FAILED'}
if($Serial){
  & $adb.Source -s $Serial get-state
  if($LASTEXITCODE -ne 0){throw 'ADB_SELECTED_DEVICE_UNAVAILABLE'}
  & $adb.Source -s $Serial install -r (Join-Path $native 'app\build\outputs\apk\debug\app-debug.apk')
  if($LASTEXITCODE -ne 0){throw 'OOM_APK_INSTALL_FAILED'}
  & $adb.Source -s $Serial shell monkey -p com.mahimediasolutions.supportcenter.nativeapp 1
  if($LASTEXITCODE -ne 0){throw 'OOM_APK_LAUNCH_FAILED'}
} else {
  $lines=@(& $adb.Source devices)
  $online=@($lines | Where-Object {$_ -match '^\S+\s+device\s*$'})
  if($online.Count -ne 1){throw "ADB_SELECT_EXACTLY_ONE_DEVICE count=$($online.Count); use -Serial"}
  $device=($online[0] -split '\s+')[0]
  & $adb.Source -s $device install -r (Join-Path $native 'app\build\outputs\apk\debug\app-debug.apk')
  if($LASTEXITCODE -ne 0){throw 'OOM_APK_INSTALL_FAILED'}
  & $adb.Source -s $device shell monkey -p com.mahimediasolutions.supportcenter.nativeapp 1
  if($LASTEXITCODE -ne 0){throw 'OOM_APK_LAUNCH_FAILED'}
}
Write-Host 'OOM_APK_INSTALLED_LAUNCHED: runtime memory test still required' -ForegroundColor Green
