# Phase 22.1 — Cache Route + Month Filter Fix

## Root cause

The mobile app was calling:

- `GET /zendesk/cache/snapshot`
- `POST /zendesk/cache/sync`

but the deployed Nest application had not actually registered
`ZendeskCacheController` / `ZendeskCacheService` in `AppModule`.

That caused:

- `Cannot GET /zendesk/cache/snapshot`
- `Cannot POST /zendesk/cache/sync`
- empty Insights
- Devices snapshot failures
- 90-day refresh failures

This installer registers the existing Phase 19 cache controller/service robustly.

## Filters

The shared filter row is now larger and includes:

`Today | 7D | 30D | Current Month | Previous Month | 2 Months Ago | 90D | filter`

Example in September:

`Today | 7D | 30D | Sep | Aug | Jul | 90D | filter`

## Install

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-22-1.ps1
```

Then deploy:

```powershell
cd E:\Supportcenter
git add .
git commit -m "Register Zendesk cache routes and add month filters"
git push
```

After Vercel deploy completes, restart the app and pull down once on Insights
or Devices.
