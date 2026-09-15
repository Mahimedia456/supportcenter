# Support Command Center — Phase 15.4

This replaces the oversized nested splash-image login with a proper coded
animated authentication experience.

## Animation flow

1. App/login background appears.
2. Brand/logo begins centered.
3. Logo animates upward and scales down.
4. Logo remains at the top.
5. Login card fades and slides into place.
6. Secure/read-only footer fades in.

The login screen does **not** embed a full splash screenshot anymore.

## Password keyboard glitch fix

Android keyboard focus was unstable because the screen could re-layout when
the keyboard changed the reported window height.

Phase 15.4 fixes this by:

- locking responsive layout to the initial window height
- not recalculating compact mode when the keyboard opens
- Android `KeyboardAvoidingView` has no `height` behavior
- `softwareKeyboardLayoutMode = "resize"`
- password eye toggle explicitly preserves TextInput focus
- `keyboardShouldPersistTaps="always"`
- password field uses `blurOnSubmit={false}`
- email `Next` moves focus directly to password
- keyboard animation does not restart the intro animation

## Native splash

The native splash is intentionally kept minimal with the same light brand
background. The animated logo transition begins in React Native immediately
after JavaScript loads.

Native splash/app config changes require a newly installed development/native
build. `npx expo start -c` alone cannot change native splash resources inside an
already-installed build.

## Install

Merge into:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-15-4.ps1
```

Expected:

```text
PASS: Phase 15.4 Animated Auth + Keyboard Fix installed.
```

Then for UI:

```powershell
npx expo start -c
```
