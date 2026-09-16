# Phase 22 — Global Snapshot + Filter Recovery

This fixes the current regression where Home has data but Insights/Devices behave as if they have their own separate snapshot.

## Global snapshot
Insights, Devices, Device Detail and Ticket Results now use one singleton support-data store.

The snapshot is persisted with AsyncStorage under one 90-day cache key. Once loaded or refreshed, switching between these screens does not fetch the DB snapshot again.

## Filters
The following visible filter row is present on all affected reporting/drill-down screens:

`Today | 7 Days | 30 Days | 90 Days | filter`

Custom range is clamped to the 90-day reporting scope.

## Insights
Custom-field aggregations use ticket `custom_fields` plus Zendesk field option labels. This restores Device / Support Type / Region / Category / Fault / RMA values when field metadata is present in the DB snapshot.

## Devices
Device list and Device Detail use the same snapshot as Insights.

Device Detail cards:
- Open
- Faulty
- RMA
- Unassigned

Each card opens `/ticket-results` with the device and metric filter already applied.

## Ticket Results
Uses the same snapshot and shows actual Assignee / Group / Form names instead of their IDs.

## Install

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-22.ps1
```

After it passes, restart the app and pull down once on Insights or Devices.
