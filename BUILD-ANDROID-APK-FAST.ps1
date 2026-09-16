param(
    [string]$ProjectRoot = "E:\Supportcenter\apps\mobile",
    [switch]$Clean,
    [switch]$Prebuild
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Support Command Center - FAST Standalone Android APK Builder" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot" -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-Path $ProjectRoot)) {
    throw "Project not found: $ProjectRoot"
}

Set-Location $ProjectRoot

# -------------------------------------------------------------------
# 1. Basic checks
# -------------------------------------------------------------------
Write-Host "[1/6] Checking Node / Java / project..." -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js not found in PATH."
}

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    throw "Java/JDK not found in PATH. Install/configure JDK 17+ first."
}

if (-not (Test-Path "package.json")) {
    throw "package.json not found in $ProjectRoot"
}

Write-Host "PASS: Node, Java and project found." -ForegroundColor Green

# -------------------------------------------------------------------
# 2. Install deps only when node_modules is missing
# -------------------------------------------------------------------
Write-Host "[2/6] Checking dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules missing - running npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed."
    }
} else {
    Write-Host "PASS: node_modules already exists - skipping npm install." -ForegroundColor Green
}

# -------------------------------------------------------------------
# 3. Reuse native project for speed
# -------------------------------------------------------------------
Write-Host "[3/6] Preparing Android native project..." -ForegroundColor Yellow

$AndroidDir = Join-Path $ProjectRoot "android"

if ($Prebuild -or -not (Test-Path $AndroidDir)) {
    Write-Host "Running Expo prebuild for Android..."
    npx expo prebuild -p android
    if ($LASTEXITCODE -ne 0) {
        throw "Expo prebuild failed."
    }
} else {
    Write-Host "PASS: android folder exists - skipping prebuild for faster build." -ForegroundColor Green
}

# -------------------------------------------------------------------
# 4. Optional clean
# -------------------------------------------------------------------
Write-Host "[4/6] Gradle preparation..." -ForegroundColor Yellow

Set-Location $AndroidDir

if (-not (Test-Path ".\gradlew.bat")) {
    throw "gradlew.bat not found in android folder."
}

# Fast local Gradle settings for this process only.
$env:GRADLE_OPTS = "-Dorg.gradle.daemon=true -Dorg.gradle.parallel=true -Dorg.gradle.caching=true -Dorg.gradle.jvmargs=-Xmx4096m"

if ($Clean) {
    Write-Host "Clean requested - running Gradle clean..."
    .\gradlew.bat clean --daemon --parallel --build-cache
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle clean failed."
    }
} else {
    Write-Host "PASS: skipping clean for incremental fast build." -ForegroundColor Green
}

# -------------------------------------------------------------------
# 5. Build standalone release APK
# -------------------------------------------------------------------
Write-Host "[5/6] Building standalone RELEASE APK..." -ForegroundColor Yellow
Write-Host "This APK does NOT need Expo Go or Metro after installation." -ForegroundColor DarkGray

.\gradlew.bat app:assembleRelease `
    --daemon `
    --parallel `
    --build-cache `
    --console=plain

if ($LASTEXITCODE -ne 0) {
    throw "Android release build failed."
}

# -------------------------------------------------------------------
# 6. Find and copy APK
# -------------------------------------------------------------------
Write-Host "[6/6] Locating APK..." -ForegroundColor Yellow

$Candidates = @(
    (Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"),
    (Join-Path $AndroidDir "app\build\outputs\apk\release\app-release-unsigned.apk")
)

$Apk = $Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $Apk) {
    $Apk = Get-ChildItem `
        -Path (Join-Path $AndroidDir "app\build\outputs\apk") `
        -Filter "*.apk" `
        -File `
        -Recurse `
        -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1 |
        ForEach-Object { $_.FullName }
}

if (-not $Apk) {
    throw "Build completed but APK could not be found."
}

$OutDir = Join-Path $ProjectRoot "builds"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmm"
$FinalApk = Join-Path $OutDir "SupportCommandCenter-$Stamp-release.apk"

Copy-Item $Apk $FinalApk -Force

$SizeMB = [math]::Round((Get-Item $FinalApk).Length / 1MB, 2)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " APK BUILD SUCCESS" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "APK:  $FinalApk" -ForegroundColor White
Write-Host "Size: $SizeMB MB" -ForegroundColor White
Write-Host ""
Write-Host "Direct installable APK. Expo Go / Metro is NOT required." -ForegroundColor Cyan
Write-Host ""
Write-Host "Next builds will be faster because android/, Gradle cache and node_modules are reused." -ForegroundColor DarkGray
