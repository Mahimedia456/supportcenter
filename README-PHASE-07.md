# Support Command Center — Phase 07 Advanced Tickets UX

## Design lock
This phase preserves the agreed visual direction:

- Light / soft off-white background
- Refined deep green primary
- Cyan information/navigation accent
- Lime only as a controlled highlight
- White rounded cards
- Thin quiet borders
- Professional SaaS/support-operations appearance
- No client logo on login
- AngelBird / Atomos branding only after workspace resolution

## Added

### Ticket modes
- Zendesk Views
- Manager Views
- All Tickets

### Manager Views
- Needs Attention
- Open
- Pending
- Unassigned
- High Priority
- Recently Updated

These are read-only convenience views derived from the currently loaded Zendesk ticket set.
More advanced response/SLA/CSAT views are added when those metrics are wired in later phases.

### Search
Searches:
- ticket ID
- subject
- description
- status
- priority
- type
- tags

### Sorting
- Latest
- Priority
- Newest
- Oldest update

### Ticket card redesign
- Subject-first hierarchy
- Ticket ID
- Status
- Priority
- Updated age
- Assignee state
- Form ID
- Type
- Tags
- Read-only manager indicator

### States
- Loading
- Error
- Empty
- Pull to refresh

## Install

Extract/merge at:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-07.ps1
```

Run backend and mobile normally.

## Next
Phase 08 = real Overview + Regions with KPI cards, Needs Attention, Today/7d/30d selectors and ticket drill-down.
