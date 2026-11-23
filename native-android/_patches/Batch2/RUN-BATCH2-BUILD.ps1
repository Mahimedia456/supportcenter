param([string]$RepoPath='E:\Supportcenter')
$ErrorActionPreference='Stop'
$project=Join-Path ([System.IO.Path]::GetFullPath($RepoPath)) 'native-android'
if(-not (Test-Path (Join-Path $project 'app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\ui\Batch2Screens.kt'))){throw 'B2_NOT_APPLIED'}
& (Join-Path $project 'RUN-BUILD.ps1') -RepoPath $RepoPath
if($LASTEXITCODE -ne 0){throw "B2_BUILD_FAILED exit=$LASTEXITCODE"}
$apk=Join-Path $project 'app\build\outputs\apk\debug\app-debug.apk'
if(-not (Test-Path $apk)){throw 'B2_APK_MISSING'}
Write-Host "B2_BUILD_PASS: $apk" -ForegroundColor Green
