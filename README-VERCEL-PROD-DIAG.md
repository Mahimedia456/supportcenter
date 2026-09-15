# Support Command Center — Vercel Production Diagnostic Fix

Use this when health endpoints work but mobile login returns HTTP 500.

## Important

If `/health` or `/api/health` returns `ok: true`, Vercel itself is alive.

A mobile login HTTP 500 generally means one of:

- missing Vercel environment variable
- database connection failure
- wrong Supabase pooler URL
- missing auth secrets
- Nest bootstrap/runtime error

## New safe diagnostic endpoint

After deploy:

```text
https://supportcenter-kappa.vercel.app/api/diagnose
```

It reports only:

- whether required env variables are present (`true/false`)
- database host/port without username/password
- whether `select 1` succeeds
- database error code if it fails

It never returns secret values.

## Root routing

After this deploy:

- `/`
- `/health`
- `/api/health`

all return health.

## Vercel

Do not add a `PORT` variable.

## Install

```powershell
cd E:\Supportcenter\backend
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-VERCEL-PROD-DIAG.ps1
```
