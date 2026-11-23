param([string]$RepoPath='E:\Supportcenter')
$ErrorActionPreference='Stop'
$repo=[System.IO.Path]::GetFullPath($RepoPath)
$native=Join-Path $repo 'native-android'
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'PATCH_MANIFEST.json') -Raw | ConvertFrom-Json
foreach($row in $manifest){
 $rel=([string]$row.path).Replace('/','\')
 $dest=Join-Path $native $rel
 if(-not (Test-Path -LiteralPath $dest -PathType Leaf)){throw "B3_MISSING $rel"}
 $hash=(Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash
 if($hash -ine [string]$row.patched_sha256){throw "B3_HASH_MISMATCH $rel"}
 Write-Host "FILE_PASS $rel"
}
$gradle=Get-Content -LiteralPath (Join-Path $native 'app\build.gradle.kts') -Raw
if($gradle -match 'expo|react-native|sb_secret_|SUPABASE_DATABASE_URL'){throw 'B3_UNEXPECTED_EXPO_OR_SECRET'}
if(-not (Test-Path -LiteralPath (Join-Path $native 'app\src\main\res\drawable-nodpi\brand_supportcenter.png'))){throw 'B3_SUPPORTCENTER_LOGO_NOT_FOUND'}
& (Join-Path $native 'CHECK-PROJECT.ps1') -RepoPath $repo
Write-Host 'B3_STATIC_PREFLIGHT_PASS' -ForegroundColor Green
