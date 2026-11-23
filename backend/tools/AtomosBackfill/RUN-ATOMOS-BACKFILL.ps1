param(
  [string]$RepoPath='E:\Supportcenter',
  [ValidateSet('Preflight','Run','Verify')][string]$Mode='Preflight'
)
$ErrorActionPreference='Stop'
$backend=Join-Path $RepoPath 'backend'
$script=Join-Path $PSScriptRoot 'run-backfill.ts'
if(-not (Test-Path -LiteralPath $script)){throw 'BACKFILL_SCRIPT_NOT_FOUND'}
if(-not (Test-Path -LiteralPath (Join-Path $backend 'api\_support-staged-sync.ts'))){throw 'BACKEND_STAGE_CODE_NOT_FOUND'}
if(-not (Test-Path -LiteralPath (Join-Path $backend 'node_modules\.bin\tsx.cmd'))){throw 'BACKEND_DEPENDENCIES_NOT_INSTALLED: cd backend; npm ci'}
# Never accidentally keep an inherited old Supabase URI over backend/.env.
Remove-Item Env:SUPABASE_DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:SUPABASE_URL -ErrorAction SilentlyContinue
# Prefer the official Supabase CA cert already provisioned for Phase 26.
$ca='E:\SupportCenter-P26-Certs\supabase-ca.crt'
if(Test-Path -LiteralPath $ca){$env:NODE_EXTRA_CA_CERTS=$ca}
# Do not disclose any credentials. Keep memory bounded for large JSONB metric events.
$previousNodeOptions=$env:NODE_OPTIONS
if($env:NODE_OPTIONS -notmatch '--max-old-space-size='){
    $env:NODE_OPTIONS=("$previousNodeOptions --max-old-space-size=3072").Trim()
}
$modeArg=switch($Mode){'Preflight'{'--preflight'}'Run'{'--run'}'Verify'{'--verify'}}
try{
  Push-Location $backend
  try {
    & (Join-Path $backend 'node_modules\.bin\tsx.cmd') $script $modeArg
    if($LASTEXITCODE -ne 0){throw "ATOMOS_BACKFILL_COMMAND_FAILED exit=$LASTEXITCODE"}
  } finally {Pop-Location}
} finally {$env:NODE_OPTIONS=$previousNodeOptions}
