# Support Command Center — Phase 12

## Included fix

Phase 11.1 used:

```ts
... as Href
```

TypeScript 5 correctly complained that the stale generated Expo Router route
union did not sufficiently overlap with newly added dynamic routes.

Phase 12 fixes Device and Agent navigation with:

```ts
... as unknown as Href
```

This is intentionally limited to the router boundary for dynamic routes that
exist on disk but have not yet appeared in Expo's generated typed-route union.

Fixed:
- `/device/[name]`
- `/agent/[id]`

New alert detail uses the same safe pattern:
- `/alert/[id]`

## Alerts module

Adds a real read-only manager notification center based on live Zendesk data.

### Alert types
- High/Urgent queue
- Active unassigned tickets
- Active tickets with no update for 24+ hours
- Bad CSAT
- Device support spikes
- Region volume concentration
- Form volume concentration

### Alert screen
- Critical / Warning / Info summary cards
- severity filters
- clean manager alert cards
- pull-to-refresh
- alert count
- live signal indicator

### Alert detail
- signal context
- severity
- entity/device/region/form label
- related real tickets where available
- ticket drill-down

## SLA note
Exact Zendesk SLA-policy/event metrics are not yet bound. The current
"No recent activity" signal is a manager heuristic: an active ticket whose
`updated_at` is older than 24 hours.

## Install

Merge the ZIP into:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-12.ps1
```

Run mobile with a clean Expo cache:

```powershell
npx expo start -c
```

## Next
Phase 13 = Profile + Workspace + System Health:
workspace identity, Zendesk connection, DB/API status, sync freshness,
notification preferences, account/profile and logout/settings polish.
