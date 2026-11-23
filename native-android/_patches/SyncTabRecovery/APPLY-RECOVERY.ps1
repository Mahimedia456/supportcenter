param(
  [string]$RepoPath='E:\Supportcenter',
  [ValidateSet('NativeUI','BackendSync','Workflow')][string]$Component='NativeUI',
  [switch]$DryRun
)
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath($RepoPath)
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw | ConvertFrom-Json
$prefix=switch($Component){
  'NativeUI' {'native-android/'}
  'BackendSync' {'backend/'}
  'Workflow' {'.github/'}
}
$entry=@($manifest | Where-Object {$_.path.StartsWith($prefix)})
if($entry.Count -ne 1){throw "COMPONENT_NOT_FOUND: $Component"}
$item=$entry[0]
$rel=$item.path.Replace('/',[IO.Path]::DirectorySeparatorChar)
$target=Join-Path $repo $rel
$source=Join-Path (Join-Path $PSScriptRoot 'PATCH_FILES') $rel
if(-not (Test-Path -LiteralPath $target)){throw "TARGET_NOT_FOUND: $target"}
if(-not (Test-Path -LiteralPath $source)){throw 'PATCH_FILE_MISSING'}
$want=[string]$item.patched_sha256
$sourceHash=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
if($sourceHash -ne $want){throw "PACKAGE_HASH_MISMATCH $Component"}
$actual=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
if($actual -eq $want){Write-Host "ALREADY_APPLIED $Component" -ForegroundColor Green;return}
$allowed=@($item.allowed_base_sha256 | ForEach-Object {[string]$_})
if($allowed -notcontains $actual){
  Write-Warning "LOCAL_VERSION_MISMATCH $Component. Existing changes untouched."
  Write-Host "TARGET: $target"
  Write-Host "CURRENT_SHA256: $actual"
  Write-Host "REVIEW_SOURCE: $source"
  throw "UNRECOGNIZED_LOCAL_SOURCE: $Component"
}
Write-Host "READY $Component : $target"
if($DryRun){Write-Host "RECOVERY_DRY_RUN_PASS $Component" -ForegroundColor Green;return}
$stamp=Get-Date -Format 'yyyyMMdd_HHmmss'
$backup=Join-Path (Split-Path $repo -Parent) "SupportCenter_Recovery_Backup_$stamp"
$backupTarget=Join-Path $backup $rel
New-Item -ItemType Directory -Force -Path (Split-Path $backupTarget -Parent)|Out-Null
Copy-Item -LiteralPath $target -Destination $backupTarget
Copy-Item -LiteralPath $source -Destination $target -Force
$after=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
if($after -ne $want){Copy-Item -LiteralPath $backupTarget -Destination $target -Force;throw 'PATCH_VERIFY_FAILED_AND_ROLLED_BACK'}
Write-Host "RECOVERY_APPLIED $Component" -ForegroundColor Green
Write-Host "BACKUP $backupTarget"
