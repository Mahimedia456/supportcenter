# SupportCenter Progressive 90-Day Sync, anchor fix V2

This supersedes the previous progressive package **only** for its strict UI anchor compatibility.
The five Kotlin source files and MANIFEST.json are identical to the previous release.

## Why the previous dry run failed
The old installer expected `if (state.error != null) ErrorBanner(...)`.
Snapshot/TabBar Recovery uses `if (state.error != null && state.snapshot != null) ErrorBanner(...)`.
This V2 installer recognizes either **exactly once**. It also inserts the first-load
preview *before* the `MissingSnapshotScreen` fallback if present, rather than overwriting it.

The tab correction is narrow: it changes only the third tab title from Insights to RMA
if necessary and preserves Insights through the workspace header. No other Compose
screen, auth, backend, or GitHub workflow is modified.

## Windows PowerShell
```powershell
$root = 'E:\Supportcenter'
$patch = "$root\native-android\_patches\Progressive90D-V2"
New-Item -ItemType Directory -Force $patch | Out-Null
Expand-Archive "$env:USERPROFILE\Downloads\SupportCenter_NATIVE_PROGRESSIVE_90DAY_SYNC_ANCHOR_FIX.zip" $patch -Force
Set-ExecutionPolicy -Scope Process Bypass -Force
& "$patch\APPLY-PROGRESSIVE.ps1" -RepoPath $root -DryRun
# Only if PROGRESSIVE_DRY_RUN_PASS:
& "$patch\APPLY-PROGRESSIVE.ps1" -RepoPath $root
& "$patch\VERIFY-PROGRESSIVE.ps1" -RepoPath $root
& "$root\native-android\RUN-BUILD.ps1" -RepoPath $root
```

After a successful build, check ADB devices and install:
```powershell
adb devices -l
& "$root\native-android\RUN-INSTALL.ps1" -RepoPath $root -SkipBuild
```

For a failed guard, stop and share the full output. Do not change hashes or force overwrite.
Gradle compile and ADB installation require the user's Windows/Android environment;
package-level validation is not an actual APK build.
