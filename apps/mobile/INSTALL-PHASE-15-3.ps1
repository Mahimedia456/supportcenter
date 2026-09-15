$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 15.3 Profile SignOut Collision Fix" -ForegroundColor Cyan
Write-Host "Fixes duplicate signOut identifier and completes final TypeScript verification"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"
$Profile = Join-Path $Mobile "src\app\profile.tsx"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }
if (-not (Test-Path $Profile)) { throw "Profile screen not found: $Profile" }

Write-Host "[1/4] Patching duplicate signOut function..." -ForegroundColor Yellow

$content = Get-Content $Profile -Raw

# Preserve AuthContext's signOut method:
# const { session, signOut } = useAuth();
#
# Rename only the local wrapper function.
$content = $content -replace `
    "async\s+function\s+signOut\s*\(\s*\)\s*\{", `
    "async function handleSignOut() {"

# Change button callback from the local signOut wrapper to handleSignOut.
$content = $content -replace `
    "onPress=\{signOut\}", `
    "onPress={handleSignOut}"

Set-Content -Path $Profile -Value $content -Encoding UTF8

$verify = Get-Content $Profile -Raw

if ($verify -notmatch "const\s+\{\s*session\s*,\s*signOut\s*\}\s*=\s*useAuth\(\)") {
    Write-Host "AuthContext signOut destructuring differs from expected formatting; continuing with TypeScript verification." -ForegroundColor DarkYellow
}

if ($verify -notmatch "async\s+function\s+handleSignOut\s*\(") {
    throw "Local handleSignOut function was not created."
}

Write-Host "PASS: profile signOut collision patched." -ForegroundColor Green

Write-Host "[2/4] Verifying installed final dependencies..." -ForegroundColor Yellow
Set-Location $Mobile

npm ls `
  @expo/vector-icons `
  expo-linear-gradient `
  react-native-reanimated `
  react-native-worklets `
  react-native-safe-area-context `
  --depth=0

if ($LASTEXITCODE -ne 0) {
    throw "Final dependency verification failed."
}

Write-Host "[3/4] Mobile TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[4/4] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host ""
Write-Host "PASS: Phase 15.3 final hotfix complete." -ForegroundColor Green
Write-Host ""
Write-Host "No previous Phase 15 installer needs to be rerun." -ForegroundColor DarkYellow
Write-Host ""
Write-Host "Start backend:"
Write-Host "  cd E:\Supportcenter\backend"
Write-Host "  npm run start:dev"
Write-Host ""
Write-Host "Start mobile clean:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
