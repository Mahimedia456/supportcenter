# Phase 20 — 90-Day Scope + Insights Redesign + Unified Ticket Results

## Data scope
Zendesk reporting is now strictly limited to the last 90 days.

- DB cache sync: 90 days
- hourly Vercel cron: 90 days
- satisfaction: 90 days
- ticket metrics: 90 days
- app "All": all available tickets inside the cached 90-day window

## Insights redesign
Insights now uses:
- 90-day KPI summary
- icon-based segmented navigation
- field mapping panel
- proportional bars
- counts
- better empty/loading states
- tap-to-open drill-down

## Drill-down behavior
Forms, Products/Devices, Regions, Support Type, Category, Fault and RMA open:

`/ticket-results`

That screen has:
- proper SafeArea back button
- search
- status filters
- priority filters
- assignment filters
- newest/oldest sort
- the same TicketCard component used elsewhere
- pull-down Zendesk -> DB sync

It does not alter the main Tickets tab state.

## Install
```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-20.ps1
```
