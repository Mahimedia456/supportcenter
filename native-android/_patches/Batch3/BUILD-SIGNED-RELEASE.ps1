param([string]$RepoPath='E:\Supportcenter')
$ErrorActionPreference='Stop'
$repo=[System.IO.Path]::GetFullPath($RepoPath)
$native=Join-Path $repo 'native-android'
& (Join-Path $PSScriptRoot 'CHECK-BATCH3.ps1') -RepoPath $repo
$store=Read-Host 'Your Android signing keystore (.jks) full path'
if(-not (Test-Path -LiteralPath $store -PathType Leaf)){throw 'B3_RELEASE_KEYSTORE_MISSING'}
$alias=Read-Host 'Signing key alias'
if([string]::IsNullOrWhiteSpace($alias)){throw 'B3_RELEASE_ALIAS_MISSING'}
function Hidden([string]$label){
 $secure=Read-Host $label -AsSecureString
 $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
 try{return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}
 finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
}
try{
 $env:SC_RELEASE_KEYSTORE=[System.IO.Path]::GetFullPath($store)
 $env:SC_RELEASE_ALIAS=$alias
 $env:SC_RELEASE_STORE_PASS=Hidden 'Keystore password (hidden)'
 $env:SC_RELEASE_KEY_PASS=Hidden 'Key password (hidden)'
 if(-not $env:SC_RELEASE_STORE_PASS -or -not $env:SC_RELEASE_KEY_PASS){throw 'B3_SIGNING_PASSWORD_MISSING'}
 $gradleExe=(& (Join-Path $native 'GET-GRADLE.ps1') | Select-Object -Last 1).Trim()
 if(-not (Test-Path -LiteralPath $gradleExe)){throw 'B3_GRADLE_MISSING'}
 Push-Location $native
 try{& $gradleExe --no-daemon :app:assembleRelease :app:bundleRelease}
 finally{Pop-Location}
 if($LASTEXITCODE -ne 0){throw 'B3_SIGNED_RELEASE_FAILED'}
 $apk=Join-Path $native 'app\build\outputs\apk\release\app-release.apk'
 $bundle=Join-Path $native 'app\build\outputs\bundle\release\app-release.aab'
 if(-not (Test-Path -LiteralPath $apk) -or -not (Test-Path -LiteralPath $bundle)){throw 'B3_RELEASE_OUTPUT_MISSING'}
 $dist=Join-Path $native 'dist'
 New-Item -ItemType Directory -Path $dist -Force | Out-Null
 Copy-Item -LiteralPath $apk -Destination (Join-Path $dist 'SupportCenter-Native-B3-signed-release.apk') -Force
 Copy-Item -LiteralPath $bundle -Destination (Join-Path $dist 'SupportCenter-Native-B3-signed-release.aab') -Force
 Write-Host 'B3_SIGNED_RELEASE_BUILD_PASS (manual signature and Play checks pending)' -ForegroundColor Green
} finally {
 foreach($key in @('SC_RELEASE_KEYSTORE','SC_RELEASE_ALIAS','SC_RELEASE_STORE_PASS','SC_RELEASE_KEY_PASS')){
  Remove-Item "Env:$key" -ErrorAction SilentlyContinue
 }
}
