$ErrorActionPreference = 'Stop'
$ProjectRef = 'azabpgjshpbcdzfuzyhi'
$EnvPath = Join-Path (Split-Path $PSScriptRoot -Parent) '.env'

Write-Host 'Support Command Center - Supabase Session Pooler Setup' -ForegroundColor Cyan
Write-Host ''
Write-Host '1. Open Supabase Dashboard > Connect.'
Write-Host '2. Select Session pooler (port 5432).'
Write-Host '3. Copy the COMPLETE PostgreSQL URI.'
Write-Host '   Do not type/guess the aws-N-region.pooler.supabase.com hostname.' -ForegroundColor Yellow
Write-Host ''

$uri = Read-Host 'Paste Session pooler URI'
if ([string]::IsNullOrWhiteSpace($uri)) { throw 'No URI supplied.' }
if ($uri -notmatch '^postgres(ql)?://') { throw 'URI must begin with postgresql:// or postgres://.' }
if ($uri -notmatch '\.pooler\.supabase\.com') { throw 'This does not look like a Supabase shared pooler URI.' }
if ($uri -notmatch "postgres\.$ProjectRef") {
  throw "Pooler username must include the project ref, normally postgres.$ProjectRef"
}

if ($uri -match '\[YOUR-PASSWORD\]|\[YOUR_PASSWORD\]|YOUR-PASSWORD|YOUR_PASSWORD') {
  $secure = Read-Host 'Enter database password (hidden)' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  $encoded = [System.Uri]::EscapeDataString($plain)
  $uri = $uri -replace '\[YOUR-PASSWORD\]|\[YOUR_PASSWORD\]|YOUR-PASSWORD|YOUR_PASSWORD', $encoded
}

if ($uri -notmatch 'sslmode=') {
  $uri += ($(if ($uri.Contains('?')) {'&'} else {'?'}) + 'sslmode=verify-full')
} else {
  $uri = $uri -replace 'sslmode=require', 'sslmode=verify-full'
}

if (-not (Test-Path $EnvPath)) { New-Item -ItemType File -Path $EnvPath -Force | Out-Null }
$content = Get-Content $EnvPath -Raw
if ($content -match '(?m)^SUPABASE_DATABASE_URL=.*$') {
  $content = [regex]::Replace($content, '(?m)^SUPABASE_DATABASE_URL=.*$', "SUPABASE_DATABASE_URL=$uri")
} else {
  if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) { $content += "`r`n" }
  $content += "SUPABASE_DATABASE_URL=$uri`r`n"
}
Set-Content -Path $EnvPath -Value $content -Encoding UTF8
Write-Host ''
Write-Host 'PASS: backend\.env updated with Session Pooler URI.' -ForegroundColor Green
Write-Host 'Now run: npm run db:check' -ForegroundColor Green
