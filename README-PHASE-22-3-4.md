# Phase 22.3.4 — Hard Remove Vercel Type References

Phase 22.3.3 still left an `@vercel/node` reference in
`backend/api/zendesk-diagnose.ts`.

This patch is intentionally more aggressive:

- scans every `backend/api/**/*.ts`
- removes any line containing `@vercel/node`
- removes multiline import blocks containing Vercel request/response types
- replaces `VercelRequest` / `VercelResponse` symbols with `any`
- verifies zero references remain
- runs TypeScript
- runs production build

Run:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-22-3-4.ps1
```

Only push if the final output says:

`PASS: Phase 22.3.4 hard cleanup complete.`
