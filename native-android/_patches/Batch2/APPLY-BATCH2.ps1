param(
    [string]$RepoPath='E:\Supportcenter',
    [switch]$DryRun
)
$ErrorActionPreference='Stop'
$repo=[System.IO.Path]::GetFullPath($RepoPath)
$project=Join-Path $repo 'native-android'
if(-not (Test-Path -LiteralPath $project -PathType Container)){throw "B2_PROJECT_MISSING $project"}
if(-not (Test-Path -LiteralPath (Join-Path $project 'settings.gradle.kts'))){throw 'B2_NOT_A_NATIVE_ANDROID_PROJECT'}
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'PATCH_MANIFEST.json') -Raw | ConvertFrom-Json
$todo=New-Object 'System.Collections.Generic.List[object]'
function FileHash([string]$path) {
    if(-not (Test-Path -LiteralPath $path -PathType Leaf)){ return $null }
    return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
}
# Read all files and validate all source hashes before writing any file.
foreach($item in $manifest){
    $rel=[string]$item.path
    if($rel.StartsWith('/') -or $rel.Contains('..') -or $rel.Contains(':')){throw "B2_UNSAFE_MANIFEST_PATH $rel"}
    $dest=Join-Path $project ($rel.Replace('/','\'))
    $source=Join-Path $PSScriptRoot (Join-Path 'PATCH_FILES' ($rel.Replace('/','\')))
    $baseHash=$null; if($null -ne $item.base_sha256){$baseHash=([string]$item.base_sha256).ToLowerInvariant()}
    $newHash=([string]$item.patched_sha256).ToLowerInvariant()
    if((FileHash $source) -ne $newHash){throw "B2_PACKAGE_HASH_MISMATCH $rel"}
    $existing=FileHash $dest
    if($existing -eq $newHash){Write-Host "ALREADY_PATCHED $rel";continue}
    if($null -eq $baseHash){
        if($null -ne $existing){throw "B2_NEW_FILE_CONFLICT $rel"}
    } elseif($existing -ne $baseHash){
        throw "B2_BASE_VERSION_MISMATCH $rel`nDo NOT force or overwrite. Send the error and git diff for this file."
    }
    [void]$todo.Add([pscustomobject]@{rel=$rel;source=$source;dest=$dest;hadFile=($null -ne $existing);newHash=$newHash})
    Write-Host "READY $rel"
}
if($DryRun){Write-Host "B2_DRY_RUN_PASS: $($todo.Count) paths ready, no files modified" -ForegroundColor Green;return}
if($todo.Count -eq 0){Write-Host 'B2_ALREADY_APPLIED: no files changed' -ForegroundColor Green;return}
$parent=Split-Path -Parent $repo
$backRoot=Join-Path $parent ("SupportCenter_Native_B2_Backup_"+(Get-Date -Format 'yyyyMMdd_HHmmss'))
New-Item -ItemType Directory -Force $backRoot | Out-Null
$applied=New-Object 'System.Collections.Generic.List[object]'
try {
    foreach($item in $todo){
        if($item.hadFile){
            $backup=Join-Path $backRoot ($item.rel.Replace('/','\'))
            New-Item -ItemType Directory -Force (Split-Path -Parent $backup) | Out-Null
            Copy-Item -LiteralPath $item.dest -Destination $backup -Force
        }
        New-Item -ItemType Directory -Force (Split-Path -Parent $item.dest) | Out-Null
        [void]$applied.Add($item)
        Copy-Item -LiteralPath $item.source -Destination $item.dest -Force
        if((FileHash $item.dest) -ne $item.newHash){throw "B2_WRITE_VERIFY_FAILED $($item.rel)"}
        Write-Host "PATCHED $($item.rel)"
    }
} catch {
    foreach($item in $applied){
        if($item.hadFile){
            $backup=Join-Path $backRoot ($item.rel.Replace('/','\'))
            if(Test-Path -LiteralPath $backup){Copy-Item -LiteralPath $backup -Destination $item.dest -Force}
        }else{Remove-Item -LiteralPath $item.dest -Force -ErrorAction SilentlyContinue}
    }
    throw
}
Write-Host "B2_PATCH_APPLIED: $($todo.Count) paths" -ForegroundColor Green
Write-Host "B2_BACKUP: $backRoot"
Write-Host 'NEXT: build and install on device; Android compilation NOT yet verified.'
