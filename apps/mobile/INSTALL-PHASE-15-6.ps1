$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 15.6 FINAL Auth + 4s Splash" -ForegroundColor Cyan
Write-Host "Original transparent logo, same auth background, no secure/read-only footer, login timeout fix"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"
$AppJson = Join-Path $Mobile "app.json"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }

Write-Host "[1/7] Verifying ORIGINAL transparent brand asset..." -ForegroundColor Yellow
$Logo = Join-Path $Mobile "assets\brand\final\support-command-center-logo-transparent.png"
$Background = Join-Path $Mobile "assets\brand\final\auth-background.png"

if (-not (Test-Path $Logo)) { throw "Transparent logo missing: $Logo" }
if (-not (Test-Path $Background)) { throw "Auth background missing: $Background" }

Write-Host "PASS: full transparent logo + auth background present." -ForegroundColor Green

Write-Host "[2/7] Ensuring expo-splash-screen dependency..." -ForegroundColor Yellow
Set-Location $Mobile
npx expo install expo-splash-screen
if ($LASTEXITCODE -ne 0) {
    throw "expo-splash-screen installation failed."
}

Write-Host "[3/7] Configuring native splash to match login..." -ForegroundColor Yellow

if (Test-Path $AppJson) {
    $cfg = Get-Content $AppJson -Raw | ConvertFrom-Json

    if (-not $cfg.expo) { throw "app.json missing expo root." }

    if (-not $cfg.expo.android) {
        $cfg.expo | Add-Member -NotePropertyName android -NotePropertyValue ([pscustomobject]@{})
    }

    $cfg.expo.android | Add-Member `
        -NotePropertyName softwareKeyboardLayoutMode `
        -NotePropertyValue "resize" `
        -Force

    $plugins = @()
    if ($cfg.expo.plugins) {
        $plugins = @($cfg.expo.plugins)
    }

    # Remove an older expo-splash-screen entry so we can write one canonical config.
    $cleanPlugins = @()

    foreach ($plugin in $plugins) {
        $isSplash = $false

        if ($plugin -is [string]) {
            $isSplash = ($plugin -eq "expo-splash-screen")
        }
        elseif ($plugin -is [System.Collections.IEnumerable]) {
            $arr = @($plugin)
            if ($arr.Count -gt 0 -and $arr[0] -eq "expo-splash-screen") {
                $isSplash = $true
            }
        }

        if (-not $isSplash) {
            $cleanPlugins += ,$plugin
        }
    }

    $splashPlugin = @(
        "expo-splash-screen",
        @{
            image = "./assets/brand/final/support-command-center-logo-transparent.png"
            imageWidth = 220
            resizeMode = "contain"
            backgroundColor = "#F7FCFA"
            dark = @{
                image = "./assets/brand/final/support-command-center-logo-transparent.png"
                backgroundColor = "#F7FCFA"
            }
        }
    )

    $cleanPlugins += ,$splashPlugin
    $cfg.expo.plugins = $cleanPlugins

    # Keep legacy splash key aligned too for compatibility with existing config.
    $cfg.expo.splash = [pscustomobject]@{
        image = "./assets/brand/final/support-command-center-logo-transparent.png"
        resizeMode = "contain"
        backgroundColor = "#F7FCFA"
    }

    $cfg | ConvertTo-Json -Depth 30 | Set-Content $AppJson -Encoding UTF8

    Write-Host "PASS: native splash config updated." -ForegroundColor Green
}
else {
    Write-Host "app.json not found; JS 4-second splash is still installed." -ForegroundColor DarkYellow
}

Write-Host "[4/7] Checking forbidden login footer text..." -ForegroundColor Yellow

$LoginFile = Join-Path $Mobile "src\app\(auth)\login.tsx"
$LoginText = Get-Content $LoginFile -Raw

if ($LoginText -match "Read-only access|Secure session") {
    throw "Forbidden Read-only/Secure-session footer text is still present."
}

Write-Host "PASS: login/splash footer text removed." -ForegroundColor Green

Write-Host "[5/7] Mobile TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[6/7] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[7/7] Git secret protection check..." -ForegroundColor Yellow

$GitIgnore = Join-Path $Root ".gitignore"
if (-not (Test-Path $GitIgnore)) {
    throw "Root .gitignore missing."
}

$IgnoreText = Get-Content $GitIgnore -Raw
if ($IgnoreText -notmatch "\*\*/\.env") {
    throw "Root .gitignore does not protect nested .env files."
}

Write-Host ""
Write-Host "PASS: Phase 15.6 FINAL auth/splash installed." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT:"
Write-Host "- 4-second splash is coded into the login launch experience."
Write-Host "- Native splash matches the same brand/background but requires a fresh native/dev build."
Write-Host "- Set EXPO_PUBLIC_API_BASE_URL in apps\mobile\.env after your Vercel backend deploy."
Write-Host ""
Write-Host "UI test:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
