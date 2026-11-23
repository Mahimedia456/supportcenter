param([string]$RepoPath='E:\Supportcenter')
$ErrorActionPreference='Stop'
$native=Join-Path ([System.IO.Path]::GetFullPath($RepoPath)) 'native-android'
$items=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw | ConvertFrom-Json
foreach($item in $items){
 $r=([string]$item.path).Replace('/','\')
 $dest=Join-Path $native $r
 if(-not (Test-Path -LiteralPath $dest -PathType Leaf)){throw "UI_MISSING $r"}
 $actual=(Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLowerInvariant()
 if($actual -ne ([string]$item.patched_sha256).ToLowerInvariant()){throw "UI_FILE_CHANGED $r"}
 Write-Host "UI_FILE_PASS $r"
}
$login=Get-Content -LiteralPath (Join-Path $native 'app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\ui\ExpoParityLogin.kt') -Raw
if($login -notmatch 'VisibilityOff' -or $login -notmatch 'BrandCyan'){throw 'UI_LOGIN_PARITY_MISSING'}
& (Join-Path $native 'CHECK-PROJECT.ps1') -RepoPath $RepoPath
Write-Host 'UI_STATIC_PREFLIGHT_PASS' -ForegroundColor Green
