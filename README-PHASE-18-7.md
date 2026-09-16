# Phase 18.7 — Final Brand Assets

This package standardizes the app on ONE approved Support Command Center identity.

## Source of truth
- App launcher icon: the new glossy green/cyan icon selected by the user.
- UI mark: `support-command-center-mark.png`.
- Old `support-command-center-wordmark*` and `support-command-center-logo-transparent.png`
  are not used by the active app.

## Generated assets
- `assets/brand/app-icon.png`
- `assets/brand/adaptive-icon-foreground.png`
- `assets/brand/adaptive-icon-background.png`
- `assets/brand/adaptive-icon-monochrome.png`
- `assets/brand/notification-icon.png`
- `assets/brand/final/support-command-center-mark.png`
- `assets/brand/final/support-command-center-splash-lockup.png`
- App Store / Play Store / favicon / iOS icon variants

## Splash behavior
Native Expo splash and the animated login intro use the same lockup:
- mark
- Support
- Command Center
- ZENDESK MANAGER CONSOLE

The lockup has extra transparent safe margins so the text is not cropped.

## Versions
- App: `0.2.2`
- Android `versionCode`: `3`
- iOS `buildNumber`: `3`

## Install
Extract/merge this ZIP into:

`E:\Supportcenter`

Then run:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-18-7.ps1
```

Then create a fresh APK:

```powershell
eas build -p android --profile preview --clear-cache
```

For icon/splash testing, uninstall the old app before installing the new APK.
