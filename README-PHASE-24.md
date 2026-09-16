# Support Command Center — Phase 24

## Purpose

This phase fixes the current architecture rather than adding another direct Zendesk caller.

### Backend

The old hourly function performed a complete 90-day refresh for both workspaces in one Vercel invocation. It could exceed the function duration limit.

Phase 24 splits the refresh into short calls:

1. reference data
2. satisfaction
3. metrics
4. ticket chunks
5. ticket metric event chunks

The GitHub Actions workflow orchestrates those calls. Each stage writes only its own snapshot columns so a ticket-stage failure does not wipe Satisfaction.

The old parameterless daily Vercel cron remains harmless: the endpoint returns immediately and tells the caller that full refresh is GitHub-staged.

### Satisfaction

Satisfaction is a standalone snapshot stage. This is important because the previous monolithic function only persisted the row after every source finished. A timeout before the final database upsert meant Satisfaction could remain old or empty.

### Mobile

Normal screens are snapshot readers.

- Home does not call Zendesk directly.
- Home contains SLA Health:
  - actual SLA breach events when available
  - no first reply after 4 hours
  - first reply over 4 hours
  - unsolved over 72 hours
- `support-data-store` only downloads the saved database snapshot.
- Pull-down never starts a Zendesk sync.
- Pull-down shows the requested informational popup and silently checks the saved snapshot.
- Manual full Zendesk sync is under Account → Data Sync.
- Manual sync immediately shows the popup and runs the staged pipeline without blocking navigation.
- The last good AsyncStorage snapshot remains usable during failures.

## Install

Extract/merge into `E:\Supportcenter`, then:

```powershell
cd E:\Supportcenter

Set-ExecutionPolicy -Scope Process Bypass -Force

.\INSTALL-PHASE-24.ps1
```

## Deploy

Only after both backend and mobile TypeScript pass:

```powershell
cd E:\Supportcenter

git add .
git commit -m "Phase 24 snapshot only app and chunked Zendesk sync"
git push
```

Wait for Vercel production deployment.

## Test the GitHub sync

GitHub:

`Actions → Hourly Zendesk Snapshot Sync → Run workflow`

The workflow should show multiple short calls rather than one request sitting for five minutes.

## Expected data flow

```text
Zendesk
   ↓
GitHub Actions hourly staged workflow
   ↓
short Vercel stage calls
   ↓
Supabase zendesk_cache_snapshots
   ↓
Mobile snapshot GET
   ↓
Overview / Tickets / Insights / Devices / Satisfaction / Alerts
```

Manual Account sync uses the same staged backend endpoint, but GitHub hourly sync remains the primary automatic refresh mechanism.
