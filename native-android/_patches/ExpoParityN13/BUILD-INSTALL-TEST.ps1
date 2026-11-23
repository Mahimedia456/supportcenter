param([string]$RepoPath='E:\Supportcenter')
$ErrorActionPreference='Stop'
$native=Join-Path $RepoPath 'native-android'
& (Join-Path $PSScriptRoot 'VERIFY-EXPO-PARITY.ps1') -RepoPath $RepoPath
& (Join-Path $native 'RUN-BUILD.ps1') -RepoPath $RepoPath
$apk=Join-Path $native 'app\build\outputs\apk\debug\app-debug.apk'
if(-not(Test-Path -LiteralPath $apk)){throw 'PARITY_APK_BUILD_FAILED'}
New-Item -ItemType Directory -Force (Join-Path $native 'dist') |Out-Null
$dest=Join-Path $native 'dist\SupportCenter-Native-Expo-Parity-debug.apk'
Copy-Item -LiteralPath $apk -Destination $dest -Force
Write-Host "PARITY_APK_BUILD_PASS $dest" -ForegroundColor Green
& (Join-Path $native 'RUN-INSTALL.ps1') -RepoPath $RepoPath -SkipBuild
Write-Host 'PARITY_ADB_INSTALL_REQUEST_COMPLETED: manually verify Overview, Tickets, RMA, Devices, Satisfaction.' -ForegroundColor Green
