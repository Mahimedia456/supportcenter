# Phase 21.2.1 — Installer HOME Variable Fix

PowerShell variables are case-insensitive. `$Home` conflicted with the built-in
read-only `$HOME` variable.

This patch changes the installer variable to `$HomeScreen`.

No app code, SQL, backend, or Vercel configuration is changed.

Run:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-21-2-1.ps1
```

Expected final line:

`PASS: Phase 21.2.1 TypeScript clean.`
