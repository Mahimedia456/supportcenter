param([string]$RepoPath='E:\Supportcenter',[string]$Serial='',[switch]$BuildOnly)
$ErrorActionPreference='Stop'
$repo=[System.IO.Path]::GetFullPath($RepoPath)
$native=Join-Path $repo 'native-android'
& (Join-Path $PSScriptRoot 'CHECK-REVAMP.ps1') -RepoPath $repo
& (Join-Path $native 'RUN-BUILD.ps1') -RepoPath $repo
if($LASTEXITCODE -ne 0){throw "REVAMP_APK_BUILD_FAILED $LASTEXITCODE"}
$source=Join-Path $native 'app\build\outputs\apk\debug\app-debug.apk'
if(-not (Test-Path -LiteralPath $source)){throw 'REVAMP_APK_MISSING'}
$dist=Join-Path $native 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$apk=Join-Path $dist 'SupportCenter-Native-UI-Revamp-debug.apk'
Copy-Item -LiteralPath $source -Destination $apk -Force
Write-Host "REVAMP_APK_BUILD_PASS $apk" -ForegroundColor Green
if($BuildOnly){return}
$adbCmd=Get-Command adb -ErrorAction SilentlyContinue
if($adbCmd){$adbExe=$adbCmd.Source}else{$adbExe=Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'}
if(-not (Test-Path -LiteralPath $adbExe)){throw 'REVAMP_ADB_NOT_FOUND'}
& $adbExe start-server | Out-Host
$lines=@(& $adbExe devices -l)
$lines | ForEach-Object {Write-Host $_}
if($LASTEXITCODE -ne 0){throw 'REVAMP_ADB_DEVICES_FAIL'}
$ready=@($lines | ForEach-Object {if($_ -match '^\s*(\S+)\s+device(?:\s+|$)'){$matches[1]}} | Select-Object -Unique)
if($ready.Count -eq 0){throw 'REVAMP_NO_AUTHORIZED_ADB_DEVICE'}
if($Serial){if($ready -notcontains $Serial){throw "REVAMP_SERIAL_NOT_FOUND $Serial"};$target=$Serial}
elseif($ready.Count -eq 1){$target=$ready[0]}
else{throw "REVAMP_MULTIPLE_ADB_DEVICES: use -Serial. Devices: $($ready -join ', ')"}
& $adbExe -s $target install -r -t $apk | Out-Host
if($LASTEXITCODE -ne 0){throw 'REVAMP_INSTALL_FAILED'}
& $adbExe -s $target shell am start -n 'com.mahimediasolutions.supportcenter.nativeapp/.MainActivity' | Out-Host
if($LASTEXITCODE -ne 0){throw 'REVAMP_LAUNCH_FAILED'}
Start-Sleep -Seconds 2
$appProcessId=((& $adbExe -s $target shell pidof com.mahimediasolutions.supportcenter.nativeapp 2>$null) -join ' ').Trim()
if($appProcessId -match '^\d+'){
  Write-Host "REVAMP_ADB_INSTALL_LAUNCH_PASS serial=$target" -ForegroundColor Green
}else{Write-Warning 'App launched but process PID not confirmed. Inspect Android logcat if it closes.'}
