param([string]$RepoPath='E:\Supportcenter',[string]$Serial='',
      [switch]$BuildOnly,[switch]$InstallOnly)
$ErrorActionPreference='Stop'
if($BuildOnly -and $InstallOnly){throw 'B3_CONFLICTING_BUILD_FLAGS'}
$repo=[System.IO.Path]::GetFullPath($RepoPath)
$native=Join-Path $repo 'native-android'
$sourceApk=Join-Path $native 'app\build\outputs\apk\debug\app-debug.apk'
$dist=Join-Path $native 'dist'
$apk=Join-Path $dist 'SupportCenter-Native-B3-debug.apk'
& (Join-Path $PSScriptRoot 'CHECK-BATCH3.ps1') -RepoPath $repo
if(-not $InstallOnly){
 Write-Host 'B3_BUILD_START: Building Kotlin/Jetpack Compose APK' -ForegroundColor Cyan
 & (Join-Path $native 'RUN-BUILD.ps1') -RepoPath $repo
 if($LASTEXITCODE -ne 0){throw "B3_BUILD_FAILED exit=$LASTEXITCODE"}
 if(-not (Test-Path -LiteralPath $sourceApk -PathType Leaf)){throw 'B3_APK_BUILD_OUTPUT_MISSING'}
 New-Item -ItemType Directory -Path $dist -Force | Out-Null
 Copy-Item -LiteralPath $sourceApk -Destination $apk -Force
 Write-Host "B3_APK_BUILD_PASS: $apk" -ForegroundColor Green
 Write-Host "B3_APK_SHA256: $((Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash)"
}
if($BuildOnly){Write-Host 'B3_BUILD_ONLY_DONE';return}
if(-not (Test-Path -LiteralPath $apk -PathType Leaf)){
 throw 'B3_DIST_APK_MISSING: Run BUILD-AND-ADB-INSTALL.ps1 without -InstallOnly first'
}
$cmd=Get-Command adb -ErrorAction SilentlyContinue
$adbPath=if($cmd){$cmd.Source}else{''}
if(-not $adbPath -and $env:LOCALAPPDATA){
 $candidate=Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
 if(Test-Path -LiteralPath $candidate){$adbPath=$candidate}
}
if(-not $adbPath){throw 'B3_ADB_NOT_FOUND: Install Android SDK Platform Tools'}
& $adbPath start-server | Out-Host
$lines=@(& $adbPath devices -l)
if($LASTEXITCODE -ne 0){throw 'B3_ADB_DEVICE_LIST_FAILED'}
$lines | ForEach-Object { Write-Host $_ }
$ready=@($lines | ForEach-Object {
 if($_ -match '^\s*(\S+)\s+device(?:\s+|$)'){$matches[1]}
} | Select-Object -Unique)
if($ready.Count -eq 0){throw 'B3_NO_AUTHORIZED_DEVICE: Connect phone and accept USB debugging RSA prompt'}
if($Serial){
 if($ready -notcontains $Serial){throw "B3_ADB_SERIAL_NOT_CONNECTED $Serial"}
 $selected=$Serial
}elseif($ready.Count -gt 1){throw "B3_MULTIPLE_ADB_DEVICES: use -Serial. Ready: $($ready -join ', ')"}
else{$selected=$ready[0]}
Write-Host "B3_ADB_SELECTED $selected" -ForegroundColor Cyan
& $adbPath -s $selected install -r -t $apk | Out-Host
if($LASTEXITCODE -ne 0){throw 'B3_ADB_INSTALL_FAILED'}
& $adbPath -s $selected shell am start -n 'com.mahimediasolutions.supportcenter.nativeapp/.MainActivity' | Out-Host
if($LASTEXITCODE -ne 0){throw 'B3_ADB_LAUNCH_FAILED'}
Start-Sleep -Seconds 2
$appProcessId=@(& $adbPath -s $selected shell pidof com.mahimediasolutions.supportcenter.nativeapp 2>$null)
if(($appProcessId -join ' ').Trim() -match '^\d+'){
 Write-Host "B3_INSTALL_LAUNCH_PASS serial=$selected pid=$(($appProcessId -join ' ').Trim())" -ForegroundColor Green
}else{
 Write-Warning 'Install and launch command succeeded, but the app process PID was not verified. Inspect phone/logcat.'
 Write-Host "B3_INSTALL_LAUNCH_NOT_VERIFIED serial=$selected"
}
