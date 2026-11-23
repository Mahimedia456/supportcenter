param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$version='8.11.1'
$base=Join-Path $PSScriptRoot '.tools'
$gradleExe=Join-Path $base "gradle-$version\bin\gradle.bat"
if(Test-Path -LiteralPath $gradleExe){ Write-Output $gradleExe; return }
if($CheckOnly){throw 'GRADLE_NOT_BOOTSTRAPPED: run GET-GRADLE.ps1 without -CheckOnly'}
New-Item -ItemType Directory -Force $base | Out-Null
$zip=Join-Path $base "gradle-$version-bin.zip"
$shaFile=Join-Path $base "gradle-$version-bin.zip.sha256"
$mirror="https://services.gradle.org/distributions/gradle-$version-bin.zip"
$shaUrl="$mirror.sha256"
Write-Host 'Downloading official Gradle distribution and checksum via HTTPS.'
try {
    Invoke-WebRequest -Uri $mirror -OutFile $zip -UseBasicParsing
    # PowerShell 5.1 may return [byte[]] for .Content, which cannot .Trim().
    # -OutFile + ReadAllText works for both binary/text HTTP content types.
    Invoke-WebRequest -Uri $shaUrl -OutFile $shaFile -UseBasicParsing
    $shaText=[System.IO.File]::ReadAllText($shaFile, [System.Text.Encoding]::UTF8).Trim()
    $match=[regex]::Match($shaText,'(?i)\b[a-f0-9]{64}\b')
    if(-not $match.Success){throw 'GRADLE_CHECKSUM_DOWNLOAD_FAILED: valid SHA256 not found'}
    $expected=$match.Value
    $actual=(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash
    if($actual -ine $expected){throw 'GRADLE_CHECKSUM_MISMATCH: downloaded ZIP does not match official SHA256'}
    Expand-Archive -LiteralPath $zip -DestinationPath $base -Force
    if(-not (Test-Path -LiteralPath $gradleExe)){throw 'GRADLE_BOOTSTRAP_FAILED'}
} finally {
    Remove-Item -LiteralPath $shaFile -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
}
Write-Output $gradleExe
