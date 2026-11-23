param(
  [string]$RepoPath = 'E:\Supportcenter',
  [string]$CaCert = ''
)
$ErrorActionPreference = 'Stop'
$backend = Join-Path $RepoPath 'backend'
$packageJson = Join-Path $backend 'package.json'
$nodeScript = Join-Path $PSScriptRoot 'seed-shahid.cjs'
if (-not (Test-Path -LiteralPath $packageJson)) { throw 'BACKEND_NOT_FOUND' }
if (-not (Test-Path -LiteralPath (Join-Path $backend '.env'))) { throw 'BACKEND_ENV_NOT_FOUND' }
if (-not (Test-Path -LiteralPath (Join-Path $backend 'node_modules\pg'))) { throw 'BACKEND_NPM_MODULES_MISSING: run npm ci in backend' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'NODE_NOT_FOUND' }

$oldDb = [Environment]::GetEnvironmentVariable('SUPABASE_DATABASE_URL','Process')
$oldUrl = [Environment]::GetEnvironmentVariable('SUPABASE_URL','Process')
$oldCa = [Environment]::GetEnvironmentVariable('NODE_EXTRA_CA_CERTS','Process')
$oldBackend = [Environment]::GetEnvironmentVariable('SUPPORTCENTER_BACKEND_PATH','Process')
$ptr1 = [IntPtr]::Zero
$ptr2 = [IntPtr]::Zero
$newPass = $null
$confirm = $null
try {
  # Explicitly prefer backend/.env; ignore any stale inherited project overrides.
  Remove-Item Env:SUPABASE_DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_URL -ErrorAction SilentlyContinue
  $env:SUPPORTCENTER_BACKEND_PATH = $backend
  if ($CaCert) {
    if (-not (Test-Path -LiteralPath $CaCert)) { throw 'CA_CERT_NOT_FOUND' }
    $env:NODE_EXTRA_CA_CERTS = (Resolve-Path -LiteralPath $CaCert).Path
  } elseif (-not $oldCa) {
    $defaultCert = 'E:\SupportCenter-P26-Certs\supabase-ca.crt'
    if (Test-Path -LiteralPath $defaultCert) { $env:NODE_EXTRA_CA_CERTS = $defaultCert }
  }
  $s1 = Read-Host 'New Shahid APP login password (12+ chars)' -AsSecureString
  $s2 = Read-Host 'Confirm Shahid APP login password' -AsSecureString
  $ptr1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s1)
  $ptr2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s2)
  $newPass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr1)
  $confirm = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr2)
  if ($newPass -cne $confirm) { throw 'PASSWORD_CONFIRMATION_MISMATCH' }
  if ($newPass.Length -lt 12) { throw 'APP_PASSWORD_TOO_SHORT' }
  $confirm = $null
  # STDIN avoids passwords on command line, in environment variables, or in patch files.
  $newPass | & node $nodeScript
  if ($LASTEXITCODE -ne 0) { throw 'SHAHID_ACCOUNT_SEED_FAILED' }
  Write-Host 'SEED_SHAHID_COMPLETED: now test Vercel login with the new app password'
} finally {
  $newPass = $null
  $confirm = $null
  if ($ptr1 -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr1) }
  if ($ptr2 -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr2) }
  [Environment]::SetEnvironmentVariable('SUPABASE_DATABASE_URL',$oldDb,'Process')
  [Environment]::SetEnvironmentVariable('SUPABASE_URL',$oldUrl,'Process')
  [Environment]::SetEnvironmentVariable('NODE_EXTRA_CA_CERTS',$oldCa,'Process')
  [Environment]::SetEnvironmentVariable('SUPPORTCENTER_BACKEND_PATH',$oldBackend,'Process')
}
