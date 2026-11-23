param([string]$Base='https://supportcenter-kappa.vercel.app',
      [string]$ExpectedProject='vggiadhzvqklqkztjmnb')
$ErrorActionPreference='Stop'
$baseUrl=$Base.TrimEnd('/')
Write-Host 'READ_ONLY: checking deployed Vercel diagnostics; never prints passwords/tokens.'
try{$d=Invoke-RestMethod -Uri "$baseUrl/api/diagnose" -TimeoutSec 30}
catch{throw "DIAG_ENDPOINT_FAILED: $($_.Exception.Message)"}
$hostName=[string]$d.checks.databaseTarget.host
Write-Host "DEPLOYED_DATABASE_HOST: $hostName"
Write-Host "DATABASE_CONNECTED: $($d.checks.database.ok)"
Write-Host "DATABASE_ERROR_CODE: $($d.checks.database.error)"
Write-Host "JWT_ACCESS_PRESENT: $($d.checks.environment.JWT_ACCESS_SECRET)"
Write-Host "JWT_REFRESH_PRESENT: $($d.checks.environment.JWT_REFRESH_SECRET)"
if([string]::IsNullOrWhiteSpace($hostName)){Write-Warning 'No deployed database host found.'; return}
if($hostName -notmatch '\.pooler\.supabase\.com$'){
 Write-Warning 'Production DB host is not a Supabase pooler. Copy EXACT Session Pooler URI from new Supabase Connect dashboard.'
}
try{
 $ips=[System.Net.Dns]::GetHostAddresses($hostName)
 Write-Host "LOCAL_DNS_RESOLVES: $($ips.Count -gt 0)"
}catch{Write-Warning "LOCAL_DNS_FAILURE: $($_.Exception.GetType().Name)"}
if(-not $d.checks.database.ok){
 Write-Warning "Vercel backend is NOT database ready. Do not attempt to solve this by changing Android login code."
 Write-Host "Fix: Supabase project $ExpectedProject -> Connect -> Session pooler -> copy FULL URI -> Vercel production SUPABASE_DATABASE_URL -> redeploy."
}
