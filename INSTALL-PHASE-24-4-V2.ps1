param(
    [string]$ProjectRoot = "E:\Supportcenter"
)

$ErrorActionPreference = "Stop"

$PatchRoot = $PSScriptRoot
$Backend = Join-Path $ProjectRoot "backend"
$Mobile = Join-Path $ProjectRoot "apps\mobile"

Write-Host "Support Command Center - Phase 24.4 Installer V2" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot" -ForegroundColor DarkGray
Write-Host "Source : $PatchRoot" -ForegroundColor DarkGray

if (-not (Test-Path $Backend)) { throw "Backend not found: $Backend" }
if (-not (Test-Path $Mobile)) { throw "Mobile not found: $Mobile" }

$ProjectFull = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\')
$PatchFull = [IO.Path]::GetFullPath($PatchRoot).TrimEnd('\')

$Copies = @(
    @{ From = ".\backend\sql\PHASE_24_4_TICKET_CONVERSATION_SNAPSHOT.sql"; To = "backend\sql\PHASE_24_4_TICKET_CONVERSATION_SNAPSHOT.sql" },
    @{ From = ".\backend\tools\apply-phase24-4-conversation-cache.cjs"; To = "backend\tools\apply-phase24-4-conversation-cache.cjs" },
    @{ From = ".\backend\api\_support-staged-sync.ts"; To = "backend\api\_support-staged-sync.ts" },
    @{ From = ".\backend\api\zendesk-hourly-sync.ts"; To = "backend\api\zendesk-hourly-sync.ts" },
    @{ From = ".\backend\api\zendesk-cache-sync.ts"; To = "backend\api\zendesk-cache-sync.ts" },
    @{ From = ".\backend\api\zendesk-ticket-conversation.ts"; To = "backend\api\zendesk-ticket-conversation.ts" },
    @{ From = ".\.github\workflows\hourly-zendesk-sync.yml"; To = ".github\workflows\hourly-zendesk-sync.yml" },
    @{ From = ".\apps\mobile\src\lib\zendesk-db.ts"; To = "apps\mobile\src\lib\zendesk-db.ts" },
    @{ From = ".\apps\mobile\src\lib\zendesk-comment-text.ts"; To = "apps\mobile\src\lib\zendesk-comment-text.ts" },
    @{ From = ".\apps\mobile\src\app\ticket\[id].tsx"; To = "apps\mobile\src\app\ticket\[id].tsx" }
)

Write-Host "[1/5] Preparing files..." -ForegroundColor Yellow

if ($PatchFull -ieq $ProjectFull) {
    Write-Host "Patch is already merged into project root. Copy step skipped." -ForegroundColor Yellow

    foreach ($Item in $Copies) {
        $Existing = Join-Path $ProjectRoot $Item.To

        if (-not (Test-Path -LiteralPath $Existing)) {
            throw "Required Phase 24.4 file missing: $($Item.To)"
        }

        Write-Host "FOUND: $($Item.To)" -ForegroundColor Green
    }
}
else {
    foreach ($Item in $Copies) {
        $From = Join-Path $PatchRoot $Item.From
        $To = Join-Path $ProjectRoot $Item.To

        if (-not (Test-Path -LiteralPath $From)) {
            throw "Patch file missing: $From"
        }

        $Dir = Split-Path $To -Parent
        New-Item -ItemType Directory -Force -Path $Dir | Out-Null

        $FromFull = [IO.Path]::GetFullPath($From)
        $ToFull = [IO.Path]::GetFullPath($To)

        if ($FromFull -ieq $ToFull) {
            Write-Host "SKIP SELF-COPY: $($Item.To)" -ForegroundColor Yellow
            continue
        }

        Copy-Item -LiteralPath $From -Destination $To -Force
        Write-Host "UPDATED: $($Item.To)" -ForegroundColor Green
    }
}

Write-Host "[2/5] Applying conversation snapshot SQL..." -ForegroundColor Yellow
Set-Location $Backend
node ".\tools\apply-phase24-4-conversation-cache.cjs"
if ($LASTEXITCODE -ne 0) {
    throw "Database migration failed. Check backend .env SUPABASE_DATABASE_URL."
}
Write-Host "PASS: conversation snapshot table ready." -ForegroundColor Green

Write-Host "[3/5] Backend TypeScript + build..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Backend TypeScript failed." }

npm run build
if ($LASTEXITCODE -ne 0) { throw "Backend build failed." }

Write-Host "PASS: backend build clean." -ForegroundColor Green

Write-Host "[4/5] Mobile TypeScript..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Mobile TypeScript failed." }

Write-Host "PASS: mobile TypeScript clean." -ForegroundColor Green

Write-Host "[5/5] Verifying Phase 24.4 wiring..." -ForegroundColor Yellow

$TicketText = Get-Content -LiteralPath (Join-Path $Mobile "src\app\ticket\[id].tsx") -Raw
$StageText = Get-Content -LiteralPath (Join-Path $Backend "api\_support-staged-sync.ts") -Raw
$WorkflowText = Get-Content -LiteralPath (Join-Path $ProjectRoot ".github\workflows\hourly-zendesk-sync.yml") -Raw

foreach ($Term in @(
    "getZendeskTicketConversationSnapshot",
    "Cached from Zendesk snapshot",
    "INTERNAL NOTE",
    "PUBLIC"
)) {
    if ($TicketText -notmatch [regex]::Escape($Term)) {
        throw "Ticket detail verification missing: $Term"
    }
}

foreach ($Term in @(
    "zendesk_ticket_conversation_snapshots",
    "stage==='conversations'",
    "/comments.json"
)) {
    if ($StageText -notmatch [regex]::Escape($Term)) {
        throw "Backend conversation sync verification missing: $Term"
    }
}

if ($WorkflowText -notmatch "conversations chunk") {
    throw "GitHub workflow conversation stage missing."
}

Write-Host ""
Write-Host "PASS: Phase 24.4 installed and verified." -ForegroundColor Green
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "1. git add ."
Write-Host '2. git commit -m "Add ticket conversation snapshots"'
Write-Host "3. git push"
Write-Host "4. Wait for Vercel deployment."
Write-Host "5. Run GitHub Actions -> Hourly Zendesk Snapshot Sync -> Run workflow once."
Write-Host "6. Rebuild EAS preview APK."
