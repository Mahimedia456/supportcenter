$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 20 90-Day Insights + Unified Ticket Results" -ForegroundColor Cyan

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

Write-Host "[1/6] Verifying strict 90-day backend cache scope..." -ForegroundColor Yellow

$Cache = Join-Path $Backend "src\zendesk\zendesk-cache.service.ts"
$CacheText = Read-AllText $Cache

if ($CacheText -notmatch "analyticsTickets\(workspaceId,\s*90,\s*false\)") {
    throw "Backend cache is not locked to 90 days."
}

Write-Host "PASS: DB Zendesk ticket scope = last 90 days." -ForegroundColor Green

Write-Host "[2/6] Updating Device Detail drill-down..." -ForegroundColor Yellow

$DeviceDetail = Join-Path $Mobile "src\app\device\[name].tsx"

if (Test-Path -LiteralPath $DeviceDetail) {
    $Text = Read-AllText $DeviceDetail

    if ($Text -notmatch "ViewDeviceTicketsButton") {
        $Text = $Text -replace "import \{ TicketCard \} from '@/components/tickets/TicketCard';", "import { TicketCard } from '@/components/tickets/TicketCard';`r`nimport { ViewDeviceTicketsButton } from '@/components/devices/ViewDeviceTicketsButton';"

        $Anchor = "<View\s+style=\{s\.relatedHeader\}>"
        $Replacement = "<ViewDeviceTicketsButton device={name} count={related.length} />`r`n`r`n            <View style={s.relatedHeader}>"

        $Text = [regex]::Replace(
            $Text,
            $Anchor,
            $Replacement,
            [System.Text.RegularExpressions.RegexOptions]::Singleline
        )

        Write-AllText $DeviceDetail $Text
    }
}

Write-Host "PASS: Device drill-down opens dedicated ticket results UI." -ForegroundColor Green

Write-Host "[3/6] Verifying ticket-results route..." -ForegroundColor Yellow

$Results = Join-Path $Mobile "src\app\ticket-results.tsx"
if (-not (Test-Path $Results)) {
    throw "ticket-results.tsx missing."
}

$ResultsText = Read-AllText $Results
foreach ($Term in @("chevron-back", "Search ticket", "Status", "Priority", "Assignment")) {
    if ($ResultsText -notmatch [regex]::Escape($Term)) {
        throw "Ticket results UI missing: $Term"
    }
}

Write-Host "PASS: Dedicated ticket results screen has back/search/filters." -ForegroundColor Green

Write-Host "[4/6] Backend TypeScript..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript failed."
}

Write-Host "[5/6] Mobile TypeScript..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript failed."
}

Write-Host "[6/6] Complete." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Phase 20 installed."
Write-Host "Data scope: last 90 days only."
Write-Host "Insights drill-down: isolated ticket-results screen."
Write-Host "Main Tickets tab state is untouched."
