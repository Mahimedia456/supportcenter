# Support Command Center — Phase 06 Mobile Zendesk Core

Phase 06 starts the remaining mobile product work after backend/auth/database stabilization.

## Included

### Tickets
- Real Zendesk Views
- View ticket list
- Ticket subject
- Status / priority / updated age
- Pull-to-refresh
- Zendesk health indicator
- Read-only badge
- Loading, error and empty states
- Tap ticket to open detail

### Ticket Detail
- Subject / description
- Status / priority / type
- Requester, assignee, group and form IDs
- Created / updated dates
- Tags
- Full read-only Zendesk comments/conversation
- Public vs internal note indicator
- Pull-to-refresh
- No reply/update/assign/solve actions

### Insights / Forms
- Real active Zendesk forms
- Workspace-specific form list
- Live form count
- Pull-to-refresh

## Workspace behavior
Aamir -> AngelBird
Shahid -> Atomos

The existing authenticated workspace determines which Zendesk instance is used.

## Install

Extract/merge ZIP at:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-06.ps1
```

Run backend:

```powershell
cd E:\Supportcenter\backend
npm run start:dev
```

Run mobile:

```powershell
cd E:\Supportcenter\apps\mobile
npm start
```

## Next
Phase 07 will add Manager Views, search/filter UX, user/agent/group enrichment and stronger ticket list details.
