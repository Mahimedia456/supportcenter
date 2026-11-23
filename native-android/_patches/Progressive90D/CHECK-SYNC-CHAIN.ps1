param([string]$RepoPath='E:\Supportcenter')
$ErrorActionPreference='Stop'
Write-Host 'CHECK: GitHub latest workflow dispatch/completion (public metadata only)'
try {
  $headers=@{'User-Agent'='SupportCenter-Snapshot-Audit'}
  $url='https://api.github.com/repos/Mahimedia456/supportcenter/actions/runs?per_page=5'
  $response=Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 25
  $recent=$response.workflow_runs | Select-Object -First 3
  foreach($r in $recent){
    Write-Host "GITHUB_RUN number=$($r.run_number) status=$($r.status) conclusion=$($r.conclusion) createdAt=$($r.created_at) commit=$($r.head_sha)"
  }
} catch { Write-Warning 'GitHub workflow metadata unavailable; check GitHub Actions webpage. No changes made.' }
Write-Host 'CHECK: New Supabase snapshot from existing read-only local verifier'
$tool=Join-Path $RepoPath 'backend\tools\AtomosBackfill\RUN-ATOMOS-BACKFILL.ps1'
if(Test-Path -LiteralPath $tool){
  & $tool -RepoPath $RepoPath -Mode Verify
}else{Write-Warning 'Local backfill verifier missing. Use Supabase SQL Editor query.'}
Write-Host 'Audit finished. No GitHub workflow or database changes were requested.'
