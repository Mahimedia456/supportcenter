# Phase 18.4 — Device Detail Export Fix

Phase 18.3 replaced `device-health.ts` with the new Atomos custom-field
aggregation but accidentally removed three helpers still required by
`device/[name].tsx`:

- `deviceTickets`
- `regionsForDevice`
- `topIssuesForDevice`

That caused the three missing-export errors and the downstream implicit-any
errors.

Phase 18.4 restores those helpers against the new Atomos mapper and also
installs a strongly typed device detail screen with:

- SafeAreaView
- proper chevron back icon
- actual related device tickets
- top faults derived from Fault Category -> Category -> Support Type
- region breakdown
- ticket cards with Agent / Group / Form names

## Install

Merge into `E:\Supportcenter`, then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-18-4.ps1
```
