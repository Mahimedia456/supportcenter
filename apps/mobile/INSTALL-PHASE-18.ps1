$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 18 FINAL Zendesk OAuth" -ForegroundColor Cyan
Write-Host "OAuth code flow, refresh token persistence, full Zendesk data, login keyboard scroll"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }

Write-Host "[1/7] Applying Zendesk OAuth token table..." -ForegroundColor Yellow
Set-Location $Backend

$SqlPath = Join-Path $Backend "PHASE_18_ZENDESK_OAUTH.sql"
if (-not (Test-Path $SqlPath)) {
    throw "Missing Phase 18 SQL migration."
}

node -e @'
require("dotenv").config();
const fs=require("fs");
const {Pool}=require("pg");
(async()=>{
  const raw=(process.env.SUPABASE_DATABASE_URL||"").trim();
  if(!raw) throw new Error("SUPABASE_DATABASE_URL missing");
  const u=new URL(raw);
  u.searchParams.delete("sslmode");
  u.searchParams.delete("uselibpqcompat");
  const pool=new Pool({
    connectionString:u.toString(),
    ssl:{rejectUnauthorized:false},
    max:1,
    connectionTimeoutMillis:15000
  });
  try{
    const sql=fs.readFileSync("PHASE_18_ZENDESK_OAUTH.sql","utf8");
    await pool.query(sql);
    console.log("PASS: zendesk_oauth_tokens schema ready");
  } finally {
    await pool.end();
  }
})().catch(e=>{console.error(e);process.exit(1)});
'@

if ($LASTEXITCODE -ne 0) {
    throw "OAuth schema migration failed."
}

Write-Host "[2/7] Backend TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[3/7] Verifying OAuth routes..." -ForegroundColor Yellow
$OauthController = Join-Path $Backend "src\zendesk\zendesk-oauth.controller.ts"
$OauthService = Join-Path $Backend "src\zendesk\zendesk-oauth.service.ts"

if (-not (Test-Path $OauthController)) { throw "OAuth controller missing." }
if (-not (Test-Path $OauthService)) { throw "OAuth service missing." }

Write-Host "[4/7] Mobile TypeScript check..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[5/7] Verifying Home All filter..." -ForegroundColor Yellow
$Overview = Join-Path $Mobile "src\app\(tabs)\index.tsx"
if ((Get-Content $Overview -Raw) -notmatch "label:\s*'All'") {
    throw "Home All period is missing."
}

Write-Host "[6/7] Verifying login keyboard scroll..." -ForegroundColor Yellow
$Login = Join-Path $Mobile "src\app\(auth)\login.tsx"
$LoginText = Get-Content $Login -Raw

if ($LoginText -notmatch "scrollToEnd") {
    throw "Login password keyboard scroll fix missing."
}

Write-Host "[7/7] Complete." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Phase 18 FINAL Zendesk OAuth installed." -ForegroundColor Green
Write-Host ""
Write-Host "Next:"
Write-Host "1. Add OAuth env vars to Vercel."
Write-Host "2. git add/commit/push and redeploy backend."
Write-Host "3. Open:"
Write-Host "   https://supportcenter-kappa.vercel.app/zendesk/oauth/atomos/start"
Write-Host "4. Approve Zendesk access as the Atomos admin."
Write-Host "5. Check:"
Write-Host "   https://supportcenter-kappa.vercel.app/zendesk/oauth/atomos/status"
Write-Host "6. Restart mobile with npx expo start -c"
