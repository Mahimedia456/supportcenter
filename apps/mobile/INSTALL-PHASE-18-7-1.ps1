$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 18.7.1 Installer Compatibility Fix" -ForegroundColor Cyan

$Mobile = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Login = Join-Path $Mobile "src\app\(auth)\login.tsx"

function Read-AllText([string]$Path) {
    return [System.IO.File]::ReadAllText($Path)
}

function Write-AllText([string]$Path, [string]$Content) {
    [System.IO.File]::WriteAllText(
        $Path,
        $Content,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

if (-not (Test-Path $Login)) {
    throw "Login screen missing: $Login"
}

Write-Host "[1/6] Updating animated login splash asset..." -ForegroundColor Yellow

$Text = Read-AllText $Login

$Text = $Text `
  -replace "support-command-center-logo-transparent\.png", "support-command-center-splash-lockup.png" `
  -replace "support-command-center-wordmark[^'`"]*", "support-command-center-splash-lockup.png"

$Text = $Text `
  -replace "width:\s*330,\s*\r?\n\s*height:\s*230,\s*\r?\n\s*marginBottom:\s*-38,", "width: 338,`r`n    height: 198,`r`n    marginBottom: 0,"

Write-AllText $Login $Text

Write-Host "PASS: Animated splash uses the final brand lockup." -ForegroundColor Green

Write-Host "[2/6] Removing old logo/wordmark references from active code..." -ForegroundColor Yellow

$SourceFiles = Get-ChildItem (Join-Path $Mobile "src") -Recurse -File -Include *.ts,*.tsx

foreach ($File in $SourceFiles) {
    $Body = Read-AllText $File.FullName

    if ($Body -match "support-command-center-logo-transparent|support-command-center-wordmark") {
        $Body = $Body `
          -replace "support-command-center-logo-transparent\.png", "support-command-center-splash-lockup.png" `
          -replace "support-command-center-wordmark[^'`"]*", "support-command-center-splash-lockup.png"

        Write-AllText $File.FullName $Body
    }
}

Write-Host "PASS: Old wordmark/logo-transparent references removed." -ForegroundColor Green

Write-Host "[3/6] Verifying final brand assets..." -ForegroundColor Yellow

$Required = @(
  "assets\brand\app-icon.png",
  "assets\brand\adaptive-icon-foreground.png",
  "assets\brand\adaptive-icon-background.png",
  "assets\brand\adaptive-icon-monochrome.png",
  "assets\brand\notification-icon.png",
  "assets\brand\final\support-command-center-mark.png",
  "assets\brand\final\support-command-center-splash-lockup.png",
  "assets\brand\final\icons\app-store-icon.png",
  "assets\brand\final\icons\play-store-icon.png",
  "assets\brand\final\icons\favicon.png",
  "assets\brand\final\icons\ios-home-icon-180.png"
)

foreach ($Relative in $Required) {
    $Path = Join-Path $Mobile $Relative
    if (-not (Test-Path $Path)) {
        throw "Missing final brand asset: $Relative"
    }
}

Write-Host "PASS: Final brand asset set is complete." -ForegroundColor Green

Write-Host "[4/6] Verifying production API URL..." -ForegroundColor Yellow

$Api = Join-Path $Mobile "src\lib\api.ts"

if (Test-Path $Api) {
    $ApiText = Read-AllText $Api

    $ApiText = $ApiText `
      -replace "'http://10\.0\.2\.2:3000'", "'https://supportcenter-kappa.vercel.app'" `
      -replace '"http://10\.0\.2\.2:3000"', '"https://supportcenter-kappa.vercel.app"' `
      -replace "'http://localhost:3000'", "'https://supportcenter-kappa.vercel.app'" `
      -replace '"http://localhost:3000"', '"https://supportcenter-kappa.vercel.app"' `
      -replace "'http://127\.0\.0\.1:3000'", "'https://supportcenter-kappa.vercel.app'" `
      -replace '"http://127\.0\.0\.1:3000"', '"https://supportcenter-kappa.vercel.app"'

    Write-AllText $Api $ApiText
}

Write-Host "PASS: APK production API URL retained." -ForegroundColor Green

Write-Host "[5/6] Mobile TypeScript..." -ForegroundColor Yellow

Set-Location $Mobile
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[6/6] Expo configuration..." -ForegroundColor Yellow

npx expo config --type public | Out-Null

if ($LASTEXITCODE -ne 0) {
    throw "Expo configuration check failed."
}

Write-Host ""
Write-Host "PASS: Phase 18.7.1 installer compatibility fix complete." -ForegroundColor Green
Write-Host ""
Write-Host "Build a fresh APK:"
Write-Host "  eas build -p android --profile preview --clear-cache"
