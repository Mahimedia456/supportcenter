$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 22.3.2 Vercel Type Import Fix" -ForegroundColor Cyan

$Mobile = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Backend = Join-Path $Root "backend"

function Read-AllText([string]$Path) {
    return [System.IO.File]::ReadAllText($Path)
}

function Write-AllText([string]$Path, [string]$Content) {
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

Write-Host "[1/4] Removing @vercel/node type-only dependency..." -ForegroundColor Yellow

$Files = @(
    "api\zendesk-cache-snapshot.ts",
    "api\zendesk-cache-sync.ts",
    "api\zendesk-hourly-sync.ts"
)

foreach ($Relative in $Files) {
    $Path = Join-Path $Backend $Relative

    if (-not (Test-Path $Path)) {
        throw "Missing API file: $Relative"
    }

    $Text = Read-AllText $Path

    $Text = [regex]::Replace(
        $Text,
        "import\s+type\s*\{\s*VercelRequest\s*,\s*VercelResponse\s*\}\s*from\s*['""]@vercel/node['""];\s*",
        ""
    )

    $Text = $Text `
      -replace "req:\s*VercelRequest", "req: any" `
      -replace "res:\s*VercelResponse", "res: any"

    Write-AllText $Path $Text
}

Write-Host "PASS: @vercel/node imports removed from direct API files." -ForegroundColor Green

Write-Host "[2/4] Verifying no direct API file still imports @vercel/node..." -ForegroundColor Yellow

foreach ($Relative in $Files) {
    $Path = Join-Path $Backend $Relative
    $Text = Read-AllText $Path

    if ($Text -match "@vercel/node") {
        throw "@vercel/node still referenced in $Relative"
    }
}

Write-Host "PASS: no @vercel/node dependency remains in Phase 22 API files." -ForegroundColor Green

Write-Host "[3/4] Backend TypeScript..." -ForegroundColor Yellow

Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript failed."
}

Write-Host "[4/4] Backend production build..." -ForegroundColor Yellow

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Backend production build failed."
}

Write-Host ""
Write-Host "PASS: Phase 22.3.2 Vercel Type Import Fix complete." -ForegroundColor Green
Write-Host "Now commit/push and let Vercel redeploy."
