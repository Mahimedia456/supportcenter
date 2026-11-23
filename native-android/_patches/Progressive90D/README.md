# SupportCenter Native progressive 90-day snapshot patch

## Purpose
- The known Supabase snapshot `2026-11-23T00:59:05.516Z` has 2,752 Atomos tickets, 2,000 satisfaction records and 117,953 metric events. Android reads published data through the Vercel API, not from Zendesk directly.
- Load last complete encrypted report immediately when available, then fetch ticket pages with early previews (150 per request). KPI/Insights/Satisfaction remain based on **complete** validated snapshot, never partial counts.
- Refresh automatically when app resumes and check metadata every ten minutes while foregrounded. If `syncedAt` did not change, do not redownload data.
- Reject mixed snapshots if a new hourly GitHub sync starts while pages are being read. Keep old cache. If server sync is in progress, show old complete report.
- Separate RMA tab requirement stays: Overview, Tickets, RMA, Devices, Satisfaction. Insights stays in the header.

## Deploy
Extract ZIP under `E:\Supportcenter\native-android\_patches\Progressive90D`. Run:

```powershell
$root = 'E:\Supportcenter'
$p = "$root\native-android\_patches\Progressive90D"
& "$p\APPLY-PROGRESSIVE.ps1" -RepoPath $root -DryRun
& "$p\APPLY-PROGRESSIVE.ps1" -RepoPath $root
& "$p\VERIFY-PROGRESSIVE.ps1" -RepoPath $root
& "$root\native-android\RUN-BUILD.ps1" -RepoPath $root
adb devices -l
& "$root\native-android\RUN-INSTALL.ps1" -RepoPath $root -SkipBuild
```

Never skip a source guard if local repo file has unexpected edits. Source hashes are verified. The patch does **not** change backend, Vercel, GitHub workflow, login, credentials, RMA, or existing UI colors.

## Operational limitations
- The app **does not receive GitHub Actions pushes**. It detects newly published snapshots via authenticated meta request when foregrounded or on opening. App must have Internet and backend must have saved a successful snapshot.
- Current backend `sync_status=ok` and `synced_at` indicate completed snapshot. During staged sync, app keeps the last complete report; it checks version again after loading to avoid mixed results.
- Historical `metric_events=117953` are raw stored events; Android receives **only breach events** via filtered paginated API, not 117,953 raw events.
- Snapshot download is still network- and device-dependent. A first installation shows progressive previews; exact 90-day analytics require all applicable ticket and metadata pages.
- Release APK / physical Android build not verified inside this environment. Compilation and ADB install must run on user Windows system.
