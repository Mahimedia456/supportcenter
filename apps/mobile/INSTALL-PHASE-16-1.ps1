$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 16.1 AgentCard + Comment Formatting Fix" -ForegroundColor Cyan

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

$Insights = Join-Path $Mobile "src\app\(tabs)\insights.tsx"
$TicketDetail = Join-Path $Mobile "src\app\ticket\[id].tsx"

if (-not (Test-Path $Insights)) {
    throw "Insights screen not found: $Insights"
}

if (-not (Test-Path -LiteralPath $TicketDetail)) {
    throw "Ticket detail screen not found: $TicketDetail"
}

Write-Host "[1/4] Fixing AgentCard prop..." -ForegroundColor Yellow

$insightsText = Get-Content $Insights -Raw

$insightsText = $insightsText `
    -replace '(<AgentCard\s+key=\{a\.id\}\s+)agent=\{a\}', '$1row={a}'

Set-Content -Path $Insights -Value $insightsText -Encoding UTF8

$verifyInsights = Get-Content $Insights -Raw

if ($verifyInsights -match '<AgentCard[^>]*\sagent=\{a\}') {
    throw "AgentCard old agent prop is still present."
}

if ($verifyInsights -notmatch '<AgentCard[^>]*\srow=\{a\}') {
    throw "AgentCard row prop was not applied."
}

Write-Host "PASS: AgentCard now uses row={a}." -ForegroundColor Green

Write-Host "[2/4] Fixing Zendesk comment formatting..." -ForegroundColor Yellow

$ticketText = Get-Content -LiteralPath $TicketDetail -Raw

if ($ticketText -notmatch "zendesk-comment-text") {
    $importAnchor = "import \* as api from '@/lib/api';"

    if ($ticketText -notmatch [regex]::Escape($importAnchor)) {
        throw "Could not find API import anchor in ticket detail."
    }

    $ticketText = $ticketText.Replace(
        $importAnchor,
        $importAnchor + "`r`nimport { zendeskCommentText } from '@/lib/zendesk-comment-text';"
    )
}

$oldExpression = "{comment.plain_body || comment.body || 'No text'}"
$newExpression = "{zendeskCommentText(comment.plain_body || comment.body)}"

if ($ticketText.Contains($oldExpression)) {
    $ticketText = $ticketText.Replace(
        $oldExpression,
        $newExpression
    )
}
elseif ($ticketText -notmatch "zendeskCommentText\(comment\.plain_body \|\| comment\.body\)") {
    throw "Could not find Zendesk comment body expression."
}

Set-Content -LiteralPath $TicketDetail -Value $ticketText -Encoding UTF8

$verifyTicket = Get-Content -LiteralPath $TicketDetail -Raw

if ($verifyTicket -notmatch "zendeskCommentText\(comment\.plain_body \|\| comment\.body\)") {
    throw "Zendesk comment formatter was not applied."
}

Write-Host "PASS: HTML entities and line breaks normalized." -ForegroundColor Green

Write-Host "[3/4] Mobile TypeScript check..." -ForegroundColor Yellow
Set-Location $Mobile

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
Write-Host "PASS: Phase 16.1 AgentCard + comment formatting fix complete." -ForegroundColor Green
Write-Host ""
Write-Host "Restart mobile:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
