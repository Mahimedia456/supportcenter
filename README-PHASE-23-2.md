# Phase 23.2 — Alerts Header + Satisfaction Tab

Final navigation:
- Overview
- Tickets
- Insights
- Devices
- Satisfaction

Alerts is no longer a bottom tab. It remains routable and opens from the bell beside Profile in `WorkspaceHeader`.

Satisfaction uses `useGlobalSupportSnapshot()` and reads `snapshot.satisfaction`, so it uses the same persisted snapshot as other reporting screens rather than making its own Zendesk request.

## Install mobile

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-MOBILE-PHASE-23-2.ps1
```

Then:

```powershell
npx expo start -c
```

## Verify GitHub hourly snapshot includes Satisfaction

```powershell
cd E:\Supportcenter\backend
Set-ExecutionPolicy -Scope Process Bypass -Force
.\VERIFY-GITHUB-SATISFACTION-SNAPSHOT.ps1
```

The current hourly sync architecture is expected to fetch Satisfaction and write it into `zendesk_cache_snapshots`; this verifier checks the deployed-source files before you rely on that assumption.
