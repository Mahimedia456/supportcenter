# Phase 22.3.1 — Hourly Endpoint Fix

The GitHub Actions workflow returned HTTP 404 because the URL existed in the
workflow but the actual `backend/api/zendesk-hourly-sync.ts` Vercel function
was not present in the deployed code path.

This patch explicitly adds the function.

The endpoint:

`GET /api/zendesk-hourly-sync`

requires:

`Authorization: Bearer <CRON_SECRET>`

It syncs the last 90 days for configured workspaces into
`public.zendesk_cache_snapshots`.

## Install

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-22-3-1.ps1
```

Then:

```powershell
cd E:\Supportcenter
git add .
git commit -m "Add missing hourly Zendesk sync function"
git push
```

After Vercel deployment completes, test the route without auth:

`https://supportcenter-kappa.vercel.app/api/zendesk-hourly-sync`

Expected without a Bearer token:

`401 Unauthorized`

Then run the GitHub Actions workflow manually.
