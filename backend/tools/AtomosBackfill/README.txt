SupportCenter P29: One-time direct Atomos snapshot backfill

PURPOSE: Recover 90-day tickets/satisfaction from Atomos Zendesk into new Supabase when authentication works but empty placeholder snapshot row returns 0/0.

NO backend code replacement. NO Vercel cron changes. NO GitHub workflow changes. NO Android APK changes.
Reads only the existing backend/.env (never commits or displays secrets), verifies target new project ref, uses TLS certificate validation, and uses the same Postgres advisory lock as the Vercel Atomos sync endpoint. Imports 5 stages from the existing backend/api/_support-staged-sync.ts: reference, satisfaction, metrics, tickets, metric-events.

1. Extract this ZIP to E:\Supportcenter\backend\tools\AtomosBackfill
2. In PowerShell:
    $tool='E:\Supportcenter\backend\tools\AtomosBackfill\RUN-ATOMOS-BACKFILL.ps1'
    & $tool -RepoPath 'E:\Supportcenter' -Mode Preflight
3. Only if preflight passes, run:
    & $tool -RepoPath 'E:\Supportcenter' -Mode Run
4. Verify:
    & $tool -RepoPath 'E:\Supportcenter' -Mode Verify

The script writes only progress.atomos.json (stage/cursor, no tokens), and modifies only the new Supabase snapshot rows and related backend sync state. It never touches users, memberships or Zendesk tickets. If interrupted, rerun -Mode Run to resume from the last saved stage. It stops if an Atomos sync already holds the advisory lock. Backend/.env must already contain new Supabase DB URI and three Atomos Zendesk env vars. A properly trusted Supabase CA certificate is required if your connection uses a private certificate chain. Without it, the script refuses to bypass TLS verification.

If Vercel cron continues single-pass syncs that fail or overlap, it still needs an independent future repair for reliable scheduling. Successful one-time import will not by itself fix cron scheduling.

To confirm on Supabase SQL Editor:
SELECT workspace_slug,sync_status,synced_at,last_error,
       jsonb_array_length(tickets) AS ticket_count,
       jsonb_array_length(satisfaction) AS satisfaction_count
FROM public.zendesk_cache_snapshots WHERE workspace_slug='atomos';

Success = sync_status=ok, synced_at populated, ticket_count>0. Then login/snapshot meta on Android should report ready (Refresh). Never paste passwords, secrets, tokens or full Postgres URI into chat.
