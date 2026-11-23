param(
  [string]$RepoPath = 'E:\Supportcenter',
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$native = Join-Path ([IO.Path]::GetFullPath($RepoPath)) 'native-android'
if (-not (Test-Path -LiteralPath (Join-Path $native 'settings.gradle.kts'))) {
  throw 'OOM_NATIVE_PROJECT_NOT_FOUND'
}
function Get-Sha([string]$File) {
  if (-not (Test-Path -LiteralPath $File -PathType Leaf)) { return $null }
  return (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant()
}
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw | ConvertFrom-Json
$files = New-Object System.Collections.ArrayList
foreach ($record in $manifest.files) { [void]$files.Add($record) }
if ($files.Count -ne 3) { throw "OOM_MANIFEST_INVALID count=$($files.Count)" }
$pending = New-Object System.Collections.ArrayList
foreach ($record in $files) {
  $path = [string]$record.path
  if (-not $path.StartsWith('app/') -or $path.Contains('..') -or $path.Contains(':') -or $path.StartsWith('/')) {
    throw "OOM_UNSAFE_PATH $path"
  }
  $relative = $path.Replace('/', [IO.Path]::DirectorySeparatorChar)
  $src = Join-Path (Join-Path $PSScriptRoot 'PATCH_FILES') $relative
  $dst = Join-Path $native $relative
  $targetHash = ([string]$record.after_sha256).ToLowerInvariant()
  $sourceHash = Get-Sha $src
  if ($sourceHash -ne $targetHash) { throw "OOM_PACKAGE_HASH_FAILED $path" }
  $currentHash = Get-Sha $dst
  if ($null -eq $currentHash) { throw "OOM_SOURCE_MISSING $path" }
  if ($currentHash -eq $targetHash) {
    Write-Host "OOM_ALREADY_APPLIED $path"
    continue
  }
  $accepted = New-Object 'System.Collections.Generic.List[string]'
  foreach ($hash in $record.before_sha256) { $accepted.Add(([string]$hash).ToLowerInvariant()) }
  if (-not $accepted.Contains($currentHash)) {
    throw "OOM_LOCAL_VERSION_MISMATCH $path SHA=$currentHash. Source untouched."
  }
  [void]$pending.Add(@{source=$src;destination=$dst;relative=$relative;path=$path;expected=$targetHash})
  Write-Host "OOM_READY $path"
}
if ($DryRun) {
  Write-Host "OOM_DRY_RUN_PASS: $($pending.Count) guarded source files; zero writes" -ForegroundColor Green
  return
}
if ($pending.Count -eq 0) {
  Write-Host 'OOM_PATCH_ALREADY_APPLIED' -ForegroundColor Green
  return
}
$repoParent = Split-Path ([IO.Path]::GetFullPath($RepoPath)) -Parent
$backup = Join-Path $repoParent ('SupportCenter_Native_OOM_Backup_' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
$changed = New-Object System.Collections.ArrayList
try {
  foreach ($entry in $pending) {
    $backupFile = Join-Path $backup $entry.relative
    New-Item -ItemType Directory -Force (Split-Path $backupFile -Parent) | Out-Null
    Copy-Item -LiteralPath $entry.destination -Destination $backupFile
    [void]$changed.Add(@{ destination=$entry.destination;backup=$backupFile })
    Copy-Item -LiteralPath $entry.source -Destination $entry.destination -Force
    if ((Get-Sha $entry.destination) -ne $entry.expected) {
      throw "OOM_WRITE_VERIFY_FAILED $($entry.path)"
    }
  }
} catch {
  foreach ($entry in $changed) {
    Copy-Item -LiteralPath $entry.backup -Destination $entry.destination -Force
  }
  throw
}
Write-Host "OOM_STREAMING_PATCH_APPLIED files=$($pending.Count)" -ForegroundColor Green
Write-Host "OOM_BACKUP $backup"
