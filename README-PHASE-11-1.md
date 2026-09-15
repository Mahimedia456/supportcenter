# Phase 11.1 — Expo Router Typed Route Fix

Fixes TypeScript errors for:

- `/device/[name]`
- `/agent/[id]`

Expo Router's generated route union can lag behind newly added dynamic files.
The patch keeps the real dynamic routes and casts their route objects as `Href`.

Install:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-11-1.ps1
```

Then rerun Phase 11:

```powershell
.\INSTALL-PHASE-11.ps1
```
