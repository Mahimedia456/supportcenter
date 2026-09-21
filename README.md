# Phase 24.4 Installer V2

Use this if Phase 24.4 files were already extracted and merged directly into:

`E:\Supportcenter`

Run:

```powershell
cd E:\Supportcenter

Set-ExecutionPolicy -Scope Process Bypass -Force

.\INSTALL-PHASE-24-4-V2.ps1 -ProjectRoot "E:\Supportcenter"
```

The installer detects that the patch source and project root are the same folder, skips file copying, and continues with:
- database migration
- backend TypeScript
- backend build
- mobile TypeScript
- Phase 24.4 verification
