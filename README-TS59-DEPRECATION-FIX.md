# Support Command Center — TypeScript 5.9 Deprecation Fix

This patch addresses the VS Code Problems shown for:

- `apps/mobile/tsconfig.json`
  - `baseUrl` deprecation warning

- `backend/tsconfig.json`
  - `baseUrl` deprecation warning
  - `moduleResolution=node10` deprecation warning

The patch does **not** change the current module-resolution behavior yet.

It adds:

```json
"ignoreDeprecations": "6.0"
```

to both `compilerOptions` blocks.

This is the safest compatibility fix while the project is still on the current
NestJS / Expo configuration.

## Install

Extract into:

`E:\Supportcenter`

Then run:

```powershell
cd E:\Supportcenter
Set-ExecutionPolicy -Scope Process Bypass -Force
.\tools\FIX-TYPESCRIPT-59-DEPRECATIONS.ps1
```

Expected:

```text
PASS: TypeScript 5.9 deprecation diagnostics fixed.
```

If VS Code still displays stale Problems after the script passes:

```text
Ctrl + Shift + P
TypeScript: Restart TS Server
```
