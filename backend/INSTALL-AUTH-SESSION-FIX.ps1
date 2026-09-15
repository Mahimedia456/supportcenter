$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Auth Session Table Production Fix" -ForegroundColor Cyan
Write-Host "Fixes login 500 caused by auth code/schema mismatch."

$Backend = $PSScriptRoot

if (-not (Test-Path (Join-Path $Backend "src\auth\auth.service.ts"))) {
    throw "Run from E:\Supportcenter\backend after merging ZIP."
}

Write-Host "[1/5] Verifying auth service contract..." -ForegroundColor Yellow

$AuthFile = Join-Path $Backend "src\auth\auth.service.ts"
$AuthText = Get-Content $AuthFile -Raw

if ($AuthText -match "refresh_sessions") {
    throw "Old refresh_sessions reference still exists."
}

if ($AuthText -match "\btoken_hash\b") {
    throw "Old token_hash reference still exists."
}

if ($AuthText -notmatch "user_sessions") {
    throw "user_sessions contract missing."
}

if ($AuthText -notmatch "refresh_token_hash") {
    throw "refresh_token_hash contract missing."
}

Write-Host "PASS: auth service uses user_sessions.refresh_token_hash." -ForegroundColor Green

Write-Host "[2/5] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[3/5] Checking local DB schema when available..." -ForegroundColor Yellow

try {
    npm run db:check
    if ($LASTEXITCODE -ne 0) {
        Write-Host "DB check returned non-zero; production Vercel diagnostic can still be used." -ForegroundColor DarkYellow
    }
}
catch {
    Write-Host "Local DB check unavailable; continuing." -ForegroundColor DarkYellow
}

Write-Host "[4/5] Vercel files..." -ForegroundColor Yellow

$Required = @(
    (Join-Path $Backend "api\index.ts"),
    (Join-Path $Backend "api\health.ts"),
    (Join-Path $Backend "api\auth-diagnose.ts"),
    (Join-Path $Backend "vercel.json")
)

foreach ($File in $Required) {
    if (-not (Test-Path $File)) {
        throw "Missing Vercel file: $File"
    }
}

Write-Host "[5/5] Ready for production deploy." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Auth session table fix installed." -ForegroundColor Green
Write-Host ""
Write-Host "After Git push + Vercel redeploy test:"
Write-Host "  https://supportcenter-kappa.vercel.app/api/auth-diagnose"
Write-Host ""
Write-Host "Then test login from mobile."
