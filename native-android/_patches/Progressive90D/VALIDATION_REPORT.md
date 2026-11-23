# Offline validation report

- Source baselines are from the previously delivered native Android Batch 3 files and complete UI screen reference.
- Patch contains three guarded source replacements, two new Kotlin files, and a surgical `SupportScreens.kt` insertion. Existing login, theme, RMA/Devices/Satisfaction routes, backend, SQL, env and GitHub workflows are not overwritten.
- All bundled file SHA-256 hashes are recorded and validated in the installer.
- Streaming code reads complete cached snapshot immediately, pages primary tickets, emits first-page preview, then fetches classifications and supplemental data. It checks the published `syncedAt`/`syncStatus` before accepting any final report.
- If Git sync is active, or the server publishes a new version mid-read, only the previously complete saved data remains available; partial analytics are not published.
- MainActivity checks for changes on resume and every 10 minutes while lifecycle is STARTED. No continuous background service and no websocket are claimed.
- **Not validated:** actual Windows PowerShell 5.1 installer execution, Android Gradle compilation, ADB installation, physical device memory pressure, production API behavior. These require user-side testing; no APK is included.
- **Operational caveat:** GitHub scheduling and Vercel Cron are separate and a scheduled workflow run is not guaranteed to have written to the *new* Supabase. Only `syncedAt`/`sync_status=ok` + nonzero rows in new database prove a complete published snapshot.
