# Support Command Center — Phase 15.7

Fixes the remaining TypeScript error:

```text
Property 'absoluteFillObject' does not exist on typeof StyleSheet
```

The login overlay now uses explicit absolute positioning instead of
`StyleSheet.absoluteFillObject`, which is fully compatible with the installed
React Native typings.

## Install

Merge into:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-15-7.ps1
```

Expected:

```text
PASS: login background fill patched.
PASS: Phase 15.7 absolute fill fix complete.
```

Then:

```powershell
npx expo start -c
```
