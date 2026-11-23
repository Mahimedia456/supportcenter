param(
 [ValidateSet('Start','Capture')][string]$Mode='Capture',
 [string]$RepoPath='E:\Supportcenter',
 [string]$Serial=''
)
$ErrorActionPreference='Stop'
if(-not (Get-Command adb -ErrorAction SilentlyContinue)){throw 'ADB_NOT_FOUND'}
$all=@(& adb devices|Where-Object{$_ -match '^\S+\s+device\s*$'}|ForEach-Object{($_ -split '\s+')[0]})
if($Serial){if($Serial -notin $all){throw "ADB_SERIAL_NOT_AUTHORIZED $Serial"}}elseif($all.Count -eq 1){$Serial=$all[0]}else{throw 'ADB_SELECT_ONE_DEVICE: use -Serial from adb devices -l'}
$package='com.mahimediasolutions.supportcenter.nativeapp'
if($Mode -eq 'Start'){
  & adb -s $Serial logcat -c -b crash | Out-Null
  & adb -s $Serial shell am force-stop $package | Out-Null
  & adb -s $Serial shell am start -n "$package/.MainActivity" | Out-Null
  Write-Host 'CRASH_CAPTURE_STARTED: Reproduce the loading crash, then run -Mode Capture.'
  return
}
$dir=Join-Path $RepoPath 'native-android\reports'
New-Item -ItemType Directory -Force $dir|Out-Null
$stamp=Get-Date -Format 'yyyyMMdd_HHmmss'
$out=Join-Path $dir ("ANDROID_CRASH_$stamp.txt")
$logs=@(& adb -s $Serial logcat -b crash -d -v threadtime 2>&1)
$redacted=($logs -join "`n") -replace '(?i)(Bearer\s+)[A-Za-z0-9._\-]+','$1[REDACTED]' -replace '(?i)(password\s*[:=]\s*)\S+','$1[REDACTED]'
[IO.File]::WriteAllText($out,$redacted,[Text.UTF8Encoding]::new($false))
Write-Host "CRASH_LOG_SAVED: $out"
if($redacted -match 'FATAL EXCEPTION|OutOfMemoryError|StackOverflowError'){
  Write-Host 'FATAL_CRASH_DETECTED: share the relevant FATAL EXCEPTION stack after reviewing the log for private data.'
}else{
  Write-Warning 'NO_FATAL_STACK_IN_CRASH_BUFFER: if app freezes rather than crashes, capture a full logcat / ANR trace separately.'
}
