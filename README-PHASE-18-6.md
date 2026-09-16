# Phase 18.6 — APK Production Runtime Fix

Fixes:
- Installed APK no longer falls back to `http://10.0.2.2:3000`.
- EAS preview/production builds receive `EXPO_PUBLIC_API_BASE_URL=https://supportcenter-kappa.vercel.app`.
- Native Expo splash becomes a plain `#F7FCFA` launch background.
- Existing custom animated Support Command Center splash remains the only branded splash.
- Android normal/adaptive launcher icon uses `assets/brand/app-icon.png`.
- Version bumped to `0.2.1`, Android versionCode `2`.

Install:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-18-6.ps1
```

Then create a NEW APK:

```powershell
eas build -p android --profile preview --clear-cache
```
