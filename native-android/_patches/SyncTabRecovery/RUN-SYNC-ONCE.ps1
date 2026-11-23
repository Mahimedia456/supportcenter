param(
  [ValidateSet('atomos','angelbird')][string]$Workspace='atomos',
  [string]$BaseUrl='https://supportcenter-kappa.vercel.app',
  [int]$MaxChunks=250,
  [switch]$SkipConversations
)
$ErrorActionPreference='Stop'
if($MaxChunks -lt 1 -or $MaxChunks -gt 300){throw 'MaxChunks must be between 1 and 300'}
$secretSecure=Read-Host 'Enter Production CRON_SECRET (hidden, not saved)' -AsSecureString
$bstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretSecure)
try{$secret=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)}
finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)}
if([string]::IsNullOrWhiteSpace($secret)){throw 'CRON_SECRET_EMPTY'}
$headers=@{ Authorization="Bearer $secret"; Accept='application/json' }
$base=$BaseUrl.TrimEnd('/')
function Stage([string]$name,[string]$cursor=''){
 $q='workspace='+[uri]::EscapeDataString($Workspace)+'&stage='+[uri]::EscapeDataString($name)
 if($cursor){$q+='&cursor='+[uri]::EscapeDataString($cursor)}
 try{
   $r=Invoke-RestMethod -Uri "$base/api/zendesk-hourly-sync?$q" -Headers $headers -TimeoutSec 250 -Method Get
 }catch{
   $status=if($_.Exception.Response){[int]$_.Exception.Response.StatusCode}else{'NETWORK_ERROR'}
   throw "SYNC_STAGE_HTTP_FAILED workspace=$Workspace stage=$name status=$status"
 }
 if($r.ok -ne $true -or $r.skipped -eq $true -or $r.workspace -ne $Workspace -or $r.stage -ne $name){
   throw "SYNC_STAGE_INVALID_RESPONSE workspace=$Workspace stage=$name. Confirm staged endpoint deployed."
 }
 $n=if($null -ne $r.count){$r.count}elseif($null -ne $r.counts){$r.counts | ConvertTo-Json -Compress}else{'n/a'}
 Write-Host "STAGE workspace=$Workspace stage=$name done=$($r.done) count=$n remaining=$($r.remaining)"
 return $r
}
try{
 Write-Host "BEGIN_SYNC workspace=$Workspace (90-day Zendesk snapshot)"
 foreach($s in @('reference','satisfaction','metrics')){
   $r=Stage $s
   if($r.done -ne $true){throw "STAGE_INCOMPLETE $s"}
 }
 foreach($s in @('tickets','metric-events')){
   $cursor='';$done=$false
   for($i=1;$i -le $MaxChunks;$i++){
     $r=Stage $s $cursor
     if($r.done -eq $true){$done=$true;break}
     $next=[string]$r.next
     if([string]::IsNullOrWhiteSpace($next)){throw "SYNC_NO_NEXT_CURSOR stage=$s"}
     $cursor=$next
   }
   if(-not $done){throw "SYNC_MAX_CHUNKS_REACHED stage=$s"}
 }
 if(-not $SkipConversations){
   $done=$false
   for($i=1;$i -le 30;$i++){
     $r=Stage 'conversations'
     if($r.done -eq $true){$done=$true;break}
   }
   if(-not $done){throw 'CONVERSATION_SYNC_INCOMPLETE'}
 }
 Write-Host "SYNC_STAGE_SEQUENCE_PASS workspace=$Workspace" -ForegroundColor Green
 Write-Host 'Verify syncedAt and snapshotStatus with CHECK-LOGIN-VERCEL.ps1 -TestLogin.'
}finally{
 $headers.Remove('Authorization');Remove-Variable secret,secretSecure,bstr -ErrorAction SilentlyContinue
}
