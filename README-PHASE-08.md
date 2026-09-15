# Support Command Center — Phase 08

## Fix included
The Expo Router typed-route error:

```text
Argument of type `/ticket/${number}` is not assignable...
```

is fixed by using typed dynamic route objects:

```ts
router.push({
  pathname: '/ticket/[id]',
  params: { id: String(ticket.id) },
});
```

The same route-safe approach is used for Region detail.

## New UI / Product work

### Overview
- Locked professional theme maintained
- Today / 7 Days / 30 Days
- Total Tickets
- Open
- High Priority
- Unassigned
- Region distribution
- Needs Attention block
- Live / Sync indicator
- Pull to refresh
- KPI cards route to relevant ticket manager views

### Regions
- Region summary
- Region ticket count
- Open count
- High/Urgent count
- Unassigned count
- Related ticket subjects
- Ticket drill-down
- Read-only flow

## Important
Region detection in Phase 08 uses metadata/tag heuristics only.
Phase 09 will bind the real Zendesk region custom-field/form data so Europe/EMEA/US/APAC counts become authoritative.

## Install

Merge ZIP into:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-08.ps1
```

Then run with clean Expo cache:

```powershell
npx expo start -c
```
