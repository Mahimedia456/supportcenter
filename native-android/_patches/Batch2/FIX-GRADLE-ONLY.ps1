param([string]$RepoPath='E:\Supportcenter',[switch]$DryRun)
$ErrorActionPreference='Stop'
$project=Join-Path ([System.IO.Path]::GetFullPath($RepoPath)) 'native-android'
$rel='GET-GRADLE.ps1'
$dest=Join-Path $project $rel
$source=Join-Path $PSScriptRoot 'PATCH_FILES\GET-GRADLE.ps1'
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'PATCH_MANIFEST.json') -Raw | ConvertFrom-Json
$entry=$manifest|Where-Object {$_.path -eq $rel}
if(-not $entry){throw 'B2_GRADLE_MANIFEST_MISSING'}
if(-not (Test-Path $dest)){throw 'GET_GRADLE_SOURCE_MISSING'}
$hash=(Get-FileHash $dest -Algorithm SHA256).Hash.ToLowerInvariant()
$newHash=([string]$entry.patched_sha256).ToLowerInvariant()
$baseHash=([string]$entry.base_sha256).ToLowerInvariant()
if($hash -eq $newHash){Write-Host 'GRADLE_FIX_ALREADY_APPLIED';return}
if($hash -ne $baseHash){throw 'GRADLE_FIX_VERSION_MISMATCH: local changes detected; no overwrite'}
if((Get-FileHash $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $newHash){throw 'GRADLE_FIX_PACKAGE_HASH_FAILED'}
if($DryRun){Write-Host 'GRADLE_FIX_DRY_RUN_PASS';return}
$backup=Join-Path (Split-Path -Parent ([System.IO.Path]::GetFullPath($RepoPath))) ("GET-GRADLE_B1_Backup_"+(Get-Date -Format 'yyyyMMdd_HHmmss')+'.ps1')
Copy-Item $dest $backup -Force
Copy-Item $source $dest -Force
if((Get-FileHash $dest -Algorithm SHA256).Hash.ToLowerInvariant() -ne $newHash){Copy-Item $backup $dest -Force;throw 'GRADLE_FIX_WRITE_FAILED'}
Write-Host "GRADLE_FIX_APPLIED backup=$backup" -ForegroundColor Green
