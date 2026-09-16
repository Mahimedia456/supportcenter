# Phase 18.7.1 — Installer Compatibility Fix

Your PowerShell environment did not accept `Get-Content -Raw`.

This patch replaces all raw file reads/writes in the Phase 18.7 installer with:

- `[System.IO.File]::ReadAllText()`
- `[System.IO.File]::WriteAllText()`

The Phase 18.7 assets can remain merged. You do not need to undo them.

## Run

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-18-7-1.ps1
```

Then:

```powershell
eas build -p android --profile preview --clear-cache
```
