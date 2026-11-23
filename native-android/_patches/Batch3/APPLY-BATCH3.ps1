param([string]$RepoPath='E:\Supportcenter',[switch]$DryRun)
$ErrorActionPreference='Stop'
$repo=[System.IO.Path]::GetFullPath($RepoPath)
$native=Join-Path $repo 'native-android'
if(-not (Test-Path -LiteralPath (Join-Path $native 'settings.gradle.kts'))){throw 'B3_NATIVE_PROJECT_MISSING'}
$batch2=Join-Path $native 'app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\ui\Batch2Screens.kt'
if(-not (Test-Path -LiteralPath $batch2)){throw 'B3_REQUIRES_BATCH2: Apply Batch2 first'}
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'PATCH_MANIFEST.json') -Raw | ConvertFrom-Json
function HashFile([string]$path){
 if(-not (Test-Path -LiteralPath $path -PathType Leaf)){return $null}
 return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
}
$todo=New-Object 'System.Collections.Generic.List[object]'
foreach($row in $manifest){
 $rel=[string]$row.path
 if($rel.StartsWith('/') -or $rel.StartsWith('\') -or $rel.Contains('..') -or $rel.Contains(':')){
  throw "B3_MANIFEST_UNSAFE_PATH $rel"
 }
 $winRel=$rel.Replace('/','\')
 $dest=Join-Path $native $winRel
 $source=Join-Path (Join-Path $PSScriptRoot 'PATCH_FILES') $winRel
 $new=([string]$row.patched_sha256).ToLowerInvariant()
 $base=if($null -eq $row.base_sha256){$null}else{([string]$row.base_sha256).ToLowerInvariant()}
 if((HashFile $source) -ne $new){throw "B3_PACKAGE_HASH_FAILED $rel"}
 $present=HashFile $dest
 if($present -eq $new){Write-Host "ALREADY_PATCHED $rel";continue}
 if($null -eq $base){
  if($null -ne $present){throw "B3_NEW_FILE_CONFLICT $rel"}
 }elseif($present -ne $base){
  throw "B3_BASE_VERSION_MISMATCH $rel. Local source differs from verified Batch 1/2. Do not overwrite."
 }
 [void]$todo.Add([pscustomobject]@{Rel=$rel;Source=$source;Dest=$dest;Had=($null -ne $present);NewHash=$new})
 Write-Host "READY $rel"
}
if($DryRun){Write-Host "B3_DRY_RUN_PASS: $($todo.Count) paths ready; no write" -ForegroundColor Green;return}
if($todo.Count -eq 0){Write-Host 'B3_ALREADY_APPLIED' -ForegroundColor Green;return}
$backup=Join-Path (Split-Path -Parent $repo) ("SupportCenter_Native_B3_Backup_"+(Get-Date -Format 'yyyyMMdd_HHmmss'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$changed=New-Object 'System.Collections.Generic.List[object]'
try {
 foreach($row in $todo){
  if($row.Had){
   $bak=Join-Path $backup ($row.Rel.Replace('/','\'))
   New-Item -ItemType Directory -Path (Split-Path -Parent $bak) -Force | Out-Null
   Copy-Item -LiteralPath $row.Dest -Destination $bak -Force
  }
  New-Item -ItemType Directory -Path (Split-Path -Parent $row.Dest) -Force | Out-Null
  [void]$changed.Add($row)
  Copy-Item -LiteralPath $row.Source -Destination $row.Dest -Force
  if((HashFile $row.Dest) -ne $row.NewHash){throw "B3_WRITE_VERIFICATION_FAIL $($row.Rel)"}
  Write-Host "PATCHED $($row.Rel)"
 }
} catch {
 foreach($row in $changed){
  if($row.Had){
   $bak=Join-Path $backup ($row.Rel.Replace('/','\'))
   if(Test-Path -LiteralPath $bak){Copy-Item -LiteralPath $bak -Destination $row.Dest -Force}
  }else{Remove-Item -LiteralPath $row.Dest -Force -ErrorAction SilentlyContinue}
 }
 throw
}
Write-Host "B3_PATCH_APPLIED: $($todo.Count) files" -ForegroundColor Green
Write-Host "B3_BACKUP: $backup"
