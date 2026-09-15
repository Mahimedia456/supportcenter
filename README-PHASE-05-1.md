# Phase 05.1 — Supabase Pooler SSL Fix

This patch fixes `SELF_SIGNED_CERT_IN_CHAIN`.

## Root cause
The previous Phase 05 DB checker converted `sslmode=require` to
`sslmode=verify-full`. That forced certificate-chain verification on the
local Windows environment.

The patch applies one consistent DB configuration to:

- `backend/scripts/check-db.ts`
- `backend/scripts/seed-phase02.ts`
- `backend/src/database/database.service.ts`

TLS remains enabled, while Node certificate rejection is disabled for the
Supabase pooler connection.

## Install
Extract/merge this ZIP at:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-05-1.ps1
```

If verification passes:

```powershell
cd E:\Supportcenter\backend
npm run seed:phase02
npm run start:dev
```

Do not paste instruction numbering such as `1.` or `5.` into PowerShell.
