param([string]$Base='https://supportcenter-kappa.vercel.app',[switch]$TestLogin)
$ErrorActionPreference='Stop'
$baseUrl=$Base.TrimEnd('/')
if(-not $baseUrl.StartsWith('https://')){throw 'DIAG_HTTPS_ONLY'}
Write-Host 'SUPPORTCENTER_AUTH_READ_ONLY: no token or password is written to disk or shown.'
function SafeResponse($url){
 try{
  $result=Invoke-RestMethod -Uri $url -TimeoutSec 30 -ErrorAction Stop
  return $result
 }catch{
  $status='NETWORK_ERROR'
  if($_.Exception.Response){$status=[int]$_.Exception.Response.StatusCode}
  Write-Host "REQUEST_FAILED: status=$status path=$($url.Substring($baseUrl.Length))"
  return $null
 }
}
$health=SafeResponse "$baseUrl/api/health"
if($health){Write-Host 'HEALTH_ENDPOINT: responded successfully'}
$diag=SafeResponse "$baseUrl/api/diagnose"
if($diag){
 Write-Host "DATABASE_CONNECTED: $($diag.checks.database.ok)"
 Write-Host "DATABASE_ERROR_CODE: $($diag.checks.database.error)"
 Write-Host "JWT_ACCESS_CONFIGURED: $($diag.checks.environment.JWT_ACCESS_SECRET)"
 Write-Host "JWT_REFRESH_CONFIGURED: $($diag.checks.environment.JWT_REFRESH_SECRET)"
}
$authCheck=SafeResponse "$baseUrl/api/auth-diagnose"
if($authCheck){
 Write-Host "AUTH_DATABASE_READY: $($authCheck.ok)"
 Write-Host "AUTH_DB_ERROR_CODE: $($authCheck.errorCode)"
 Write-Host "TOTAL_USERS: $($authCheck.counts.totalUsers)"
 Write-Host "ACTIVE_MEMBERSHIPS: $($authCheck.counts.activeMemberships)"
}
if(-not $TestLogin){Write-Host 'Run with -TestLogin for a hidden-password login and snapshot check.';return}
$email=(Read-Host 'Work email').Trim()
$secret=Read-Host 'Current login password' -AsSecureString
$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {$password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)}
finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
if(-not $email -or -not $password){throw 'EMPTY_EMAIL_OR_PASSWORD'}
$payload=@{email=$email;password=$password}|ConvertTo-Json -Compress
$password=$null
$session=$null
try{
  $session=Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" `
    -ContentType 'application/json' -Body $payload -TimeoutSec 30 -ErrorAction Stop
  $payload=$null
  if(-not $session.accessToken){throw 'LOGIN_NO_ACCESS_TOKEN_IN_RESPONSE'}
  Write-Host 'LOGIN_HTTP_200: credentials accepted'
  Write-Host "LOGIN_WORKSPACE: $($session.workspace.slug)"
  $headers=@{Authorization="Bearer $($session.accessToken)"}
  try{
    $me=Invoke-RestMethod -Uri "$baseUrl/auth/me" -Headers $headers -TimeoutSec 30
    Write-Host "AUTH_ME_PASS workspace=$($me.workspace.slug)"
  }catch{Write-Host "AUTH_ME_FAIL status=$([int]$_.Exception.Response.StatusCode)"}
  try{
    $meta=Invoke-RestMethod -Uri "$baseUrl/api/zendesk-cache-snapshot?part=meta" -Headers $headers -TimeoutSec 30
    Write-Host "SNAPSHOT_META_PASS workspace=$($meta.workspace) status=$($meta.snapshotStatus)"
  }catch{
    $code=if($_.Exception.Response){[int]$_.Exception.Response.StatusCode}else{'NETWORK_ERROR'}
    Write-Host "SNAPSHOT_META_FAIL status=$code"
  }
}catch{
  $code=if($_.Exception.Response){[int]$_.Exception.Response.StatusCode}else{'NETWORK_ERROR'}
  $friendly=''
  $raw=[string]$_.ErrorDetails.Message
  if($raw){try{$j=$raw|ConvertFrom-Json; $friendly=[string]$j.message}catch{}}
  if(-not $friendly){$friendly=[string]$_.Exception.Message}
  $friendly=$friendly -replace '[\r\n]+',' '
  Write-Host "LOGIN_FAILED status=$code reason=$($friendly.Substring(0,[Math]::Min($friendly.Length,180)))"
  if($code -eq 401){Write-Host '401: Check seeded user, password hash, is_active and active workspace membership.'}
  if($code -eq 500){Write-Host '500: Check Vercel database diagnostics and production deployment.'}
}finally{
  $payload=$null;$session=$null;$secret=$null;$password=$null
}
