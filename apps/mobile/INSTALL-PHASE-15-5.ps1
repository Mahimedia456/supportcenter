$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 15.5 TextInput Focus Typing Fix" -ForegroundColor Cyan
Write-Host "Fixes React Native FocusEvent/BlurEvent typing while preserving keyboard stability"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"
$Field = Join-Path $Mobile "src\components\ui\AppTextField.tsx"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }
if (-not (Test-Path $Field)) { throw "AppTextField not found: $Field" }

Write-Host "[1/4] Patching TextInput focus/blur event typing..." -ForegroundColor Yellow

$content = Get-Content $Field -Raw

# Remove outdated explicit event imports.
$content = $content -replace `
    "NativeSyntheticEvent,\s*\r?\n\s*", ""

$content = $content -replace `
    "TextInputFocusEventData,\s*\r?\n\s*", ""

# Replace explicitly typed handlers with parameter inference compatible
# with the installed React Native TextInput typings.
$content = [regex]::Replace(
    $content,
    "function handleFocus\(\s*e:\s*NativeSyntheticEvent<TextInputFocusEventData>,?\s*\)\s*\{",
    "function handleFocus(e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) {"
)

$content = [regex]::Replace(
    $content,
    "function handleBlur\(\s*e:\s*NativeSyntheticEvent<TextInputFocusEventData>,?\s*\)\s*\{",
    "function handleBlur(e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) {"
)

Set-Content -Path $Field -Value $content -Encoding UTF8

$verify = Get-Content $Field -Raw

if ($verify -match "TextInputFocusEventData") {
    throw "Old TextInputFocusEventData typing is still present."
}

if ($verify -notmatch "Parameters<NonNullable<TextInputProps\['onFocus'\]>>\[0\]") {
    throw "New onFocus typing was not applied."
}

Write-Host "PASS: TextInput event typing patched." -ForegroundColor Green

Write-Host "[2/4] Mobile TypeScript check..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[3/4] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[4/4] Final auth verification..." -ForegroundColor Yellow

$Required = @(
    (Join-Path $Mobile "src\app\(auth)\login.tsx"),
    (Join-Path $Mobile "src\components\ui\AppTextField.tsx"),
    (Join-Path $Mobile "src\components\layout\KeyboardAwareScreen.tsx"),
    (Join-Path $Mobile "assets\final\support-command-center-brand.png")
)

foreach ($File in $Required) {
    if (-not (Test-Path $File)) {
        throw "Missing final auth file: $File"
    }
}

Write-Host ""
Write-Host "PASS: Phase 15.5 TextInput typing fix complete." -ForegroundColor Green
Write-Host ""
Write-Host "No previous Phase 15 installer needs to be rerun." -ForegroundColor DarkYellow
Write-Host ""
Write-Host "Start mobile:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
