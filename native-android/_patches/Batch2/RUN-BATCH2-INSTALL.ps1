param([string]$RepoPath='E:\Supportcenter')
$ErrorActionPreference='Stop'
$project=Join-Path ([System.IO.Path]::GetFullPath($RepoPath)) 'native-android'
& (Join-Path $project 'RUN-INSTALL.ps1') -RepoPath $RepoPath -SkipBuild
if($LASTEXITCODE -ne 0){throw "B2_INSTALL_FAILED exit=$LASTEXITCODE"}
Write-Host 'B2_INSTALL_LAUNCH_ATTEMPTED; verify device UI manually' -ForegroundColor Green
