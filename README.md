# Phase 24.1 Installer Fix

PowerShell treats variable names case-insensitively, so `$Home` conflicts with the built-in read-only `$HOME`.

This installer replaces:
- `$Home` → `$HomeScreen`
- `$HomeText` → `$HomeScreenText`

No application or backend logic is changed.

Run:

```powershell
cd E:\Supportcenter
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-24-1.ps1
```
