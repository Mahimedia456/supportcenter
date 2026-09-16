# Phase 22.3.2 — Vercel Type Import Fix

Vercel build failed with:

```text
Cannot find module '@vercel/node' or its corresponding type declarations
```

The new direct API files only used `@vercel/node` for TypeScript request/response
types. The backend does not need that package at runtime.

This patch removes the type-only import from:

- `backend/api/zendesk-cache-snapshot.ts`
- `backend/api/zendesk-cache-sync.ts`
- `backend/api/zendesk-hourly-sync.ts`

and changes the function parameters to compatible local `any` types.

No npm package is added.

## Run

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-22-3-2.ps1
```

The installer runs:

```powershell
npx tsc --noEmit
npm run build
```

Do not push unless both pass.
