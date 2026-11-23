param([string]$RepoPath='E:\Supportcenter')
$ErrorActionPreference='Stop'
$native=Join-Path ([System.IO.Path]::GetFullPath($RepoPath)) 'native-android'
$manifestJson = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot 'MANIFEST.json'))
$decoded = ConvertFrom-Json -InputObject $manifestJson
# Windows PowerShell 5.1 can return the JSON root array as one nested object.
# Normalize to one manifest object per entry; never weaken digest validation.
$manifest = @()
foreach($candidate in $decoded){
  if($candidate -is [System.Array]){
    foreach($nested in $candidate){ $manifest += $nested }
  }else{
    $manifest += $candidate
  }
}
if($manifest.Count -ne 6){throw "REVAMP_MANIFEST_SHAPE_INVALID: expected 6 entries, found $($manifest.Count)"}
foreach($check in $manifest){
  if($check -is [System.Array] -or [string]::IsNullOrWhiteSpace([string]$check.path) -or [string]::IsNullOrWhiteSpace([string]$check.patched_sha256)){
    throw 'REVAMP_MANIFEST_ENTRY_INVALID'
  }
}

$entries=$manifest
foreach($entry in $entries){
 $p=Join-Path $native (([string]$entry.path).Replace('/','\'))
 if(-not (Test-Path -LiteralPath $p -PathType Leaf)){throw "REVAMP_FILE_MISSING $($entry.path)"}
 $actual=(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()
 if($actual -ne ([string]$entry.patched_sha256).ToLowerInvariant()){throw "REVAMP_CHANGED_AFTER_INSTALL $($entry.path)"}
 Write-Host "REVAMP_FILE_PASS $($entry.path)"
}
$login = Get-Content (Join-Path $native 'app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\ui\ExpoParityLogin.kt') -Raw
$api = Get-Content (Join-Path $native 'app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\data\SupportApi.kt') -Raw
$gradle = Get-Content (Join-Path $native 'app\build.gradle.kts') -Raw
if($login -notmatch 'showPassword' -or $login -notmatch 'VisibilityOff'){throw 'REVAMP_PASSWORD_EYE_MISSING'}
if($api -notmatch 'val fromMessage'){throw 'REVAMP_AUTH_ERROR_DETAIL_MISSING'}
if($gradle -notmatch 'https://supportcenter-kappa\.vercel\.app'){throw 'REVAMP_UNKNOWN_API_URL_VERIFY_MANUALLY'}
& (Join-Path $native 'CHECK-PROJECT.ps1') -RepoPath $RepoPath
Write-Host 'REVAMP_STATIC_PREFLIGHT_PASS' -ForegroundColor Green
