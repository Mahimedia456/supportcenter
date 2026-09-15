# Support Command Center — Phase 11 Feedback + Team

## Theme
The established design remains unchanged:
- light/off-white background
- refined green primary
- cyan informational accents
- lime only for healthy/live status
- clean rounded cards
- thin professional borders

## Feedback
New Zendesk read-only satisfaction endpoint:

`GET /zendesk/satisfaction?days=30`

Mobile Feedback view includes:
- Total ratings
- Good %
- Bad %
- Good count
- Bad count
- Bad feedback by Device
- Bad feedback by Region
- Bad feedback by Form
- Bad-feedback related ticket subjects
- Ticket drill-down

No rating or ticket is modified.

## Team
Team view includes:
- Active agent list
- Assigned tickets
- Open tickets
- High/Urgent tickets
- Good/Bad CSAT per agent
- Agent detail
- Assigned ticket drill-down

## Agent Detail
Shows:
- assigned
- open
- high
- CSAT
- Good ratings
- Bad ratings
- Pending tickets
- real ticket list

## Install
Merge at:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-11.ps1
```

Restart backend:

```powershell
cd E:\Supportcenter\backend
npm run start:dev
```

Mobile:

```powershell
cd E:\Supportcenter\apps\mobile
npx expo start -c
```

## Next
Phase 12 = Alerts + notification center:
SLA/no-response foundations, high-priority/unassigned alerts, device/form/region spike alerts, push-token foundation and deep links.
