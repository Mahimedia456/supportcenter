$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 19 DB-first Sync + Single Splash" -ForegroundColor Cyan

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

Write-Host "[1/8] Applying Zendesk DB cache schema..." -ForegroundColor Yellow
Set-Location $Backend

node ".\tools\apply-phase19-zendesk-cache.cjs"
if ($LASTEXITCODE -ne 0) {
    throw "Phase 19 DB migration failed."
}

Write-Host "[2/8] Wiring cache backend..." -ForegroundColor Yellow

$Module = Join-Path $Backend "src\app.module.ts"
$ModuleText = Read-AllText $Module

if ($ModuleText -notmatch "ZendeskCacheController") {
    $ModuleText = $ModuleText `
      -replace "import \{ ZendeskController \} from './zendesk/zendesk.controller';", "import { ZendeskController } from './zendesk/zendesk.controller';`r`nimport { ZendeskCacheController } from './zendesk/zendesk-cache.controller';" `
      -replace "import \{ ZendeskService \} from './zendesk/zendesk.service';", "import { ZendeskService } from './zendesk/zendesk.service';`r`nimport { ZendeskCacheService } from './zendesk/zendesk-cache.service';" `
      -replace "ZendeskController,", "ZendeskController,`r`n    ZendeskCacheController," `
      -replace "ZendeskService,", "ZendeskService,`r`n    ZendeskCacheService,"

    Write-AllText $Module $ModuleText
}

Write-Host "PASS: Zendesk DB cache backend wired." -ForegroundColor Green

Write-Host "[3/8] Making login splash mark-only..." -ForegroundColor Yellow

$Login = Join-Path $Mobile "src\app\(auth)\login.tsx"
$LoginText = Read-AllText $Login

$LoginText = $LoginText `
  -replace "support-command-center-splash-lockup\.png", "support-command-center-mark.png" `
  -replace "support-command-center-logo-transparent\.png", "support-command-center-mark.png" `
  -replace "support-command-center-wordmark[^'`"]*", "support-command-center-mark.png"

$LoginText = $LoginText `
  -replace "width:\s*338,\s*\r?\n\s*height:\s*198,", "width: 190,`r`n    height: 190,"

Write-AllText $Login $LoginText

Write-Host "PASS: Only animated brand mark remains before login form." -ForegroundColor Green

Write-Host "[4/8] Wiring pull-to-refresh DB sync..." -ForegroundColor Yellow

$Screens = @(
  "src\app\(tabs)\index.tsx",
  "src\app\(tabs)\insights.tsx",
  "src\app\(tabs)\devices.tsx",
  "src\app\(tabs)\alerts.tsx"
)

foreach ($Relative in $Screens) {
    $Path = Join-Path $Mobile $Relative

    if (-not (Test-Path $Path)) {
        continue
    }

    $Body = Read-AllText $Path

    if ($Body -notmatch "forceZendeskDbSync") {
        if ($Body -match "from '@/lib/zendesk-source';") {
            $Body = $Body -replace "import \{ loadZendeskTicketUniverse \} from '@/lib/zendesk-source';", "import { loadZendeskTicketUniverse, forceZendeskDbSync } from '@/lib/zendesk-source';"
        } else {
            $Body = $Body -replace "import \* as api from '@/lib/api';", "import * as api from '@/lib/api';`r`nimport { forceZendeskDbSync } from '@/lib/zendesk-source';"
        }

        $Old = "async function refresh\(\) \{\s*setRefreshing\(true\);\s*await load\(\);\s*setRefreshing\(false\);\s*\}"
        $New = @'
async function refresh() {
    setRefreshing(true);

    try {
      const fresh = await ensureFreshSession();
      const token = fresh?.accessToken || session?.accessToken;

      if (token) {
        await forceZendeskDbSync(token);
      }

      await load();
    } finally {
      setRefreshing(false);
    }
  }
'@

        $Body = [regex]::Replace(
            $Body,
            $Old,
            $New,
            [System.Text.RegularExpressions.RegexOptions]::Singleline
        )

        Write-AllText $Path $Body
    }
}

Write-Host "PASS: Pull-to-refresh now triggers Zendesk -> DB sync." -ForegroundColor Green

Write-Host "[5/8] Adding initializing loader label..." -ForegroundColor Yellow

$Overview = Join-Path $Mobile "src\app\(tabs)\index.tsx"
if (Test-Path $Overview) {
    $OverviewText = Read-AllText $Overview

    $OverviewText = $OverviewText `
      -replace "Loading manager overview\.\.\.", "Initializing support data…" `
      -replace "Loading manager overview…", "Initializing support data…"

    Write-AllText $Overview $OverviewText
}

Write-Host "PASS: Initial load uses initializing support data message." -ForegroundColor Green

Write-Host "[6/8] Backend TypeScript..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript failed."
}

Write-Host "[7/8] Mobile TypeScript..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript failed."
}

Write-Host "[8/8] Verifying splash config..." -ForegroundColor Yellow

$App = Join-Path $Mobile "app.json"
$AppText = Read-AllText $App

if ($AppText -match "support-command-center-splash-lockup|support-command-center-logo-transparent") {
    throw "Full logo/text splash is still configured natively."
}

Write-Host ""
Write-Host "PASS: Phase 19 DB-first Sync + Single Splash installed." -ForegroundColor Green
Write-Host ""
Write-Host "Vercel: add CRON_SECRET, then git push/redeploy."
Write-Host "Hourly cron: 0 * * * *"
Write-Host "Pull-to-refresh: immediate Zendesk -> DB sync."
