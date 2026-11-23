param([string]$RepoPath='E:\Supportcenter')
$ErrorActionPreference='Stop'
$dir=Join-Path $RepoPath 'native-android\app\src\main\java\com\mahimediasolutions\supportcenter\nativeapp\ui'
$a=Join-Path $dir 'SupportScreens.kt';$b=Join-Path $dir 'ExpoParityScreens.kt'
if(-not (Test-Path $a) -or -not (Test-Path $b)){throw 'PARITY_SOURCE_MISSING'}
$m=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw|ConvertFrom-Json
$sha=(Get-FileHash -LiteralPath $b -Algorithm SHA256).Hash.ToLowerInvariant()
if($sha -ne $m.newSourceSha256){throw 'PARITY_SOURCE_HASH_FAILED'}
$s=[IO.File]::ReadAllText($a)
foreach($name in @('ParityOverviewScreen(','ParityTicketsScreen(','ParityRmaScreen(','ParityDevicesScreen(','ParitySatisfactionScreen(','ParityInsightsScreen(','ParityDeviceDetailScreen(','ParityAlertsScreen(','ParityProfileScreen(','TabItem("RMA",')){
 if(-not $s.Contains($name)){throw "PARITY_ROUTE_MISSING $name"}
}
$pR=$s.IndexOf('TabItem("RMA",')
$pS=$s.IndexOf('TabItem("Satisfaction",')
$pD=$s.IndexOf('TabItem("Devices",')
if($pR -lt 0 -or $pS -le $pR -or $pD -le $pS){throw 'PARITY_BOTTOM_ORDER_MISMATCH'}
Write-Host 'PARITY_STATIC_PASS: 5 tabs + Insights + device details + RMA, package hash' -ForegroundColor Green
Write-Host 'Physical Gradle compilation, ADB visual checks and crash analysis still required.'
