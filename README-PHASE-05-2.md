# Support Command Center — Phase 05.2

Fixes the incorrect installer root resolution.

Old:
`Join-Path $PSScriptRoot "..\..\.."` -> resolves to `E:\`

Correct:
`Join-Path $PSScriptRoot "..\.."` -> resolves to `E:\Supportcenter`

Install:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-05-2.ps1
```

This path fix will also be carried forward into Phase 06 and later installers.
