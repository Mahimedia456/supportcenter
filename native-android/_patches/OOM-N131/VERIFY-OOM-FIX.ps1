param([string]$RepoPath = 'E:\Supportcenter')
$ErrorActionPreference='Stop'
$native=Join-Path ([IO.Path]::GetFullPath($RepoPath)) 'native-android'
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw | ConvertFrom-Json
$count=0
foreach($record in $manifest.files){
  $path=[string]$record.path
  $dest=Join-Path $native ($path.Replace('/',[IO.Path]::DirectorySeparatorChar))
  if(-not (Test-Path -LiteralPath $dest)){throw "OOM_VERIFY_MISSING $path"}
  $sha=(Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLowerInvariant()
  if($sha -ne ([string]$record.after_sha256).ToLowerInvariant()){
    throw "OOM_VERIFY_HASH_MISMATCH $path"
  }
  $count++
  Write-Host "OOM_FILE_PASS $path"
}
if($count -ne 3){throw 'OOM_VERIFY_WRONG_COUNT'}
Write-Host 'OOM_STREAMING_STATIC_PASS' -ForegroundColor Green
