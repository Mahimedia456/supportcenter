param([string]$RepoPath='E:\Supportcenter',[string]$Serial='',[switch]$BuildOnly)
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath($RepoPath)
$native=Join-Path $repo 'native-android'
& (Join-Path $native 'RUN-BUILD.ps1') -RepoPath $repo
if($LASTEXITCODE -ne 0){throw 'TABBAR_NATIVE_BUILD_FAILED'}
$apkSource=Join-Path $native 'app\build\outputs\apk\debug\app-debug.apk'
if(-not (Test-Path -LiteralPath $apkSource)){throw 'TABBAR_APK_MISSING'}
$dist=Join-Path $native 'dist';New-Item -ItemType Directory -Force $dist|Out-Null
$apk=Join-Path $dist 'SupportCenter-Native-Tabbar-Recovery-debug.apk'
Copy-Item -LiteralPath $apkSource -Destination $apk -Force
Write-Host "TABBAR_APK_BUILD_PASS $apk" -ForegroundColor Green
if($BuildOnly){return}
$adb=Get-Command adb -ErrorAction SilentlyContinue
$exe=if($adb){$adb.Source}else{Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'}
if(-not (Test-Path -LiteralPath $exe)){throw 'ADB_NOT_FOUND'}
$devices=@(& $exe devices -l)
$ready=@($devices|ForEach-Object {if($_ -match '^\s*(\S+)\s+device(?:\s+|$)'){$matches[1]}}|Select-Object -Unique)
if(-not $ready){throw 'NO_AUTHORIZED_ADB_DEVICE'}
if($Serial){if($ready -notcontains $Serial){throw 'REQUESTED_ADB_SERIAL_NOT_FOUND'};$device=$Serial}
elseif($ready.Count -eq 1){$device=$ready[0]}
else{throw ('MULTIPLE_ADB_DEVICES: choose -Serial from '+($ready -join ', '))}
& $exe -s $device install -r -t $apk | Out-Host
if($LASTEXITCODE -ne 0){throw 'APK_INSTALL_FAILED'}
& $exe -s $device shell am start -n 'com.mahimediasolutions.supportcenter.nativeapp/.MainActivity' | Out-Host
if($LASTEXITCODE -ne 0){throw 'APP_LAUNCH_FAILED'}
Start-Sleep -Seconds 2
$appProcessId=((& $exe -s $device shell pidof com.mahimediasolutions.supportcenter.nativeapp 2>$null)-join ' ').Trim()
if($appProcessId -match '^\d+'){
 Write-Host "TABBAR_ADB_INSTALL_LAUNCH_PASS serial=$device" -ForegroundColor Green
}else{Write-Warning 'Launch attempted but PID not confirmed. Check logcat.'}
