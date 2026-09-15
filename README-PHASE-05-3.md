# Phase 05.3 — Database Schema + Seed Fix

The database connection is already working.

The error:

`relation "users" does not exist`

means the Phase 02 database schema was never created in the connected
Supabase PostgreSQL database.

This patch:

1. Verifies mobile TypeScript.
2. Verifies backend TypeScript.
3. Verifies DB connectivity.
4. Applies the idempotent auth/workspace schema automatically.
5. Seeds Aamir and Shahid using the passwords already configured in `.env`.

## Install

Extract/merge at:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-05-3.ps1
```

After PASS:

```powershell
cd E:\Supportcenter\backend
npm run start:dev
```
