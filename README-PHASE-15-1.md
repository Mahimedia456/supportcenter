# Support Command Center — Phase 15.1 Dependency Fix

Your Phase 15 installer failed because the project had:

- `react-native-reanimated@4.6.0`
- `react-native-worklets@0.10.4`

Reanimated 4.6.0 expects Worklets 0.12.x, while Expo SDK 57 uses the 0.10.x
Worklets line. This causes npm `ERESOLVE` before `expo-linear-gradient` can even
be installed.

This patch aligns the animation pair to:

- `react-native-reanimated@4.5.1`
- `react-native-worklets@0.10.2`

Then it installs:

- `expo-linear-gradient`
- `react-native-safe-area-context`

It also runs:

- npm dependency verification
- mobile TypeScript
- `expo install --check`
- Expo Doctor
- backend TypeScript

## Install

Merge into:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-15-1.ps1
```

After it passes, rerun:

```powershell
.\INSTALL-PHASE-15-FINAL.ps1
```

Then:

```powershell
npx expo start -c
```
