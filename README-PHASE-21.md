# Phase 21 — Data Recovery + Fast Snapshot + UI Fix

This patch addresses the regressions after the DB-first / 90-day transition.

## Why values disappeared
Phase 20 moved Insights and Devices to the DB snapshot and depended heavily on
field metadata mapping. Ticket detail could still display custom-field values,
but aggregation could return empty when the field metadata/title mapping did
not match exactly.

Phase 21 resolves dimensions directly from ticket `custom_fields` plus Zendesk
field option labels.

## Performance
`zendesk-db.ts` now keeps one in-memory snapshot with a 5-minute TTL and dedupes
in-flight requests. Once one data screen has loaded, other data screens reuse
the same snapshot immediately.

A pull-to-refresh still performs a forced Zendesk -> DB sync and replaces the
memory snapshot.

## Date controls
Common reporting controls:
- Today
- 7 Days
- 30 Days
- 90 Days
- Custom (clamped to 90-day data scope)

Applied to:
- Home filter component
- Tickets
- Insights
- Devices
- Device detail
- Drill-down ticket results

## Device detail
Removed View Health.

Cards:
- Open
- Faulty
- RMA
- Unassigned

Each card opens the dedicated result list for that same device and that metric.

## Ticket results
- top safe-area/back button fixed
- same period filter
- status filter
- names instead of IDs for Assignee / Group / Form

## Install
```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-21.ps1
```

No new SQL is required.
