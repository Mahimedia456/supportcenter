# SupportCenter: Fresh snapshot recovery + Expo-matched professional bottom tab bar

## Verified diagnosis
- Shahid Vercel login PASS, but `snapshotStatus=missing` in the NEW Supabase project; login credentials are not the problem.
- Latest completed GitHub sync was 2026-11-22 20:10-20:30 UTC, BEFORE the user's database migration; Atomos had 2,753 tickets and 2,000 satisfaction items in that historical run. It does NOT mean the new database has those rows.
- Historical workflow ran **staged** endpoint calls. Current repository workflow/backend moved to single-pass, creating a regression risk with large data. This package restores bounded per-stage imports.
- Angelbird's historical run was skipped. Its Zendesk credential configuration must be verified separately.

## Package components (independent, guarded)
`APPLY-RECOVERY.ps1` selects `-Component NativeUI`, `BackendSync`, or `Workflow`. It refuses local edits that do not match the known baseline, backs up original source outside repo, and verifies SHA-256 before and after replacement. No automatic force/overwrite switch.

1. Extract this ZIP to `E:\Supportcenter
ative-android\_patches\SyncTabRecovery`.
2. Native tab bar:
   `& "$patch\APPLY-RECOVERY.ps1" -RepoPath $root -Component NativeUI -DryRun`
   `& "$patch\APPLY-RECOVERY.ps1" -RepoPath $root -Component NativeUI`
   `& "$patch\BUILD-ADB-RECOVERY.ps1" -RepoPath $root`
3. Sync backend:
   `& "$patch\APPLY-RECOVERY.ps1" -RepoPath $root -Component BackendSync -DryRun`
   `& "$patch\APPLY-RECOVERY.ps1" -RepoPath $root -Component BackendSync`
4. Workflow:
   `& "$patch\APPLY-RECOVERY.ps1" -RepoPath $root -Component Workflow -DryRun`
   `& "$patch\APPLY-RECOVERY.ps1" -RepoPath $root -Component Workflow`
   **If local workflow differs, do not replace it.** Review the bundled proposed workflow against your modified version, maintaining your custom logic. It must make staged calls and reject skipped responses.
5. Deploy the staged backend to Vercel and ensure `CRON_SECRET`, correct new `SUPABASE_DATABASE_URL`, and `ATOMOS_ZENDESK_SUBDOMAIN`, `ATOMOS_ZENDESK_EMAIL`, `ATOMOS_ZENDESK_API_TOKEN` are configured in Production. Set equivalent ANGELBIRD values before attempting Angelbird.
6. One-time sync after redeploy: `& "$patch\RUN-SYNC-ONCE.ps1" -Workspace atomos` (prompts for `CRON_SECRET` without echo). Or commit + push the validated workflow and run it manually in GitHub Actions.
7. Verify with the existing `CHECK-LOGIN-VERCEL.ps1 -TestLogin`: need `snapshotStatus=ready`, `syncedAt` non-null, syncStatus `ok`, and ticket data. **No fake zero values before that**.

## Workflow note
`SUPPORTCENTER_SYNC_WORKSPACES` repo variable defaults to `atomos` until Angelbird Zendesk credentials are actually configured. Change to `atomos angelbird` only after confirming credentials. GitHub's workflow dispatch requires that the workflow YAML exists on the default branch; local edits are not yet live.

## UI
The new bar matches the original Expo navigation order: Overview, Tickets, Insights, Devices, Satisfaction, with a visible RMA shortcut on Overview/Insights. Other screens still accessible from header: Alerts and Profile. On missing snapshots, a verified-data empty state replaces misleading KPI zeros. Workspace-specific branding and original auth logic remain untouched.

## Safety and validation
- Never put Supabase DB password, Zendesk tokens, CRON_SECRET, or user passwords in mobile APK or committed source.
- No automatic edits to `.env`, Supabase database, branding, or user credentials.
- This package is source/static-tested only. Actual Gradle build, Vercel deployment, Zendesk sync, and ADB installation require user environment and must be validated there.
