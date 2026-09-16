# Phase 19 — DB-first Zendesk Sync + Single Splash

Changes requested:

- Store Zendesk reporting data in Supabase first.
- App reads cached DB snapshot instead of waiting on Zendesk for every screen.
- Vercel syncs Zendesk -> DB every hour.
- Pull-to-refresh triggers an immediate sync.
- Initial loader says `Initializing support data…`.
- Last database snapshot remains usable if Zendesk is temporarily slow.
- Native splash becomes background-only.
- Only the existing animated login mark remains: mark animates upward, then login form appears.
- No wordmark/text inside splash image, preventing crop/cut-off.

Vercel env:

```text
CRON_SECRET=<long random secret>
```

Install:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-19.ps1
```

Then:

```powershell
cd E:\Supportcenter
git add .
git commit -m "Add DB-first Zendesk sync and single splash"
git push
```

After Vercel redeploy, hourly cron is scheduled at minute 0 of every hour.

App version: 0.2.3
Android versionCode: 4
