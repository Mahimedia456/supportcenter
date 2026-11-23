param([string]$RepoPath='E:\Supportcenter',[string]$Serial='')
$ErrorActionPreference='Continue'
$hostname='supportcenter-kappa.vercel.app'
$base="https://$hostname"
Write-Host 'WINDOWS_DNS_TEST'
try {
  Resolve-DnsName -Name $hostname -ErrorAction Stop | Where-Object {$_.Type -in @('A','AAAA','CNAME')} | Select-Object Name,Type,NameHost,IPAddress | Format-Table -AutoSize
} catch {Write-Warning ('WINDOWS_DNS_FAILURE: '+$_.Exception.Message)}
try {
  $status=(Invoke-WebRequest -Uri "$base/api/health" -UseBasicParsing -TimeoutSec 20).StatusCode
  Write-Host "WINDOWS_API_HEALTH_HTTP_$status"
} catch {Write-Warning ('WINDOWS_API_HEALTH_FAILED: '+$_.Exception.Message)}
$gradle=Join-Path $RepoPath 'native-android\app\build.gradle.kts'
if (Test-Path -LiteralPath $gradle) {
  Get-Content -LiteralPath $gradle | Select-String 'API_BASE_URL' | ForEach-Object {Write-Host ('SOURCE_CONFIG: '+$_.Line.Trim())}
}
$adbCmd=Get-Command adb -ErrorAction SilentlyContinue
$adb=if($adbCmd){$adbCmd.Source}else{Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'}
if(-not (Test-Path -LiteralPath $adb)){Write-Warning 'ADB_NOT_FOUND';return}
Write-Host 'ADB_DEVICES:'
& $adb devices -l | Out-Host
$ready=@(& $adb devices | ForEach-Object {if($_ -match '^\s*(\S+)\s+device\s*$'){$matches[1]}})
if ($Serial) {
  if ($ready -notcontains $Serial){Write-Warning 'REQUESTED_ADB_SERIAL_NOT_CONNECTED';return}
  $device=$Serial
} elseif ($ready.Count -eq 1) { $device=$ready[0] }
else { Write-Warning 'ZERO_OR_MULTIPLE_ADB_DEVICES: rerun -Serial <one device>'; return }
Write-Host "ADB_SELECTED: $device"
Write-Host ('PRIVATE_DNS_MODE: '+((& $adb -s $device shell settings get global private_dns_mode 2>$null) -join ' ').Trim())
Write-Host ('PRIVATE_DNS_SPECIFIER: '+((& $adb -s $device shell settings get global private_dns_specifier 2>$null) -join ' ').Trim())
Write-Host 'OPENING_CHROME_OR_DEFAULT_BROWSER: inspect whether /api/health loads on phone'
& $adb -s $device shell am start -a android.intent.action.VIEW -d "$base/api/health" | Out-Host
Write-Host 'If browser fails: check phone Wi-Fi/mobile data, Private DNS, VPN/ad-blocker. If browser works but app fails: rebuild and reinstall current source APK, then inspect logcat.'
