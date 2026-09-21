# Support Command Center Phase 24.4
## Ticket Conversation Snapshots

This phase adds Zendesk ticket conversations without returning to direct Zendesk calls from the mobile Ticket Detail screen.

### Architecture

The existing global 90-day snapshot remains unchanged for tickets, metadata, satisfaction, metrics and SLA data.

Ticket conversations are stored separately in:

`public.zendesk_ticket_conversation_snapshots`

This avoids making the main snapshot JSON extremely large.

### Sync behavior

The new `conversations` stage:
- reads the current 90-day ticket snapshot,
- compares each ticket's `updated_at` to its cached conversation snapshot,
- fetches comments only for missing/stale tickets,
- processes 8 tickets per Vercel invocation,
- stores the full public/internal comment list per ticket,
- skips unchanged conversations on future hourly runs.

The GitHub hourly workflow runs the conversation stage after tickets are current.

### Mobile Ticket Detail

Ticket Detail:
- still loads ticket metadata from the global snapshot,
- reads conversations from the conversation snapshot endpoint,
- never calls Zendesk directly,
- shows Public and Internal Note badges,
- resolves known agent names from snapshot metadata,
- labels requester comments as Requester / Customer,
- virtualizes comments with FlatList,
- shows conversation snapshot timestamp.

### Install

Extract the ZIP to any folder, then:

```powershell
cd <actual-extracted-folder>

Set-ExecutionPolicy -Scope Process Bypass -Force

.\INSTALL-PHASE-24-4.ps1 -ProjectRoot "E:\Supportcenter"
```

The installer:
1. copies backend/mobile/workflow files,
2. creates the conversation snapshot table using backend `.env`,
3. runs backend TypeScript + build,
4. runs mobile TypeScript,
5. verifies snapshot-only conversation wiring.

### Deploy

```powershell
cd E:\Supportcenter

git add .
git commit -m "Add ticket conversation snapshots"
git push
```

After Vercel deploys, manually run once:

`GitHub -> Actions -> Hourly Zendesk Snapshot Sync -> Run workflow`

The first run backfills conversation snapshots. Later hourly runs only refresh tickets whose `updated_at` changed.

### APK

Because Ticket Detail mobile code changed, rebuild the EAS preview APK after the backend has deployed and the first conversation sync has completed.
