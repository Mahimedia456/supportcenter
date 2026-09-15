# Support Command Center — Phase 15 FINAL

This is the final mobile polish + release-readiness phase.

## Final login redesign

The login screen now uses:

- branded Support Command Center splash artwork
- premium light/off-white layout
- green/cyan/lime visual language
- elevated rounded login card
- gradient Sign In button
- focused input state
- password visibility toggle
- email next -> password focus
- keyboard-safe layout
- interactive keyboard dismissal on iOS
- drag-dismiss keyboard on Android
- automatic keyboard inset handling
- scrollable login content when keyboard reduces viewport
- error state card
- disabled/loading button states

## Splash

The generated branded splash artwork is included at:

`apps/mobile/assets/final/support-command-center-splash.png`

The installer patches `app.json` when present so Expo uses this image as the
native splash for iOS and Android.

## App polish foundation

Reusable UI components included:

- `PrimaryButton`
- `AppTextField`
- `KeyboardAwareScreen`
- `PolishedCard`
- `finalTheme`

These establish a consistent final product language for future refinements.

## Existing product behavior preserved

- exactly 5 bottom tabs
- Overview
- Tickets
- Insights
- Devices
- Alerts
- Profile/System Health remain secondary screens
- Zendesk remains read-only
- workspace mapping remains unchanged
- AngelBird/Atomos branding remains post-login
- backend/API contracts are not replaced

## Final installer

Merge ZIP into:

`E:\Supportcenter`

Then run:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-15-FINAL.ps1
```

The installer:

1. installs Expo-compatible gradient/safe-area dependencies
2. verifies splash artwork
3. patches Expo splash config where `app.json` exists
4. runs mobile TypeScript
5. runs Expo Doctor
6. runs backend TypeScript
7. checks final critical UI files

Then:

```powershell
cd E:\Supportcenter\backend
npm run start:dev
```

and:

```powershell
cd E:\Supportcenter\apps\mobile
npx expo start -c
```

## Build readiness

After this phase passes, the next operational step is an EAS development/preview
build followed by Android AAB and iOS TestFlight/App Store builds.
