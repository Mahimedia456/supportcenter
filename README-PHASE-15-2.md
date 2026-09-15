# Support Command Center — Phase 15.2 Final UI Hotfix

Fixes the three TypeScript errors seen after Phase 15.1.

## Fixed

### AuthContext login contract

Existing `AuthContext` exposes:

```ts
signIn(email, password)
signOut()
```

The Final UI had incorrectly used:

```ts
login(...)
logout()
```

Phase 15.2 corrects both screens.

### Vector icons

`AppTextField` uses Expo Ionicons, so Phase 15.2 installs:

```text
@expo/vector-icons
```

with Expo's compatible package installer.

## Install

Merge into:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-15-2.ps1
```

Expected:

```text
PASS: signIn/signOut found.
PASS: Phase 15.2 final UI hotfix complete.
```

Then run:

```powershell
cd E:\Supportcenter\backend
npm run start:dev
```

and:

```powershell
cd E:\Supportcenter\apps\mobile
npx expo start -c
```

You do not need to rerun Phase 15.1.
