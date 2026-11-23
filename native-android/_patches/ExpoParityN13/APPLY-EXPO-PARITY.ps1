param(
  [string]$RepoPath = 'E:\Supportcenter',
  [switch]$DryRun
)
$ErrorActionPreference='Stop'
$native=Join-Path ([IO.Path]::GetFullPath($RepoPath)) 'native-android'
$rel='app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\ui'
$screenPath=Join-Path $native (Join-Path $rel 'SupportScreens.kt')
$newPath=Join-Path $native (Join-Path $rel 'ExpoParityScreens.kt')
$packagePath=Join-Path $PSScriptRoot 'PATCH_FILES\ExpoParityScreens.kt'
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw | ConvertFrom-Json
$actual=(Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash.ToLowerInvariant()
if($actual -ne [string]$manifest.newSourceSha256){throw 'PARITY_PACKAGE_HASH_FAIL: package contents differ from verified source'}
if(-not (Test-Path -LiteralPath $screenPath)){throw "PARITY_MISSING_MAIN_SCREENS: $screenPath"}
$source=[IO.File]::ReadAllText($screenPath)
if($source.Contains('ParityOverviewScreen(')){
  if(-not (Test-Path -LiteralPath $newPath)){throw 'PARITY_ROUTE_WITHOUT_IMPLEMENTATION'}
  if((Get-FileHash -LiteralPath $newPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $actual){throw 'PARITY_PREVIOUS_SOURCE_DIFFERS'}
  Write-Host 'PARITY_ALREADY_APPLIED: correct screens and source present' -ForegroundColor Green
  return
}
$original=$source
function Replace-Once([string]$pattern,[string]$replacement,[string]$name){
  $count=[regex]::Matches($script:source,$pattern).Count
  if($count -ne 1){throw "PARITY_ANCHOR_MISMATCH: $name count=$count. Original UI untouched."}
  $script:source=[regex]::Replace($script:source,$pattern,$replacement)
  Write-Host "PARITY_READY $name"
}
# All substitutions target existing Compose route calls only. No full-file overwrite.
Replace-Once 'val\s+session\s*=\s*requireNotNull\(state\.session\)' 'val session = requireNotNull(state.session)`n    var ticketPreset by remember(session.workspace.slug) { mutableStateOf("all") }' 'TicketFilterState'
Replace-Once 'state\.tab\s*==\s*"Overview"\s*->\s*NativeOverviewScreen\(\s*state,\s*onPeriod,\s*onOpenTicket,\s*onRefresh\s*\)' 'state.tab == "Overview" -> ParityOverviewScreen(state, onPeriod, onOpenTicket, onRefresh) { preset -> ticketPreset = preset; onTab("Tickets") }' 'Overview'
Replace-Once 'state\.tab\s*==\s*"Tickets"\s*->\s*NativeTicketsScreen\(\s*state,\s*onPeriod,\s*onOpenTicket\s*\)' 'state.tab == "Tickets" -> ParityTicketsScreen(state, onPeriod, onOpenTicket, ticketPreset) { ticketPreset = "all" }' 'Tickets'
Replace-Once 'state\.tab\s*==\s*"RMA"\s*->\s*NativeRmaScreen\(\s*state,\s*onPeriod,\s*onOpenTicket\s*\)' 'state.tab == "RMA" -> ParityRmaScreen(state, onPeriod, onOpenTicket)' 'RMA'
Replace-Once 'state\.tab\s*==\s*"Devices"\s*->\s*NativeDevicesScreen\(\s*state,\s*onPeriod,\s*onOpenDevice\s*\)' 'state.tab == "Devices" -> ParityDevicesScreen(state, onPeriod, onOpenDevice)' 'Devices'
Replace-Once 'state\.tab\s*==\s*"Satisfaction"\s*->\s*NativeSatisfactionScreen\(\s*state,\s*onPeriod,\s*onOpenTicket\s*\)' 'state.tab == "Satisfaction" -> ParitySatisfactionScreen(state, onPeriod, onOpenTicket)' 'Satisfaction'
Replace-Once 'state\.tab\s*==\s*"Insights"\s*->\s*NativeInsightsScreen\(\s*state,\s*onPeriod,\s*onOpenTicket\s*\)' 'state.tab == "Insights" -> ParityInsightsScreen(state, onPeriod, onOpenTicket)' 'Insights'
Replace-Once 'state\.selectedDevice\s*!=\s*null\s*->\s*NativeDeviceDetailScreen\(\s*state,\s*onDetailBack,\s*onOpenTicket\s*\)' 'state.selectedDevice != null -> ParityDeviceDetailScreen(state, onDetailBack, onOpenTicket, onPeriod)' 'DeviceDetail'
Replace-Once 'state\.tab\s*==\s*"Alerts"\s*->\s*NativeAlertsScreen\(\s*state,\s*onOpenTicket\s*\)' 'state.tab == "Alerts" -> ParityAlertsScreen(state, onPeriod) { preset -> ticketPreset = preset; onTab("Tickets") }' 'Alerts'
Replace-Once 'state\.tab\s*==\s*"Profile"\s*->\s*NativeProfileScreen\(\s*state,\s*onRefresh,\s*onClearCache,\s*onLogout\s*\)' 'state.tab == "Profile" -> ParityProfileScreen(state, onRefresh, onClearCache, onLogout)' 'Profile'
# Correct only the bottom bar item; the Insights header route remains available.
$badTab='TabItem\("Insights",\s*Icons\.Outlined\.Assessment\)'
$goodTab='TabItem\("RMA",\s*Icons\.Outlined\.Assessment\)'
if([regex]::Matches($source,$badTab).Count -eq 1 -and [regex]::Matches($source,$goodTab).Count -eq 0){
   $source=[regex]::Replace($source,$badTab,'TabItem("RMA", Icons.Outlined.Assessment)')
   Write-Host 'PARITY_READY BottomRMA'
}elseif([regex]::Matches($source,$goodTab).Count -eq 1){
   Write-Host 'PARITY_READY BottomRMA_AlreadyCorrect'
}else{throw 'PARITY_BOTTOM_NAV_UNRECOGNIZED: no file modified'}
# Match Expo tab order: Overview, Tickets, RMA, Satisfaction, Devices.
$nativeOrder='TabItem\("RMA",\s*Icons\.Outlined\.Assessment\),(\s*)TabItem\("Devices",\s*Icons\.Outlined\.Devices\),(\s*)TabItem\("Satisfaction",\s*Icons\.Outlined\.SentimentSatisfied\)'
$expoOrder='TabItem\("RMA",\s*Icons\.Outlined\.Assessment\),(\s*)TabItem\("Satisfaction",\s*Icons\.Outlined\.SentimentSatisfied\),(\s*)TabItem\("Devices",\s*Icons\.Outlined\.Devices\)'
if([regex]::Matches($source,$nativeOrder).Count -eq 1){
  $source=[regex]::Replace($source,$nativeOrder,'TabItem("RMA", Icons.Outlined.Assessment),${1}TabItem("Satisfaction", Icons.Outlined.SentimentSatisfied),${2}TabItem("Devices", Icons.Outlined.Devices)')
  Write-Host 'PARITY_READY ExpoBottomOrder'
}elseif([regex]::Matches($source,$expoOrder).Count -eq 1){
  Write-Host 'PARITY_READY ExpoBottomOrder_AlreadyCorrect'
}else{throw 'PARITY_BOTTOM_ORDER_UNRECOGNIZED: no file modified'}
if($source -eq $original){throw 'PARITY_NO_CHANGES'}
if($DryRun){Write-Host 'PARITY_DRY_RUN_PASS: no files modified' -ForegroundColor Green;return}
if((Test-Path -LiteralPath $newPath) -and ((Get-FileHash -LiteralPath $newPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $actual)){
  throw 'PARITY_EXISTING_NEW_SOURCE_DIFFERENT: refusing overwrite'
}
$newFileExisted=Test-Path -LiteralPath $newPath
$backup=Join-Path (Split-Path $native -Parent) ('SupportCenter_ParityBackup_'+(Get-Date -Format 'yyyyMMdd_HHmmss'))
New-Item -ItemType Directory -Force $backup|Out-Null
Copy-Item -LiteralPath $screenPath -Destination (Join-Path $backup 'SupportScreens.kt')
$bytes=[IO.File]::ReadAllBytes($screenPath)
$hasBom=$bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191
$enc=New-Object System.Text.UTF8Encoding($hasBom)
# Replace the only inserted PowerShell backtick-n marker with an actual newline.
$source=$source.Replace('`n',[Environment]::NewLine)
try {
  [IO.File]::WriteAllText($screenPath,$source,$enc)
  Copy-Item -LiteralPath $packagePath -Destination $newPath -Force
  & (Join-Path $PSScriptRoot 'VERIFY-EXPO-PARITY.ps1') -RepoPath $RepoPath
  Write-Host "PARITY_PATCH_APPLIED BACKUP=$backup" -ForegroundColor Green
}catch {
  Copy-Item -LiteralPath (Join-Path $backup 'SupportScreens.kt') -Destination $screenPath -Force
  if(-not $newFileExisted) {Remove-Item -LiteralPath $newPath -Force -ErrorAction SilentlyContinue}
  throw
}
