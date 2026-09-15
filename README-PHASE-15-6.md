# Support Command Center — Phase 15.6 FINAL Auth/Splash

This package fixes the final auth presentation and login-loading issues.

## What changed

### 1. No cropped logo

The previous generated splash crop is removed.

This phase uses the original full transparent brand asset:

`assets/brand/final/support-command-center-logo-transparent.png`

The PNG is copied directly from the original Support Command Center brand pack.
It is not cropped from the generated splash artwork.

### 2. Proper 4-second launch splash

The login experience is one continuous animated scene:

- same auth/login background
- transparent logo begins in the center
- 3-second visible hold
- logo moves upward during the next ~0.85 seconds
- logo remains at the top
- login form fades/slides in around the 4-second mark

The splash is therefore actually visible even when JavaScript loads quickly.

### 3. Native splash bridge

`expo-splash-screen` is configured with the same transparent logo and matching
light background so a fresh native build does not flash a random/old splash.

Native splash resources only change after installing a fresh development/native
build. Metro cache clearing alone cannot replace already-compiled Android/iOS
splash resources.

### 4. Removed text

These phrases are removed entirely from login/splash:

- `Read-only access`
- `Secure session`

### 5. Login no longer stays loading forever

- manual `router.replace()` after login is removed
- existing AuthContext/session gate handles authenticated navigation
- login has a 15-second UI timeout
- core API requests have a 12-second fetch abort timeout
- errors now return control to the Sign In button

### 6. Keyboard remains stable

- Android keyboard layout mode remains `resize`
- no live screen-height recalculation
- password eye toggle keeps focus
- email Next focuses password
- keyboard taps persist

## Install

Merge into:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-15-6.ps1
```

Expected:

```text
PASS: full transparent logo + auth background present.
PASS: native splash config updated.
PASS: login/splash footer text removed.
PASS: Phase 15.6 FINAL auth/splash installed.
```

## Mobile backend URL

After the Vercel backend is deployed, edit:

`E:\Supportcenter\apps\mobile\.env`

and set:

```env
EXPO_PUBLIC_API_BASE_URL=https://YOUR-PROJECT.vercel.app
```

Then:

```powershell
npx expo start -c
```

## GitHub

The package also adds a root `.gitignore` so mobile/backend `.env` files are not
committed.
