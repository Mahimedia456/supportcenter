# Support Command Center — Phase 15.5

Fixes the remaining TypeScript error in `AppTextField.tsx`.

The installed React Native version types:

- `onFocus` as `FocusEvent`
- `onBlur` as `BlurEvent`

The prior code explicitly forced the older
`NativeSyntheticEvent<TextInputFocusEventData>` shape.

Phase 15.5 changes the handlers to derive their event type directly from
`TextInputProps`:

```ts
Parameters<NonNullable<TextInputProps['onFocus']>>[0]
```

and:

```ts
Parameters<NonNullable<TextInputProps['onBlur']>>[0]
```

This preserves:
- password focus stability
- eye-toggle focus preservation
- keyboard behavior
- current login animation

## Install

Merge into:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-15-5.ps1
```

Expected:

```text
PASS: TextInput event typing patched.
PASS: Phase 15.5 TextInput typing fix complete.
```

Then:

```powershell
npx expo start -c
```
