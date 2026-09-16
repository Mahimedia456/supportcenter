# Backend Phase 22.3.5 — zendesk-diagnose repair

This is a **backend-only** patch.

It repairs the syntax corruption created in `api/zendesk-diagnose.ts` by the
previous global type replacement.

Fixes:

- duplicate `any` identifiers in the import block
- broken `from ;` syntax
- any remaining `@vercel/node` import
- `clean` being imported with `import type` while used at runtime

Run from the backend folder:

```powershell
cd E:\Supportcenter\backend
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-BACKEND-PHASE-22-3-5.ps1
```

The installer runs:

```powershell
npx tsc --noEmit
npm run build
```

Only push if both pass.
