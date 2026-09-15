# Phase 18.1 — Installer Fix

The Phase 18 installer failed before running the database migration because
PowerShell altered the inline JavaScript passed through `node -e`.

The broken expression reached Node as:

```text
process.env.SUPABASE_DATABASE_URL||")
```

Phase 18.1 removes inline JavaScript entirely.

It adds:

- `backend/tools/apply-phase18-zendesk-oauth.cjs`
- `apps/mobile/INSTALL-PHASE-18-1.ps1`

The migration runner:
- loads `backend/.env`
- connects to Supabase Session Pooler
- uses SSL with `rejectUnauthorized:false`
- applies `PHASE_18_ZENDESK_OAUTH.sql`
- verifies `public.zendesk_oauth_tokens` exists

Then the installer verifies:
- backend TypeScript
- OAuth controller/service wiring
- mobile TypeScript
- Home `All`
- login keyboard scroll

## Install

Merge this ZIP into `E:\Supportcenter` after Phase 18, then run:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-18-1.ps1
```
