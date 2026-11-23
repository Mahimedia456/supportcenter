param([string]$RepoPath='E:\Supportcenter',[switch]$DryRun)
$ErrorActionPreference='Stop'
$native = Join-Path ([System.IO.Path]::GetFullPath($RepoPath)) 'native-android'
if(-not (Test-Path -LiteralPath (Join-Path $native 'settings.gradle.kts'))){throw 'REVAMP_NATIVE_PROJECT_NOT_FOUND'}
$manifest = @(Get-Content -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw | ConvertFrom-Json)
function Get-Sha([string]$path){if(-not (Test-Path -LiteralPath $path -PathType Leaf)){return $null};return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()}
$pending=@()
foreach($entry in $manifest){
  $relative = [string]$entry.path
  if($relative.StartsWith('/') -or $relative.Contains('..') -or $relative.Contains(':')){throw "UNSAFE_PATCH_PATH $relative"}
  $path = $relative.Replace('/','\')
  $src = Join-Path (Join-Path $PSScriptRoot 'PATCH_FILES') $path
  $dst = Join-Path $native $path
  $required=([string]$entry.patched_sha256).ToLowerInvariant()
  if((Get-Sha $src) -ne $required){throw "REVAMP_PACKAGE_HASH_FAILED: $relative"}
  $current = Get-Sha $dst
  if($current -eq $required){Write-Host "REVAMP_ALREADY_APPLIED $relative"; continue}
  $allowed=@($entry.allowed_base_sha256) | Where-Object {$_ -is [string] -and $_.Length -gt 0}
  if($null -eq $current){
    if($allowed.Count -gt 0 -and -not [bool]$entry.allow_missing){throw "REVAMP_MISSING_EXISTING_FILE $relative"}
  }elseif($allowed -notcontains $current){
    throw "REVAMP_LOCAL_VERSION_MISMATCH $relative (SHA=$current). Do not force overwrite; send this output."
  }
  $pending += [pscustomobject]@{Source=$src; Target=$dst; Relative=$relative; OldHash=$current; NewHash=$required}
  Write-Host "REVAMP_READY $relative"
}
if($DryRun){Write-Host "REVAMP_DRY_RUN_PASS: pending=$($pending.Count), files unchanged" -ForegroundColor Green;return}
if($pending.Count -eq 0){Write-Host 'REVAMP_ALREADY_APPLIED';return}
$repo = [System.IO.Path]::GetFullPath($RepoPath)
$backup = Join-Path (Split-Path -Parent $repo) ('SupportCenter_Native_Revamp_Backup_'+(Get-Date -Format 'yyyyMMdd_HHmmss'))
$changed=@()
try {
  foreach($item in $pending){
    $bak=Join-Path $backup ($item.Relative.Replace('/','\'))
    if($null -ne $item.OldHash){
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $bak) | Out-Null
      Copy-Item -LiteralPath $item.Target -Destination $bak -Force
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $item.Target) | Out-Null
    $changed += [pscustomobject]@{I=$item;Backup=$bak}
    Copy-Item -LiteralPath $item.Source -Destination $item.Target -Force
    if((Get-Sha $item.Target) -ne $item.NewHash){throw "REVAMP_WRITE_VERIFY_FAILED $($item.Relative)"}
    Write-Host "REVAMP_PATCHED $($item.Relative)"
  }
}catch{
  foreach($record in $changed){
    if($null -ne $record.I.OldHash){
      Copy-Item -LiteralPath $record.Backup -Destination $record.I.Target -Force
    }else{Remove-Item -LiteralPath $record.I.Target -Force -ErrorAction SilentlyContinue}
  }
  throw
}
Write-Host "REVAMP_PATCH_APPLIED: $($pending.Count) files" -ForegroundColor Green
Write-Host "REVAMP_BACKUP $backup"
