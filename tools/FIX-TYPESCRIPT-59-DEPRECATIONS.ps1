$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - TypeScript 5.9 Deprecation Fix" -ForegroundColor Cyan
Write-Host "Suppresses TS 6.0 migration diagnostics without changing current module behavior."

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$Targets = @(
    (Join-Path $Root "apps\mobile\tsconfig.json"),
    (Join-Path $Root "backend\tsconfig.json")
)

function Patch-TsConfig {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        throw "tsconfig not found: $Path"
    }

    Write-Host "Patching: $Path" -ForegroundColor Yellow

    $text = Get-Content $Path -Raw

    if ($text -match '"ignoreDeprecations"\s*:') {
        $text = [regex]::Replace(
            $text,
            '"ignoreDeprecations"\s*:\s*"[^"]+"',
            '"ignoreDeprecations": "6.0"'
        )
    }
    else {
        $compilerOptionsPattern = '"compilerOptions"\s*:\s*\{'

        if ($text -notmatch $compilerOptionsPattern) {
            throw "compilerOptions block not found in: $Path"
        }

        $text = [regex]::Replace(
            $text,
            $compilerOptionsPattern,
            '"compilerOptions": {' + "`r`n    " + '"ignoreDeprecations": "6.0",',
            1
        )
    }

    Set-Content -Path $Path -Value $text -Encoding UTF8

    $verify = Get-Content $Path -Raw
    if ($verify -notmatch '"ignoreDeprecations"\s*:\s*"6\.0"') {
        throw "ignoreDeprecations patch failed for: $Path"
    }

    Write-Host "PASS: ignoreDeprecations=6.0" -ForegroundColor Green
}

foreach ($target in $Targets) {
    Patch-TsConfig -Path $target
}

Write-Host ""
Write-Host "[1/2] Mobile TypeScript verification..." -ForegroundColor Yellow
Set-Location (Join-Path $Root "apps\mobile")
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[2/2] Backend TypeScript verification..." -ForegroundColor Yellow
Set-Location (Join-Path $Root "backend")
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host ""
Write-Host "PASS: TypeScript 5.9 deprecation diagnostics fixed." -ForegroundColor Green
Write-Host ""
Write-Host "If VS Code still shows old Problems, run:"
Write-Host "  Ctrl+Shift+P -> TypeScript: Restart TS Server"
