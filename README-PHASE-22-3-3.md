# Phase 22.3.3 — Remove all @vercel/node type imports

This fixes the remaining build error from `backend/api/zendesk-diagnose.ts`.

The installer scans every `.ts` file under `backend/api`, removes `@vercel/node`
request/response type imports, replaces those parameter types with `any`, then runs:

```powershell
npx tsc --noEmit
npm run build
```

Run:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-22-3-3.ps1
```
