# Phase 24.2 — Satisfaction Data + Alerts Navigation/Performance Fix

## Root causes found from uploaded code

### Satisfaction
The staged backend used:

```text
/api/v2/satisfaction_ratings.json?per_page=100
```

without descending creation-date sorting.

The older stable Zendesk service used:

```text
sort_by=created_at&sort_order=desc
```

The staged implementation could therefore read old pages and then remove them with the 90-day cutoff, leaving the snapshot Satisfaction array empty.

There was also a mobile filtering bug: the Satisfaction screen first filtered tickets by ticket creation date, then kept only ratings whose ticket IDs were in that ticket-period list. A rating created today for an older ticket could disappear.

Phase 24.2 fixes both:
- backend fetches Satisfaction newest-first and stops when the 90-day cutoff is reached;
- mobile filters Satisfaction by `rating.created_at` / `rating.updated_at`;
- ratings do not disappear merely because the underlying ticket was created outside the selected rating period.

### Alerts hang
Alerts was physically inside `(tabs)` while hidden from the tab bar using `href: null`. The header bell then navigated to that hidden tab route. The screen also synchronously calculated device-health spike aggregation over the full ticket snapshot.

Phase 24.2:
- moves Alerts to `src/app/alerts.tsx`;
- removes `(tabs)/alerts.tsx`;
- removes Alerts registration from the tab navigator;
- keeps the header bell route `/alerts`;
- uses `FlatList`;
- disables synchronous device-spike computation on the Alerts navigation screen;
- preserves SLA, reply-delay, stale, reopened, priority, unassigned and bad-CSAT alerts.

## Install

Merge/extract into:

```text
E:\Supportcenter
```

Then:

```powershell
cd E:\Supportcenter
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-24-2.ps1
```

After the installer passes:

```powershell
git add .
git commit -m "Fix satisfaction snapshot and alerts navigation performance"
git push
```

Wait for Vercel deployment, then manually run:

```text
GitHub → Actions → Hourly Zendesk Snapshot Sync → Run workflow
```

The corrected Satisfaction stage must execute at least once before the app can display newly corrected Satisfaction snapshot data.
