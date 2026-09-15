$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 15.4 Animated Auth + Keyboard Stability Fix" -ForegroundColor Cyan
Write-Host "Professional animated login, stable password focus, native splash config"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"
$AppJson = Join-Path $Mobile "app.json"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }

Write-Host "[1/6] Verifying final auth asset..." -ForegroundColor Yellow
$Brand = Join-Path $Mobile "assets\final\support-command-center-brand.png"
if (-not (Test-Path $Brand)) {
    throw "Brand asset missing: $Brand"
}

Write-Host "[2/6] Configuring Android keyboard resize + splash background..." -ForegroundColor Yellow

if (Test-Path $AppJson) {
    $cfg = Get-Content $AppJson -Raw | ConvertFrom-Json

    if (-not $cfg.expo) {
        throw "app.json missing expo root."
    }

    if (-not $cfg.expo.android) {
        $cfg.expo | Add-Member -NotePropertyName android -NotePropertyValue ([pscustomobject]@{})
    }

    # Prevent Android keyboard focus glitches caused by pan/resize ambiguity.
    $cfg.expo.android | Add-Member `
        -NotePropertyName softwareKeyboardLayoutMode `
        -NotePropertyValue "resize" `
        -Force

    # Keep native splash simple and clean. The animated logo movement happens
    # immediately after JS loads on the login screen.
    $cfg.expo.splash = [pscustomobject]@{
        resizeMode = "contain"
        backgroundColor = "#F7FCFA"
    }

    $cfg | ConvertTo-Json -Depth 20 | Set-Content $AppJson -Encoding UTF8

    Write-Host "PASS: app.json keyboard mode set to resize." -ForegroundColor Green
}
else {
    Write-Host "app.json not found; skipping config patch." -ForegroundColor DarkYellow
}

Set-Location $Mobile

Write-Host "[3/6] Verifying dependencies..." -ForegroundColor Yellow
npm ls `
  @expo/vector-icons `
  expo-linear-gradient `
  react-native-safe-area-context `
  react-native-reanimated `
  react-native-worklets `
  --depth=0

if ($LASTEXITCODE -ne 0) {
    throw "Required dependency verification failed."
}

Write-Host "[4/6] Mobile TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[5/6] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[6/6] Final auth file verification..." -ForegroundColor Yellow

$Required = @(
    (Join-Path $Mobile "src\app\(auth)\login.tsx"),
    (Join-Path $Mobile "src\components\layout\KeyboardAwareScreen.tsx"),
    (Join-Path $Mobile "src\components\ui\AppTextField.tsx"),
    $Brand
)

foreach ($File in $Required) {
    if (-not (Test-Path $File)) {
        throw "Missing final auth file: $File"
    }
}

Write-Host ""
Write-Host "PASS: Phase 15.4 Animated Auth + Keyboard Fix installed." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: native Android splash/keyboard config changes require a new dev/native build." -ForegroundColor Yellow
Write-Host "Expo Go / an already-installed development build may not show native config changes." -ForegroundColor Yellow
Write-Host ""
Write-Host "For JS UI testing:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
Write-Host ""
Write-Host "For native splash + keyboard mode:"
Write-Host "  create/install a fresh development build or prebuild/native build."
