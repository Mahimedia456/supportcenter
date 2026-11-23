param([string]$RepoPath='E:\Supportcenter', [switch]$SkipBuild)
$ErrorActionPreference='Stop'
if(-not $SkipBuild){
   & (Join-Path $PSScriptRoot 'RUN-BUILD.ps1') -RepoPath $RepoPath
   if($LASTEXITCODE -ne 0){throw 'BUILD_FAILED'}
}
if(-not (Get-Command adb -ErrorAction SilentlyContinue)){
   throw 'ADB_NOT_FOUND: set Android SDK platform-tools on PATH'
}
$connected=(& adb devices) | Where-Object {$_ -match '\sdevice$'}
if(@($connected).Count -ne 1){throw 'ADB_DEVICE_COUNT_NOT_ONE: connect exactly one authorized device'}
$apk=Join-Path $PSScriptRoot 'app\build\outputs\apk\debug\app-debug.apk'
if(-not (Test-Path $apk)){throw 'APK_NOT_FOUND'}
& adb install -r $apk
if($LASTEXITCODE -ne 0){throw 'APK_INSTALL_FAILED'}
& adb shell am start -n com.mahimediasolutions.supportcenter.nativeapp/.MainActivity
if($LASTEXITCODE -ne 0){throw 'APP_LAUNCH_FAILED'}
Write-Host 'B1_NATIVE_APP_LAUNCHED' -ForegroundColor Green
