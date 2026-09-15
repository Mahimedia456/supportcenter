$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 05.4 NestJS Env Runtime Fix" -ForegroundColor Cyan

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"
$MainTs = Join-Path $Backend "src\main.ts"
$DbService = Join-Path $Backend "src\database\database.service.ts"
$EnvFile = Join-Path $Backend ".env"

Write-Host "Resolved project root: $Root" -ForegroundColor DarkGray

if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }
if (-not (Test-Path $MainTs)) { throw "Nest main.ts not found: $MainTs" }
if (-not (Test-Path $EnvFile)) { throw "Backend .env not found: $EnvFile" }

function Ensure-DotenvImport([string]$FilePath) {
    $content = Get-Content $FilePath -Raw
    if ($content -notmatch "import\s+['""]dotenv/config['""];") {
        Set-Content -Path $FilePath -Value ("import 'dotenv/config';`r`n" + $content) -Encoding UTF8
        Write-Host "Patched dotenv import: $FilePath" -ForegroundColor Green
    } else {
        Write-Host "dotenv import already present: $FilePath" -ForegroundColor DarkGray
    }
}

# Load dotenv at Nest bootstrap and also defensively in DatabaseService.
Ensure-DotenvImport $MainTs
if (Test-Path $DbService) {
    Ensure-DotenvImport $DbService
}

Set-Location $Backend

Write-Host "[1/3] Backend TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Backend TypeScript check failed." }

Write-Host "[2/3] Database connectivity check..." -ForegroundColor Yellow
npm run db:check
if ($LASTEXITCODE -ne 0) { throw "Database connectivity check failed." }

Write-Host "[3/3] Verifying .env runtime visibility..." -ForegroundColor Yellow
node -r dotenv/config -e "if(!process.env.SUPABASE_DATABASE_URL){process.exit(1)}; console.log('PASS: Nest runtime environment can read SUPABASE_DATABASE_URL')"
if ($LASTEXITCODE -ne 0) { throw "Runtime .env visibility check failed." }

Write-Host ""
Write-Host "PASS: Phase 05.4 runtime env fix complete." -ForegroundColor Green
Write-Host ""
Write-Host "NEXT:"
Write-Host "cd E:\Supportcenter\backend"
Write-Host "npm run seed:phase02"
Write-Host "npm run start:dev"
