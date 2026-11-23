param(
    [string]$RepoPath = 'E:\Supportcenter',
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'

$repo = [System.IO.Path]::GetFullPath($RepoPath)
$native = Join-Path $repo 'native-android'
$b3 = Join-Path $native '_patches\Batch3'
$relativeKotlin = 'app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\ui\SupportScreens.kt'
$kotlin = Join-Path $native $relativeKotlin
$patchKotlin = Join-Path (Join-Path $b3 'PATCH_FILES') $relativeKotlin
$manifest = Join-Path $b3 'PATCH_MANIFEST.json'
$runner = Join-Path $b3 'BUILD-AND-ADB-INSTALL.ps1'

$oldSha = '96b9b9683aeea0d4f4adc143aff009f17a2155a370be767a0b4a2f7d516768af'
$newSha = '5b803b517f46569251fa5cb078cc47917d27ac9f6b10f11db326e7224bfc5301'
$oldImport = "import androidx.compose.foundation.border`n"
$newImport = "import androidx.compose.foundation.border`nimport androidx.compose.foundation.horizontalScroll`n"
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-Sha([string]$File) {
    return (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant()
}

$all = @($kotlin, $patchKotlin, $manifest, $runner)
foreach ($file in $all) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        throw "B3_HOTFIX_MISSING_FILE: $file. Extract/apply Batch3 in native-android\_patches\Batch3 first."
    }
}

foreach ($file in @($kotlin, $patchKotlin)) {
    $hash = Get-Sha $file
    if ($hash -ne $oldSha -and $hash -ne $newSha) {
        throw "B3_HOTFIX_SOURCE_GUARD_FAILED: $file (SHA=$hash). No file modified."
    }
}

$manifestText = [System.IO.File]::ReadAllText($manifest)
$parsed = $manifestText | ConvertFrom-Json
$row = @($parsed | Where-Object { $_.path -eq ($relativeKotlin.Replace('\','/')) })
if ($row.Count -ne 1) { throw 'B3_HOTFIX_MANIFEST_ENTRY_MISSING_OR_DUPLICATE' }
$manifestSha = ([string]$row[0].patched_sha256).ToLowerInvariant()
if ($manifestSha -ne $oldSha -and $manifestSha -ne $newSha) {
    throw 'B3_HOTFIX_MANIFEST_GUARD_FAILED: unexpected pinned Kotlin checksum'
}
$runnerText = [System.IO.File]::ReadAllText($runner)
$hasOldPid = $runnerText.Contains('$pid')
$hasNewPid = $runnerText.Contains('$appProcessId')
if (-not $hasOldPid -and -not $hasNewPid) {
    throw 'B3_HOTFIX_RUNNER_GUARD_FAILED: expected ADB process variable not found'
}

Write-Host 'B3_HOTFIX_PREFLIGHT_PASS' -ForegroundColor Green
Write-Host 'FIX_1: Kotlin horizontalScroll import + synchronized Batch3 checksum'
Write-Host 'FIX_2: ADB runner PowerShell reserved $PID conflict'
if ($DryRun) {
    Write-Host 'B3_HOTFIX_DRY_RUN_PASS: no changes made' -ForegroundColor Green
    return
}

$backup = Join-Path (Split-Path -Parent $repo) ("SupportCenter_Native_B3_Hotfix_Backup_" + (Get-Date -Format 'yyyyMMdd_HHmmss'))
for ($i = 0; $i -lt $all.Count; $i++) {
    $backupFile = Join-Path $backup (("file{0}_" -f $i) + [System.IO.Path]::GetFileName($all[$i]))
    New-Item -ItemType Directory -Path (Split-Path -Parent $backupFile) -Force | Out-Null
    Copy-Item -LiteralPath $all[$i] -Destination $backupFile -Force
}

try {
    foreach ($file in @($kotlin, $patchKotlin)) {
        if ((Get-Sha $file) -eq $oldSha) {
            $contents = [System.IO.File]::ReadAllText($file)
            if ($contents.Contains('import androidx.compose.foundation.horizontalScroll')) {
                throw "B3_HOTFIX_IMPORT_ALREADY_PRESENT_UNEXPECTED_HASH: $file"
            }
            if (-not $contents.Contains($oldImport)) { throw "B3_HOTFIX_IMPORT_ANCHOR_MISSING: $file" }
            $updated = $contents.Replace($oldImport, $newImport)
            [System.IO.File]::WriteAllText($file, $updated, $utf8)
        }
        if ((Get-Sha $file) -ne $newSha) { throw "B3_HOTFIX_KOTLIN_HASH_FAIL: $file" }
    }
    if ($manifestSha -eq $oldSha) {
        if (-not $manifestText.Contains($oldSha)) { throw 'B3_HOTFIX_MANIFEST_TEXT_MISMATCH' }
        $manifestText = $manifestText.Replace($oldSha, $newSha)
        [System.IO.File]::WriteAllText($manifest, $manifestText, $utf8)
    }
    $manifestCheck = [System.IO.File]::ReadAllText($manifest) | ConvertFrom-Json
    $currentRow = @($manifestCheck | Where-Object { $_.path -eq ($relativeKotlin.Replace('\','/')) })
    if ($currentRow.Count -ne 1 -or ([string]$currentRow[0].patched_sha256) -ne $newSha) {
        throw 'B3_HOTFIX_MANIFEST_VERIFY_FAILED'
    }
    if ($hasOldPid) {
        $fixedRunner = $runnerText.Replace('$pid', '$appProcessId')
        [System.IO.File]::WriteAllText($runner, $fixedRunner, $utf8)
    }
    if ([System.IO.File]::ReadAllText($runner).Contains('$pid')) {
        throw 'B3_HOTFIX_ADB_PID_FIX_FAILED'
    }
} catch {
    for ($i = 0; $i -lt $all.Count; $i++) {
        $backupFile = Join-Path $backup (("file{0}_" -f $i) + [System.IO.Path]::GetFileName($all[$i]))
        Copy-Item -LiteralPath $backupFile -Destination $all[$i] -Force
    }
    throw
}
Write-Host "B3_HOTFIX_APPLIED backup=$backup" -ForegroundColor Green
Write-Host "KOTLIN_IMPORT_VERIFIED: $newSha"
Write-Host 'B3_MANIFEST_UPDATED: hash validation preserved'
Write-Host 'ADB_PROCESS_VARIABLE_FIXED: $appProcessId'
