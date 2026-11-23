param(
  [string]$RepoPath = 'E:\Supportcenter',
  [switch]$DryRun,
  [switch]$Apply
)
$ErrorActionPreference = 'Stop'
if (-not $DryRun -and -not $Apply) { throw 'SELECT_MODE: use -DryRun or -Apply' }
if ($DryRun -and $Apply) { throw 'SELECT_ONLY_ONE_MODE' }
$path = Join-Path $RepoPath 'native-android\app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\ui\SupportScreens.kt'
if (-not (Test-Path -LiteralPath $path)) { throw "SOURCE_NOT_FOUND: $path" }
$beforeHash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
$content = [IO.File]::ReadAllText($path)
$old = 'TabItem("Insights", Icons.Outlined.Assessment),'
$new = 'TabItem("RMA", Icons.Outlined.Assessment),'
$oldMatches = [regex]::Matches($content,[regex]::Escape($old)).Count
$newMatches = [regex]::Matches($content,[regex]::Escape($new)).Count
if ($oldMatches -eq 0 -and $newMatches -eq 1) {
  Write-Host 'RMA_TAB_ALREADY_CORRECT'
  Write-Host "SOURCE_SHA256: $beforeHash"
  return
}
if ($oldMatches -ne 1 -or $newMatches -ne 0) {
  throw "UNEXPECTED_TAB_LAYOUT: Insights=$oldMatches RMA=$newMatches; no files changed"
}
if (-not $content.Contains('state.tab == "RMA" -> NativeRmaScreen')) {
  throw 'RMA_ROUTE_MISSING: no changes made'
}
if (-not $content.Contains('onTab("Insights")')) {
  Write-Warning 'Header Insights shortcut not detected; RMA tab can be corrected, but verify access to Insights.'
}
Write-Host "RMA_TAB_READY SHA256=$beforeHash"
if ($DryRun) { Write-Host 'RMA_TAB_DRY_RUN_PASS: no changes'; return }
$backupDir = Join-Path (Split-Path $RepoPath -Parent) ('SupportCenter_RMA_Tab_Backup_' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$backup = Join-Path $backupDir 'SupportScreens.kt'
Copy-Item -LiteralPath $path -Destination $backup
# Preserve a UTF-8 BOM when present. Keep file changes limited to one tab entry.
$originalBytes=[IO.File]::ReadAllBytes($path)
$hasBom=($originalBytes.Length -ge 3 -and $originalBytes[0] -eq 0xEF -and $originalBytes[1] -eq 0xBB -and $originalBytes[2] -eq 0xBF)
$encoding = New-Object System.Text.UTF8Encoding($hasBom)
$updated = $content.Replace($old,$new)
try {
  [IO.File]::WriteAllText($path,$updated,$encoding)
  $verify=[IO.File]::ReadAllText($path)
  if (-not $verify.Contains($new) -or $verify.Contains($old)) { throw 'TAB_VERIFY_FAILED' }
  Write-Host 'RMA_TAB_PATCH_APPLIED'
  Write-Host "BACKUP: $backup"
  Write-Host ('NEW_SHA256: ' + (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant())
} catch {
  Copy-Item -LiteralPath $backup -Destination $path -Force
  throw
}
