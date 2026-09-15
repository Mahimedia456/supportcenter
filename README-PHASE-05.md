# Phase 05 — Supabase Connectivity Guard

This patch does not invent a Supabase pooler hostname. The exact Session Pooler URI is project-specific and must be copied from Supabase Dashboard > Connect > Session pooler.

## Apply
Extract/merge at `E:\Supportcenter`.

## Configure Session Pooler
```powershell
cd E:\Supportcenter\backend
powershell -ExecutionPolicy Bypass -File .\scripts\configure-supabase-pooler.ps1
npm run db:check
npm run seed:phase02
npm run start:dev
```

The helper validates that the shared pooler username contains the project ref and safely URL-encodes the DB password if the copied URI still contains the password placeholder.
