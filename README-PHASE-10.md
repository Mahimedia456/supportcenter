# Support Command Center — Phase 10 Device Health

## Design
The locked UI direction is preserved:
- light/off-white canvas
- refined green primary
- cyan informational accents
- controlled lime live/healthy highlights
- white rounded cards
- quiet professional borders

## Device tab
The Devices tab is now a dedicated manager health screen.

Includes:
- device/product search
- All / Faulty / RMA / Rising filters
- total device count
- total support cases
- faulty signal count
- RMA signal count
- device cards
- 7-day vs previous 7-day trend
- Open / Faulty / RMA / High metrics

## Device detail
Tap any device to see:
- total cases
- open cases
- faulty signals
- RMA signals
- last 7 days
- previous 7 days
- trend percentage
- top faults/issues
- region split
- actual related ticket subjects
- read-only ticket drill-down

## Faulty and RMA logic
The app derives Faulty/RMA signals from:
- actual Zendesk forms
- detected Issue/Fault field
- ticket subject/description
- ticket tags

No Zendesk write action is added.

## Install

Merge ZIP into:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-10.ps1
```

Run:

```powershell
cd E:\Supportcenter\backend
npm run start:dev
```

And:

```powershell
cd E:\Supportcenter\apps\mobile
npx expo start -c
```

## Next
Phase 11 = Customer Feedback + Team:
Good/Bad CSAT, bad-feedback ticket drill-down, agent workload, assigned/open/high counts, and manager agent detail.
