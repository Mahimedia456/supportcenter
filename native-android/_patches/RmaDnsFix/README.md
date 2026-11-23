# SupportCenter Native RMA + DNS checkpoint

This is a **targeted**, reversible source change, not a full-screen overwrite.

1. `FIX-RMA-TAB.ps1 -RepoPath E:\Supportcenter -DryRun`
2. If PASS, `FIX-RMA-TAB.ps1 -RepoPath E:\Supportcenter -Apply`
3. `CHECK-ANDROID-DNS.ps1 -RepoPath E:\Supportcenter`
4. `& 'E:\Supportcenter\native-android\RUN-BUILD.ps1' -RepoPath 'E:\Supportcenter'`
5. `adb devices -l`
6. `& 'E:\Supportcenter\native-android\RUN-INSTALL.ps1' -RepoPath 'E:\Supportcenter' -SkipBuild`

Only one `TabItem("Insights", Icons.Outlined.Assessment)` changes to RMA. Existing `NativeRmaScreen` route is required. Header Insights remains present. Backup outside repo. No backend, secrets, or database mutations.

DNS test is read-only except that it launches Android's browser. Native APK source uses `.vercel.app`, not `.vercel`. If phone browser fails, investigate Android network and Private DNS. If browser succeeds while app fails, inspect installed APK and app logs.

Snapshot verify must occur after the last metric-events chunk sets `sync_status=ok`. If the original backfill run exited without `ATOMOS_SNAPSHOT_BACKFILL_PASS`, re-run `-Mode Run` for checkpoint resume, then `-Mode Verify`. Do not run two imports concurrently.

Static packaging checked. Windows PowerShell execution and physical APK run not tested here.
