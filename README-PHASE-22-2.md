# Phase 22.2 — Direct Vercel Cache Endpoints

The old route:

`/zendesk/cache/snapshot`

continues to return 404 in production, so Phase 22.2 bypasses Nest/rewrite routing entirely.

New direct serverless endpoints:

- `GET /api/zendesk-cache-snapshot`
- `POST /api/zendesk-cache-sync`

Mobile now uses those endpoints directly.

The sync endpoint:
- authenticates the existing access JWT
- resolves the workspace
- loads the last 90 days of Zendesk tickets
- preserves full ticket `custom_fields`
- loads Forms / Fields / Groups / Agents / Satisfaction / Metrics
- upserts the canonical Supabase snapshot

## Install

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-22-2.ps1
```

Then deploy:

```powershell
cd E:\Supportcenter
git add .
git commit -m "Add direct Vercel support cache endpoints"
git push
```

After Vercel completes, test:

`https://supportcenter-kappa.vercel.app/api/zendesk-cache-snapshot`

Without an Authorization header the correct result is HTTP 401 / Unauthorized.
A 404 means the Vercel project root/deployment is not including `backend/api`.
