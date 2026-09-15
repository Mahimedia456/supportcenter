# Support Command Center — Phase 15.3

This hotfix addresses the remaining TypeScript error:

```text
Duplicate identifier 'signOut'
```

The profile screen correctly receives `signOut` from `AuthContext`, but the
Final UI also created a local wrapper function named `signOut`.

Phase 15.3 changes the local wrapper to:

```ts
async function handleSignOut() {
  await signOut();
}
```

and updates the logout button to:

```tsx
onPress={handleSignOut}
```

No dependencies are reinstalled.

## Install

Merge into:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-15-3.ps1
```

Expected:

```text
PASS: profile signOut collision patched.
PASS: Phase 15.3 final hotfix complete.
```

Then start:

```powershell
cd E:\Supportcenter\backend
npm run start:dev
```

and:

```powershell
cd E:\Supportcenter\apps\mobile
npx expo start -c
```
