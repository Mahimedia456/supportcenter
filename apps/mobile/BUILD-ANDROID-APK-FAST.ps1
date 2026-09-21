param(
    [string]$ProjectRoot = "E:\Supportcenter\apps\mobile",
    [switch]$Prebuild,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Fast Android APK Builder V2" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot" -ForegroundColor DarkGray

if (-not (Test-Path $ProjectRoot)) {
    throw "Project root not found: $ProjectRoot"
}

Set-Location $ProjectRoot

if (-not (Test-Path ".\package.json")) {
    throw "package.json not found in $ProjectRoot"
}

Write-Host "[1/6] Checking Node + Java..." -ForegroundColor Yellow
node --version
if ($LASTEXITCODE -ne 0) { throw "Node.js not available." }

java -version
if ($LASTEXITCODE -ne 0) { throw "Java/JDK not available." }

Write-Host "[2/6] Checking node_modules..." -ForegroundColor Yellow
if (-not (Test-Path ".\node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
} else {
    Write-Host "PASS: node_modules exists; skipping npm install." -ForegroundColor Green
}

Write-Host "[3/6] Checking Android native project..." -ForegroundColor Yellow
if ($Prebuild -or -not (Test-Path ".\android")) {
    Write-Host "Running Expo prebuild for Android..." -ForegroundColor Cyan
    npx expo prebuild -p android
    if ($LASTEXITCODE -ne 0) { throw "Expo prebuild failed." }
} else {
    Write-Host "PASS: android folder exists; skipping prebuild." -ForegroundColor Green
}

$Android = Join-Path $ProjectRoot "android"
Set-Location $Android

$env:GRADLE_OPTS = "-Dorg.gradle.daemon=true -Dorg.gradle.parallel=true -Dorg.gradle.caching=true -Dorg.gradle.jvmargs=-Xmx4096m -Dfile.encoding=UTF-8"

Write-Host "[4/6] Gradle preparation..." -ForegroundColor Yellow
if ($Clean) {
    .\gradlew.bat clean --daemon --parallel --build-cache --console=plain
    if ($LASTEXITCODE -ne 0) { throw "Gradle clean failed." }
} else {
    Write-Host "FAST MODE: skipping clean." -ForegroundColor Green
}

Write-Host "[5/6] Building standalone release APK..." -ForegroundColor Yellow
.\gradlew.bat app:assembleRelease --daemon --parallel --build-cache --console=plain
if ($LASTEXITCODE -ne 0) {
    throw "Android release build failed."
}

Write-Host "[6/6] Finding APK..." -ForegroundColor Yellow

$candidates = @(
    (Join-Path $Android "app\build\outputs\apk\release\app-release.apk"),
    (Join-Path $Android "app\build\outputs\apk\release\app-release-unsigned.apk")
)

$apk = $null
foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
        $apk = $candidate
        break
    }
}

if (-not $apk) {
    $apk = Get-ChildItem -Path (Join-Path $Android "app\build\outputs\apk") -Recurse -Filter "*.apk" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not $apk) {
    throw "APK build completed but no APK file was found."
}

$Builds = Join-Path $ProjectRoot "builds"
New-Item -ItemType Directory -Force -Path $Builds | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmm"
$Out = Join-Path $Builds "SupportCommandCenter-$Stamp-release.apk"
Copy-Item $apk $Out -Force

Write-Host ""
Write-Host "PASS: APK created." -ForegroundColor Green
Write-Host $Out -ForegroundColor Cyan
Write-Host ""
Write-Host "This APK does not require Expo Go or Metro after installation." -ForegroundColor Green
