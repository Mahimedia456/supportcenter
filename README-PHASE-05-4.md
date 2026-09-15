# Phase 05.4 — NestJS `.env` Runtime Fix

## Problem
`npm run db:check` works because the script explicitly loads `dotenv/config`,
but `nest start --watch` was starting without loading `backend/.env`.

That caused:

`SUPABASE_DATABASE_URL is required`

## Fix
The installer safely prepends:

```ts
import 'dotenv/config';
```

to:

- `backend/src/main.ts`
- `backend/src/database/database.service.ts` (defensive)

It then verifies:
- backend TypeScript
- DB connectivity
- runtime `.env` visibility

## Install

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-05-4.ps1
```

Then:

```powershell
cd E:\Supportcenter\backend
npm run seed:phase02
npm run start:dev
```
