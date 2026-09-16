# Phase 18.5 — Data Fallback + Home All

Fixes three current problems:

1. Insights failed entirely when `/zendesk/analytics/tickets?scope=all` failed.
2. Devices could show `Detected device field: Not detected` when the actual
   custom field was named `Devices` or used question-style/product wording.
3. Home had `all` in screen state but the shared `OverviewDateFilter` still
   rendered only Today / 7 Days / 30 Days.

## Ticket source fallback

All aggregate screens now use:

1. full/all ticket analytics
2. 90-day analytics if full fails
3. recent Zendesk tickets if analytics fails

So an analytics/search failure no longer makes Insights and Devices empty while
the Tickets tab is working.

## Device detection

Expanded title matching includes:

- Device / Devices
- Device Model / Device Name
- Which Device / Your Device
- Product / Products / Product 1 / Product Name
- Which Product / Your Product
- Atomos Product / Atomos Device
- Monitor / Monitors
- Recorder / Recorders
- Model / Models
- Hardware

## Home

The date control now visibly renders:

`Today | 7 Days | 30 Days | All | Filter`
