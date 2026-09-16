$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 22.3.4 Hard Remove Vercel Type References" -ForegroundColor Cyan

$Mobile = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Backend = Join-Path $Root "backend"
$ApiDir = Join-Path $Backend "api"

function Read-AllText([string]$Path) {
    return [System.IO.File]::ReadAllText($Path)
}

function Write-AllText([string]$Path, [string]$Content) {
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

Write-Host "[1/6] Hard-cleaning all backend/api TypeScript files..." -ForegroundColor Yellow

$Files = Get-ChildItem -Path $ApiDir -Filter "*.ts" -File -Recurse
$Patched = 0

foreach ($File in $Files) {
    $Text = Read-AllText $File.FullName
    $Original = $Text

    # Remove any single-line import/reference containing @vercel/node.
    $Lines = $Text -split "`r?`n"
    $CleanLines = New-Object System.Collections.Generic.List[string]

    $SkippingImportBlock = $false

    foreach ($Line in $Lines) {
        if ($SkippingImportBlock) {
            if ($Line -match "from\s*['""]@vercel/node['""]" -or $Line -match "['""]@vercel/node['""]") {
                $SkippingImportBlock = $false
                continue
            }

            if ($Line -match ";\s*$") {
                $SkippingImportBlock = $false
            }

            continue
        }

        if ($Line -match "^\s*import\b" -and $Line -match "@vercel/node") {
            continue
        }

        if ($Line -match "^\s*import\b" -and $Line -notmatch "from\s*['""]") {
            if ($Line -match "VercelRequest|VercelResponse") {
                $SkippingImportBlock = $true
                continue
            }
        }

        if ($Line -match "@vercel/node") {
            continue
        }

        $CleanLines.Add($Line)
    }

    $Text = [string]::Join("`r`n", $CleanLines)

    # Remove any remaining multiline import block that contains Vercel types.
    $Text = [regex]::Replace(
        $Text,
        "(?ms)import\s+(?:type\s+)?\{[^}]*VercelRequest[^}]*VercelResponse[^}]*\}\s*from\s*['""][^'""]+['""];\s*",
        ""
    )

    $Text = [regex]::Replace(
        $Text,
        "(?ms)import\s+(?:type\s+)?\{[^}]*VercelResponse[^}]*VercelRequest[^}]*\}\s*from\s*['""][^'""]+['""];\s*",
        ""
    )

    # Replace all type annotations/usages.
    $Text = $Text -replace "\bVercelRequest\b", "any"
    $Text = $Text -replace "\bVercelResponse\b", "any"

    if ($Text -ne $Original) {
        Write-AllText $File.FullName $Text
        $Patched++
        Write-Host "PATCHED: $($File.FullName)" -ForegroundColor DarkGray
    }
}

Write-Host "PASS: hard cleanup processed $($Files.Count) API files; patched $Patched." -ForegroundColor Green

Write-Host "[2/6] Verifying no @vercel/node text remains..." -ForegroundColor Yellow

$RemainingVercelNode = @()

foreach ($File in $Files) {
    $Text = Read-AllText $File.FullName

    if ($Text -match "@vercel/node") {
        $RemainingVercelNode += $File.FullName
    }
}

if ($RemainingVercelNode.Count -gt 0) {
    Write-Host "Remaining @vercel/node references:" -ForegroundColor Red
    $RemainingVercelNode | ForEach-Object {
        Write-Host $_ -ForegroundColor Red
    }
    throw "@vercel/node still exists after hard cleanup."
}

Write-Host "PASS: zero @vercel/node references remain." -ForegroundColor Green

Write-Host "[3/6] Verifying no VercelRequest/VercelResponse symbols remain..." -ForegroundColor Yellow

$RemainingTypes = @()

foreach ($File in $Files) {
    $Text = Read-AllText $File.FullName

    if ($Text -match "\bVercelRequest\b|\bVercelResponse\b") {
        $RemainingTypes += $File.FullName
    }
}

if ($RemainingTypes.Count -gt 0) {
    Write-Host "Remaining Vercel type symbols:" -ForegroundColor Red
    $RemainingTypes | ForEach-Object {
        Write-Host $_ -ForegroundColor Red
    }
    throw "Vercel request/response symbols still exist."
}

Write-Host "PASS: zero VercelRequest/VercelResponse symbols remain." -ForegroundColor Green

Write-Host "[4/6] Showing diagnose file first 20 lines..." -ForegroundColor Yellow

$Diagnose = Join-Path $ApiDir "zendesk-diagnose.ts"

if (Test-Path $Diagnose) {
    Get-Content $Diagnose -TotalCount 20
}

Write-Host "[5/6] Backend TypeScript..." -ForegroundColor Yellow

Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript failed."
}

Write-Host "[6/6] Backend production build..." -ForegroundColor Yellow

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Backend production build failed."
}

Write-Host ""
Write-Host "PASS: Phase 22.3.4 hard cleanup complete." -ForegroundColor Green
Write-Host "Safe to commit and push."
