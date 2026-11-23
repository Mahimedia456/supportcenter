# SupportCenter Native Batch 3 Kotlin + ADB hotfix

This hotfix addresses two issues in the supplied Batch 3 package:

1. `SupportScreens.kt:194` uses `Modifier.horizontalScroll` but lacks `import androidx.compose.foundation.horizontalScroll`.
2. `BUILD-AND-ADB-INSTALL.ps1` assigns `$pid`, which conflicts with PowerShell's read-only `$PID` automatic variable. Replaced with `$appProcessId`.

The fix edits exactly four files: the working Kotlin source, Batch 3's patch-source copy, Batch 3's hash manifest, and its ADB runner. It preserves original hashed-package integrity checks by updating the pinned hash for the fixed Kotlin file in the extracted Batch 3 patch. Unrelated files are not touched. All four originals are backed up before changes; source checks are fail-closed. Idempotent on re-run.

Extract the ZIP to `E:\Supportcenter\native-android\_patches\B3-Hotfix`.

```powershell
$repo  = 'E:\Supportcenter'
$fix   = "$repo\native-android\_patches\B3-Hotfix"
& "$fix\APPLY-B3-HOTFIX.ps1" -RepoPath $repo -DryRun
& "$fix\APPLY-B3-HOTFIX.ps1" -RepoPath $repo

$batch3 = "$repo\native-android\_patches\Batch3"
& "$batch3\CHECK-BATCH3.ps1" -RepoPath $repo
& "$batch3\BUILD-AND-ADB-INSTALL.ps1" -RepoPath $repo
```

Use `-BuildOnly` on the last command to compile an APK without installing. If you have more than one authorized ADB device, add `-Serial '<adb-device-serial>'`.

Successful build output file: `E:\Supportcenter\native-android\dist\SupportCenter-Native-B3-debug.apk`.

No APK has been compiled or installed in the assistant environment; device-side build remains to verify. If new Kotlin errors appear, share the error messages rather than bypassing compilation.
