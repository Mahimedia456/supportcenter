# SupportCenter Native Android: Streaming OOM Hotfix (N13.1)

## Proven root cause

The supplied `FATAL EXCEPTION` is `java.lang.OutOfMemoryError` in `org.json.JSONTokener`, called from `SupportApi.request`, `snapshotPartPage`, and `SupportRepository.loadSnapshotProgressive`. The Android process reports a 256 MB heap limit. The large snapshot response is currently loaded as a full String and parsed to another full JSONObject while previously downloaded 90-day records are still in memory. This is not a DNS, password, Supabase connectivity or Compose thread issue.

## Exact changes

Only three original native Android data files are changed. This patch does not modify login, workspace branding, navigation, Kotlin UI screens, Supabase, Vercel, or GitHub workflows.

- `SupportApi.kt`: paginated snapshot requests now use a streaming `android.util.JsonReader` (no full-page String plus JSONObject copy). Bound each response to <=100 rows; require correct workspace, part, cursor, and field types. Keeps fields used by current UI while leaving full raw Zendesk records in Supabase. Small nonpaged requests are limited to 2 MB.
- `SupportRepository.kt`: progressive loading uses **40 tickets/page** (quick first previews) or **60 other items/page**, with room for all 90-day pages; SLA breach events are retained as compact records. Partial metrics are explicitly not marked final. The existing sync version guard stays intact.
- `SecureFiles.kt`: an earlier oversized encrypted local snapshot is skipped (not deleted) to avoid an OOM on startup. Future compact snapshots remain encrypted with Android Keystore.

### Data parity
Ticket ID, description, status, tags, custom fields, assignee, requester, group, form and dates remain available to the current Kotlin screens. Satisfaction preserves ID, score, ticket, comment and dates. SLA retains each breach event ID association, type and time. Ticket metrics retain replies, reopens and reply_time_in_minutes. Original complete raw records remain on the server. Other raw JSON fields not consumed by current native UI are omitted from the phone projection; if future analytics need them, extend the projection explicitly. No fabricated counts.

## Apply, build and install

```powershell
$root = 'E:\Supportcenter'
$patch = "$root\native-android\_patches\OOM-N131"
New-Item -ItemType Directory -Force $patch | Out-Null
Expand-Archive "$env:USERPROFILE\Downloads\SupportCenter_NATIVE_OOM_STREAMING_HOTFIX.zip" $patch -Force
Set-ExecutionPolicy -Scope Process Bypass -Force
& "$patch\APPLY-OOM-FIX.ps1" -RepoPath $root -DryRun
# After OOM_DRY_RUN_PASS:
& "$patch\APPLY-OOM-FIX.ps1" -RepoPath $root
& "$patch\VERIFY-OOM-FIX.ps1" -RepoPath $root
adb devices -l
& "$patch\BUILD-ADB-OOM-FIX.ps1" -RepoPath $root
# When multiple devices, add -Serial 'device-serial'.
```

The installer checks exact SHA-256 of all three package source files **and** the expected local baseline, rejects unknown local modifications and backs up originals outside the repository. Never bypass an `OOM_LOCAL_VERSION_MISMATCH` error.

## Runtime memory validation

After the APK launches, sign in and allow first ticket previews, then full 90-day dataset. Compare `adb shell dumpsys meminfo com.mahimediasolutions.supportcenter.nativeapp` at several points. Capture new crash evidence if any:

```powershell
adb logcat -d -v time AndroidRuntime:E '*:S' | Select-String -Pattern 'FATAL EXCEPTION|OutOfMemoryError|SupportApi|SupportRepository' -Context 3,12
```

Do not share raw logcat without checking it for sensitive info. A successful Kotlin build is not proof of crash-free execution on the device.
