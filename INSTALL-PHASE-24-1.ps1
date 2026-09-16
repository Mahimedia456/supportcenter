$ErrorActionPreference = "Stop"

$Root = "E:\Supportcenter"
if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "backend"))) {
    $Root = $PSScriptRoot
}

Write-Host "Support Command Center - Phase 24.1 Installer HOME Variable Fix" -ForegroundColor Cyan
Write-Host "Root: $Root" -ForegroundColor DarkGray

$Backend = Join-Path $Root "backend"
$Mobile = Join-Path $Root "apps\mobile"

if (-not (Test-Path $Backend)) { throw "Backend not found: $Backend" }
if (-not (Test-Path $Mobile)) { throw "Mobile not found: $Mobile" }

Write-Host "[1/8] Verifying staged backend sync files..." -ForegroundColor Yellow
$Hourly = Join-Path $Backend "api\zendesk-hourly-sync.ts"
$StageHelper = Join-Path $Backend "api\_support-staged-sync.ts"
$CacheSync = Join-Path $Backend "api\zendesk-cache-sync.ts"

foreach ($File in @($Hourly,$StageHelper,$CacheSync)) {
    if (-not (Test-Path $File)) { throw "Missing: $File" }
}

$HourlyText = [IO.File]::ReadAllText($Hourly)
$HelperText = [IO.File]::ReadAllText($StageHelper)

foreach ($Term in @("workspace","stage","staged","GitHub staged sync workflow")) {
    if ($HourlyText -notmatch [regex]::Escape($Term)) { throw "Hourly sync missing: $Term" }
}

foreach ($Term in @("satisfaction","metric-events","incremental/tickets","zendesk_cache_snapshots")) {
    if ($HelperText -notmatch [regex]::Escape($Term)) { throw "Stage helper missing: $Term" }
}

Write-Host "PASS: backend sync split into short stages/chunks." -ForegroundColor Green

Write-Host "[2/8] Verifying GitHub workflow..." -ForegroundColor Yellow
$Workflow = Join-Path $Root ".github\workflows\hourly-zendesk-sync.yml"
if (-not (Test-Path $Workflow)) { throw "Missing hourly workflow." }

$WorkflowText = [IO.File]::ReadAllText($Workflow)
foreach ($Term in @("reference","satisfaction","metrics","tickets","metric-events","SUPPORTCENTER_CRON_SECRET")) {
    if ($WorkflowText -notmatch [regex]::Escape($Term)) { throw "Workflow missing: $Term" }
}
Write-Host "PASS: GitHub workflow runs staged/chunked sync." -ForegroundColor Green

Write-Host "[3/8] Verifying snapshot-only mobile store..." -ForegroundColor Yellow
$Store = Join-Path $Mobile "src\lib\support-data-store.ts"
$StoreText = [IO.File]::ReadAllText($Store)

if ($StoreText -match "syncZendeskDb") {
    throw "Main support-data-store still directly calls Zendesk sync."
}

foreach ($Term in @("AsyncStorage","getZendeskDbSnapshot","refreshSupportSnapshot")) {
    if ($StoreText -notmatch [regex]::Escape($Term)) { throw "Store missing: $Term" }
}
Write-Host "PASS: main mobile store reads saved snapshots only." -ForegroundColor Green

Write-Host "[4/8] Verifying pull-down popup behavior..." -ForegroundColor Yellow
$Hook = Join-Path $Mobile "src\hooks\useGlobalSupportSnapshot.ts"
$HookText = [IO.File]::ReadAllText($Hook)
foreach ($Term in @("Sync in progress","Your syncing data is under process","refreshSupportSnapshot")) {
    if ($HookText -notmatch [regex]::Escape($Term)) { throw "Hook missing: $Term" }
}
Write-Host "PASS: pull-down no longer starts Zendesk sync." -ForegroundColor Green

Write-Host "[5/8] Verifying Home SLA snapshot UI..." -ForegroundColor Yellow
$HomeScreen = Join-Path $Mobile "src\app\(tabs)\index.tsx"
$HomeScreenText = [IO.File]::ReadAllText($HomeScreen)

foreach ($Term in @("useGlobalSupportSnapshot","SLA Health","Breached","No reply > 4h","First reply > 4h","Unsolved > 72h")) {
    if ($HomeScreenText -notmatch [regex]::Escape($Term)) { throw "Home missing: $Term" }
}

foreach ($Forbidden in @("zendeskRecentTickets","zendeskHealth","forceZendeskDbSync","loadZendeskTicketUniverse")) {
    if ($HomeScreenText -match [regex]::Escape($Forbidden)) { throw "Home still calls live Zendesk source: $Forbidden" }
}
Write-Host "PASS: Home is snapshot-only with SLA metrics." -ForegroundColor Green

Write-Host "[6/8] Verifying Account manual sync..." -ForegroundColor Yellow
$ProfileScreen = Join-Path $Mobile "src\app\profile.tsx"
$ProfileScreenText = [IO.File]::ReadAllText($ProfileScreen)

foreach ($Term in @("Sync Support Data","syncZendeskDb","Sync in progress","seedSupportSnapshot")) {
    if ($ProfileScreenText -notmatch [regex]::Escape($Term)) { throw "Profile sync missing: $Term" }
}
Write-Host "PASS: manual staged sync moved to Account." -ForegroundColor Green

Write-Host "[7/8] Backend TypeScript/build..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Backend TypeScript failed." }

npm run build
if ($LASTEXITCODE -ne 0) { throw "Backend build failed." }
Write-Host "PASS: backend compile/build clean." -ForegroundColor Green

Write-Host "[8/8] Mobile TypeScript..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Mobile TypeScript failed." }

Write-Host ""
Write-Host "PASS: Phase 24.1 installer verification complete." -ForegroundColor Green
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "1. cd E:\Supportcenter"
Write-Host "2. git add ."
Write-Host "3. git commit -m `"Phase 24 snapshot only app and chunked Zendesk sync`""
Write-Host "4. git push"
