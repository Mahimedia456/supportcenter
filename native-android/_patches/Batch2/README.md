# SupportCenter Native Android Batch 2 (N05-N08) + Gradle PowerShell fix

**Target**: `E:\Supportcenter\native-android`, original Batch 1 files must be present. Extract this ZIP to `E:\Supportcenter\native-android\_patches\Batch2` and run `APPLY-BATCH2.ps1`. It applies files to the parent native project using `-RepoPath`.

## Features

- **N05 Overview**: native date-period selector (Today, 7/30/90 days), ticket KPIs, most recent tickets, explicit backend sync status and server-provided SLA breach events when available. Dates are based on *created_at*; active means new/open/pending/hold.
- **N06 Tickets**: searchable, status-filtered native list; ticket detail with full description, tags, requester, assignee, group, form, custom fields, created/updated times.
- **N07 Conversations**: on-demand authenticated read-only conversation endpoint, public reply vs internal note, timestamps, error/retry state; no changes to Zendesk or ticket actions.
- **N08 RMA and Devices**: heuristic RMA classification from synced forms/fields/tags with explicit evidence notes; device breakdowns from Zendesk custom field metadata and ticket drill-down. Empty classifications are reported honestly.
- **B1 fix**: `GET-GRADLE.ps1` checksum response now downloaded to file and read as UTF-8 text. Official SHA-256 verification remains required.

## Safety and prerequisites

- No Expo. No modifications to `apps\mobile`, `backend`, branding assets, Gradle dependencies, or Vercel/Supabase credentials.
- Backups are written outside repo to `E:\SupportCenter_Native_B2_Backup_*` before writes. Each original file must match the supplied Batch 1 digest; if not, installer stops without overwriting. Re-run is idempotent.
- Windows PowerShell 5.1, Android Studio Android SDK 35 and JDK 17+ required. Internet required on first Gradle build.
- This is **source-complete Batch 2 but not yet a tested APK**; physical device and API checks required.

## Commands

```powershell
New-Item -ItemType Directory -Force 'E:\Supportcenter\native-android\_patches\Batch2' | Out-Null
Expand-Archive "$env:USERPROFILE\Downloads\SupportCenter_NATIVE_BATCH2_N05-N08_GRADLE_FIX.zip" 'E:\Supportcenter\native-android\_patches\Batch2' -Force
Set-ExecutionPolicy -Scope Process Bypass -Force
& 'E:\Supportcenter\native-android\_patches\Batch2\APPLY-BATCH2.ps1' -RepoPath 'E:\Supportcenter' -DryRun
& 'E:\Supportcenter\native-android\_patches\Batch2\APPLY-BATCH2.ps1' -RepoPath 'E:\Supportcenter'
& 'E:\Supportcenter\native-android\_patches\Batch2\RUN-BATCH2-BUILD.ps1' -RepoPath 'E:\Supportcenter'
& 'E:\Supportcenter\native-android\_patches\Batch2\RUN-BATCH2-INSTALL.ps1' -RepoPath 'E:\Supportcenter'
```

For **Gradle-only fix first**:

```powershell
& 'E:\Supportcenter\native-android\_patches\Batch2\FIX-GRADLE-ONLY.ps1' -RepoPath 'E:\Supportcenter' -DryRun
& 'E:\Supportcenter\native-android\_patches\Batch2\FIX-GRADLE-ONLY.ps1' -RepoPath 'E:\Supportcenter'
& 'E:\Supportcenter\native-android\RUN-BUILD.ps1' -RepoPath 'E:\Supportcenter'
```

If `B2_BASE_VERSION_MISMATCH` appears, **stop** and share file path plus local diff. Do not force overwrite. No claim of production parity until physical test.

## Test checklist

- Native login, Atomos/Angelbird header and secure logout remain unchanged.
- Overview: date periods and KPIs match snapshot ticket counts.
- Tickets: search/filters, detail fields, conversations including public vs internal note, retry on network error.
- RMA: classification clearly distinguishes unresolved/unclassified cases; no fabricated counts.
- Devices: custom-field-derived model list, device details open related tickets.
- Network disconnected: cached/offline state is explicit; switching workspaces never shares cached data.
- Batch 3 still needed for Satisfaction/Insights, alerts, notifications, settings, production signing, and full parity tests.
