param([string]$RepoPath='E:\Supportcenter')
$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
& (Join-Path $PSScriptRoot 'CHECK-PROJECT.ps1') -RepoPath $RepoPath
# Any failed preflight throws and stops execution.
if(-not (Get-Command java -ErrorAction SilentlyContinue)){
    throw 'JAVA_NOT_FOUND: install Android Studio JDK 17+ and set JAVA_HOME'
}
$gradle=(& (Join-Path $PSScriptRoot 'GET-GRADLE.ps1') | Select-Object -Last 1).Trim()
if(-not (Test-Path $gradle)){throw 'GRADLE_NOT_FOUND'}
& $gradle --no-daemon :app:assembleDebug
if($LASTEXITCODE -ne 0){throw "NATIVE_ANDROID_BUILD_FAILED: $LASTEXITCODE"}
$apk=Join-Path $PSScriptRoot 'app\build\outputs\apk\debug\app-debug.apk'
if(-not (Test-Path $apk)){throw 'APK_NOT_CREATED'}
Write-Host "B1_BUILD_PASS $apk" -ForegroundColor Green
