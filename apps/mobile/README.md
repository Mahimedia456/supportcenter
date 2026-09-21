# Expo Standalone Startup Fix

Changes are intentionally limited to startup/build behavior.

## Changed
- Removed legacy Expo `splash` config.
- Native Expo splash uses a transparent 2x2 asset on the same login background color.
- Existing animated login logo remains.
- Removed the 3-second artificial login-logo hold. Animation starts immediately.
- EAS `preview` builds a standalone Android APK.
- Added `BUILD-EAS-PREVIEW-APK.ps1`.

## Not changed
- Login form
- Authentication logic
- Backend/API URL
- Tabs
- Overview
- Tickets
- Alerts
- Satisfaction
- Insights
- Devices
- Profile
- Existing internal UI/behavior

## Install

```powershell
cd <extracted-patch-folder>

Set-ExecutionPolicy -Scope Process Bypass -Force

.\INSTALL-EXPO-STANDALONE-STARTUP-FIX.ps1 -ProjectRoot "E:\Supportcenter\apps\mobile"
```

## EAS standalone APK

```powershell
cd E:\Supportcenter\apps\mobile

Set-ExecutionPolicy -Scope Process Bypass -Force

.\BUILD-EAS-PREVIEW-APK.ps1
```

The first EAS build may ask you to log in and/or link/create the EAS project.

The `preview` APK does not need Expo Go, Metro, or `expo start`.

## Important Android behavior
Android always owns the very first native launch frame. This patch makes that frame visually blank on the same background instead of showing a second logo. The first visible branded element is the existing animated Support Command Center logo on the login screen.
