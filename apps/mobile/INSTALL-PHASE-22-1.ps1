$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 22.1 Route + Month Filter Fix" -ForegroundColor Cyan

$Mobile = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Backend = Join-Path $Root "backend"

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

Write-Host "[1/7] Registering Zendesk cache controller/service..." -ForegroundColor Yellow

$ModulePath = Join-Path $Backend "src\app.module.ts"
$ModuleText = Read-AllText $ModulePath

if ($ModuleText -notmatch "zendesk-cache.controller") {
    $Import = "import { ZendeskCacheController } from './zendesk/zendesk-cache.controller';`r`n"
    $AtModule = $ModuleText.IndexOf("@Module")
    if ($AtModule -lt 0) {
        throw "@Module not found in backend app.module.ts"
    }

    $ModuleText = $ModuleText.Insert($AtModule, $Import)
}

if ($ModuleText -notmatch "zendesk-cache.service") {
    $Import = "import { ZendeskCacheService } from './zendesk/zendesk-cache.service';`r`n"
    $AtModule = $ModuleText.IndexOf("@Module")
    $ModuleText = $ModuleText.Insert($AtModule, $Import)
}

if ($ModuleText -notmatch "controllers\s*:\s*\[[^\]]*ZendeskCacheController") {
    $ModuleText = [regex]::Replace(
        $ModuleText,
        "controllers\s*:\s*\[",
        "controllers: [`r`n    ZendeskCacheController,",
        1
    )
}

if ($ModuleText -notmatch "providers\s*:\s*\[[^\]]*ZendeskCacheService") {
    $ModuleText = [regex]::Replace(
        $ModuleText,
        "providers\s*:\s*\[",
        "providers: [`r`n    ZendeskCacheService,",
        1
    )
}

Write-AllText $ModulePath $ModuleText

Write-Host "PASS: Zendesk cache route is registered in Nest AppModule." -ForegroundColor Green

Write-Host "[2/7] Verifying cache controller/service files..." -ForegroundColor Yellow

foreach ($Relative in @(
    "src\zendesk\zendesk-cache.controller.ts",
    "src\zendesk\zendesk-cache.service.ts"
)) {
    $Path = Join-Path $Backend $Relative
    if (-not (Test-Path $Path)) {
        throw "Missing Phase 19 backend file: $Relative"
    }
}

Write-Host "PASS: Cache backend files present." -ForegroundColor Green

Write-Host "[3/7] Verifying cache routes..." -ForegroundColor Yellow

$ControllerPath = Join-Path $Backend "src\zendesk\zendesk-cache.controller.ts"
$ControllerText = Read-AllText $ControllerPath

foreach ($Term in @("zendesk/cache", "snapshot", "sync")) {
    if ($ControllerText -notmatch [regex]::Escape($Term)) {
        throw "Cache controller missing: $Term"
    }
}

Write-Host "PASS: GET snapshot + POST sync routes defined." -ForegroundColor Green

Write-Host "[4/7] Verifying month filters..." -ForegroundColor Yellow

$FilterPath = Join-Path $Mobile "src\components\SupportPeriodFilter.tsx"
$FilterText = Read-AllText $FilterPath

foreach ($Term in @("month0", "month1", "month2", "90D")) {
    if ($FilterText -notmatch $Term) {
        throw "Missing filter: $Term"
    }
}

Write-Host "PASS: current month + previous 2 months + 90D filters ready." -ForegroundColor Green

Write-Host "[5/7] Backend TypeScript..." -ForegroundColor Yellow

Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript failed."
}

Write-Host "[6/7] Mobile TypeScript..." -ForegroundColor Yellow

Set-Location $Mobile
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript failed."
}

Write-Host "[7/7] Complete." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Phase 22.1 Route + Month Filter Fix installed." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Backend AppModule changed. Git push + Vercel redeploy is mandatory."
Write-Host "After deploy, pull down once on Insights or Devices to populate the shared 90-day snapshot."
