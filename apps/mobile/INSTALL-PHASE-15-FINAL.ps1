$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 15 FINAL UI Polish + Release Readiness" -ForegroundColor Cyan
Write-Host "Creative splash, polished login, gradients, keyboard-aware fields, final QA"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }

Set-Location $Mobile

Write-Host "[1/7] Installing UI dependencies..." -ForegroundColor Yellow
npx expo install expo-linear-gradient react-native-safe-area-context
if ($LASTEXITCODE -ne 0) { throw "UI dependency install failed." }

Write-Host "[2/7] Verifying splash asset..." -ForegroundColor Yellow
$Splash = Join-Path $Mobile "assets\final\support-command-center-splash.png"
if (-not (Test-Path $Splash)) { throw "Splash asset missing: $Splash" }

Write-Host "[3/7] Patching app.json splash configuration when available..." -ForegroundColor Yellow
$AppJson = Join-Path $Mobile "app.json"

if (Test-Path $AppJson) {
    $cfg = Get-Content $AppJson -Raw | ConvertFrom-Json

    if (-not $cfg.expo) {
        throw "app.json does not contain expo root."
    }

    $cfg.expo.splash = [pscustomobject]@{
        image = "./assets/final/support-command-center-splash.png"
        resizeMode = "contain"
        backgroundColor = "#F7FBF9"
    }

    if (-not $cfg.expo.android) {
        $cfg.expo | Add-Member -NotePropertyName android -NotePropertyValue ([pscustomobject]@{})
    }

    if (-not $cfg.expo.ios) {
        $cfg.expo | Add-Member -NotePropertyName ios -NotePropertyValue ([pscustomobject]@{})
    }

    $cfg.expo.android.splash = [pscustomobject]@{
        image = "./assets/final/support-command-center-splash.png"
        resizeMode = "contain"
        backgroundColor = "#F7FBF9"
    }

    $cfg.expo.ios.splash = [pscustomobject]@{
        image = "./assets/final/support-command-center-splash.png"
        resizeMode = "contain"
        backgroundColor = "#F7FBF9"
    }

    $cfg | ConvertTo-Json -Depth 20 | Set-Content $AppJson -Encoding UTF8
    Write-Host "app.json splash patched." -ForegroundColor Green
}
else {
    Write-Host "app.json not found; splash source file is still installed for config-based projects." -ForegroundColor DarkYellow
}

Write-Host "[4/7] Mobile TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Mobile TypeScript check failed." }

Write-Host "[5/7] Expo Doctor..." -ForegroundColor Yellow
npx expo-doctor
if ($LASTEXITCODE -ne 0) {
    Write-Host "Expo Doctor reported warnings. Review before store build." -ForegroundColor DarkYellow
}

Write-Host "[6/7] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Backend TypeScript check failed." }

Write-Host "[7/7] Final file checks..." -ForegroundColor Yellow
$Required = @(
    (Join-Path $Mobile "src\app\(auth)\login.tsx"),
    (Join-Path $Mobile "src\components\ui\PrimaryButton.tsx"),
    (Join-Path $Mobile "src\components\ui\AppTextField.tsx"),
    (Join-Path $Mobile "src\components\layout\KeyboardAwareScreen.tsx"),
    $Splash
)

foreach ($File in $Required) {
    if (-not (Test-Path $File)) {
        throw "Required final file missing: $File"
    }
}

Write-Host ""
Write-Host "PASS: Phase 15 FINAL UI polish installed." -ForegroundColor Green
Write-Host ""
Write-Host "Run backend:"
Write-Host "  cd E:\Supportcenter\backend"
Write-Host "  npm run start:dev"
Write-Host ""
Write-Host "Run mobile:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
