param([string]$RepoPath='E:\Supportcenter',[string]$Serial='',[switch]$BuildOnly)
$ErrorActionPreference='Stop'
$repo=[System.IO.Path]::GetFullPath($RepoPath)
$native=Join-Path $repo 'native-android'
& (Join-Path $PSScriptRoot 'CHECK-EXPO-UI.ps1') -RepoPath $repo
& (Join-Path $native 'RUN-BUILD.ps1') -RepoPath $repo
if($LASTEXITCODE -ne 0){throw "UI_APK_BUILD_FAILED $LASTEXITCODE"}
$src=Join-Path $native 'app\build\outputs\apk\debug\app-debug.apk'
if(-not (Test-Path -LiteralPath $src)){throw 'UI_APK_OUTPUT_MISSING'}
$dstDir=Join-Path $native 'dist';New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
$apk=Join-Path $dstDir 'SupportCenter-Native-ExpoUI-debug.apk'
Copy-Item -LiteralPath $src -Destination $apk -Force
Write-Host "UI_APK_BUILD_PASS: $apk" -ForegroundColor Green
if($BuildOnly){return}
$adb=Get-Command adb -ErrorAction SilentlyContinue
if($adb){$exe=$adb.Source}else{$exe=Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'}
if(-not (Test-Path -LiteralPath $exe)){throw 'UI_ADB_NOT_INSTALLED'}
& $exe start-server | Out-Host
$devices=@(& $exe devices -l)
if($LASTEXITCODE -ne 0){throw 'UI_ADB_ENUMERATION_FAIL'}
$devices | ForEach-Object {Write-Host $_}
$ready=@($devices | ForEach-Object {if($_ -match '^\s*(\S+)\s+device(?:\s+|$)'){$matches[1]}} | Select-Object -Unique)
if($ready.Count -eq 0){throw 'UI_NO_AUTHORIZED_DEVICE'}
if($Serial){if($ready -notcontains $Serial){throw "UI_DEVICE_NOT_FOUND $Serial"};$selected=$Serial}
elseif($ready.Count -eq 1){$selected=$ready[0]}
else{throw "UI_MULTIPLE_DEVICES: pass -Serial. Ready: $($ready -join ', ')"}
& $exe -s $selected install -r -t $apk | Out-Host
if($LASTEXITCODE -ne 0){throw 'UI_ADB_INSTALL_FAILED'}
& $exe -s $selected shell am start -n 'com.mahimediasolutions.supportcenter.nativeapp/.MainActivity' | Out-Host
if($LASTEXITCODE -ne 0){throw 'UI_ADB_LAUNCH_FAILED'}
Start-Sleep -Seconds 2
$appProcessId=((& $exe -s $selected shell pidof com.mahimediasolutions.supportcenter.nativeapp 2>$null) -join ' ').Trim()
if($appProcessId -match '^\d+'){
 Write-Host "UI_ADB_INSTALL_LAUNCH_PASS serial=$selected process=$appProcessId" -ForegroundColor Green
}else{Write-Warning 'ADB launch returned, but process PID not verified. Check logcat.'}
