param([string]$RepoPath = 'E:\Supportcenter')
$ErrorActionPreference='Stop'
$root=[System.IO.Path]::GetFullPath($PSScriptRoot)
$expected=[System.IO.Path]::GetFullPath((Join-Path $RepoPath 'native-android'))
if($root.TrimEnd('\') -ine $expected.TrimEnd('\')){
    throw "PROJECT_PATH_MISMATCH: Expected $expected but found $root"
}
$files=@(
  'settings.gradle.kts', 'build.gradle.kts', 'app\build.gradle.kts',
  'app\src\main\AndroidManifest.xml',
  'app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\MainActivity.kt',
  'app\src\main\res\drawable-nodpi\brand_supportcenter.png'
)
foreach($rel in $files){
    if(-not (Test-Path (Join-Path $root $rel))){throw "FILE_MISSING $rel"}
    Write-Host "FILE_PASS $rel"
}
& (Join-Path $root 'COPY-WORKSPACE-LOGOS.ps1') -RepoPath $RepoPath
# The logo script throws on missing or invalid assets.
$manifest=Get-Content (Join-Path $root 'app\src\main\AndroidManifest.xml') -Raw
if($manifest -notmatch 'android:usesCleartextTraffic="false"') {throw "INSECURE_HTTP_CONFIGURATION"}
$project=Get-Content (Join-Path $root 'app\build.gradle.kts') -Raw
if($project -match 'expo|react-native|sb_secret_|SUPABASE_DATABASE_URL'){throw 'UNEXPECTED_RUNTIME_DEPENDENCY_OR_SECRET'}
Write-Host 'B1_PREFLIGHT_PASS: original Expo project untouched' -ForegroundColor Green
