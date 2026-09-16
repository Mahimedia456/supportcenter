# Phase 21.2 — Home Date Filter Compatibility Fix

Phase 21.1 exposed the real Home filter contract.

Home already passes:

- `period`
- `from: Date`
- `to: Date`
- `onPreset(next)`
- `onCustom(from: Date, to: Date)`

Phase 21.2 makes `OverviewDateFilter` support that existing contract without
rewriting Home.

It also keeps compatibility with `value/onChange`.

Run:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-21-2.ps1
```

Expected:

`PASS: Phase 21.2 TypeScript clean.`
