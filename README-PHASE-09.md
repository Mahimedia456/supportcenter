# Support Command Center — Phase 09

## Theme remains locked
- Off-white/light background
- Refined deep green primary
- Cyan information accent
- Controlled lime live/healthy highlight
- Rounded white cards
- Thin professional borders
- Read-only manager UX

## Backend additions

New read-only Zendesk endpoints:

- `GET /zendesk/fields`
- `GET /zendesk/groups`
- `GET /zendesk/agents`
- `GET /zendesk/analytics/tickets?days=30`

The analytics endpoint retrieves up to the first 1,000 Zendesk Search results
for the selected period. It does not update Zendesk.

## Mobile additions

### Automatic real custom-field mapping
The app inspects actual active Zendesk Ticket Fields and detects likely:

- Region
- Device / Product / Model
- Issue / Fault / Problem

It also resolves dropdown option machine values into their human-readable names.

No AngelBird/Atomos field ID is hard-coded.

### Forms
Actual `ticket_form_id` values are joined with real active Zendesk forms.

The Forms tab shows:
- ticket volume
- open tickets
- high/urgent
- unassigned
- related ticket subjects

### Issues
Same manager breakdown for Issue/Fault.

### Devices
Same breakdown for Device/Product.

### Regions
Same breakdown for Region.

All rows expand into real read-only ticket cards and ticket detail drill-down.

## Install

Extract/merge at:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-09.ps1
```

Restart backend after installing because the Zendesk controller/service changed:

```powershell
cd E:\Supportcenter\backend
npm run start:dev
```

Then mobile:

```powershell
cd E:\Supportcenter\apps\mobile
npx expo start -c
```

## Next
Phase 10 = dedicated Device Health module:
faulty/RMA classification, top faults, region/device crossover, trends, and related tickets.
