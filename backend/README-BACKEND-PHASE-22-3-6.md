# Backend Phase 22.3.6 — Diagnose Surgical Fix

Backend-only repair for the malformed import block remaining in:

`backend/api/zendesk-diagnose.ts`

Run:

```powershell
cd E:\Supportcenter\backend
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-BACKEND-PHASE-22-3-6.ps1
```

The script prints the first 25 repaired lines, then runs:

```powershell
npx tsc --noEmit
npm run build
```

Only push if both pass.
