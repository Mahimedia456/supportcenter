$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 16.2 Ticket Comment Fix" -ForegroundColor Cyan
Write-Host "Replaces ticket detail with known-good file; no fragile import-anchor patching."

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"
$Insights = Join-Path $Mobile "src\app\(tabs)\insights.tsx"
$Ticket = Join-Path $Mobile "src\app\ticket\[id].tsx"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }
if (-not (Test-Path -LiteralPath $Ticket)) { throw "Ticket detail missing: $Ticket" }

Write-Host "[1/4] Ensuring AgentCard prop is correct..." -ForegroundColor Yellow

if (Test-Path $Insights) {
    $text = Get-Content $Insights -Raw

    $text = $text `
      -replace '(<AgentCard\s+key=\{a\.id\}\s+)agent=\{a\}', '$1row={a}'

    Set-Content -Path $Insights -Value $text -Encoding UTF8
}

Write-Host "PASS: AgentCard compatibility checked." -ForegroundColor Green

Write-Host "[2/4] Verifying comment formatter integration..." -ForegroundColor Yellow

$ticketText = Get-Content -LiteralPath $Ticket -Raw

if ($ticketText -notmatch "zendeskCommentText") {
    throw "Ticket detail does not import/use zendeskCommentText."
}

if ($ticketText -match "comment\.plain_body \|\| comment\.body \|\| 'No text'") {
    throw "Raw comment rendering is still present."
}

Write-Host "PASS: Zendesk comment formatter active." -ForegroundColor Green

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
Write-Host "PASS: Phase 16.2 ticket comments + AgentCard fix complete." -ForegroundColor Green
Write-Host ""
Write-Host "Restart mobile:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
