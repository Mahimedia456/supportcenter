# Static validation report (2026-11-23)

- SHA-256 checks: PASS for native UI, staged sync endpoint, staged GitHub workflow.
- ZIP CRC/readback: PASS (all 8 source and script files at first build).
- Native source patch: contains five Expo-order tabs (Overview, Tickets, Insights, Devices, Satisfaction), RMA shortcut, explicit missing snapshot state; no modification to auth/session/branding/data models.
- Backend sync API: uses existing `_support-staged-sync.ts` module, bearer CRON_SECRET, server-side workspace lock, rejects malformed stage/unknown workspace, catches/records stage errors.
- Workflow: bounded stage calls and rejects `skipped=true`; defaults to Atomos unless Angelbird Zendesk credentials configured.
- Source conflict guards: compare manifest SHA-256; do not replace unknown modified local source; original files backed up outside repository before update.
- Secrets: no secrets included. Hidden prompts for CRON_SECRET and login diagnostics.
- NOT VALIDATED in this environment: Kotlin/Gradle Android compile, PowerShell execution on Windows, actual Vercel production deployment, Supabase snapshot contents, Zendesk credentials, or device install.
- The last successful GitHub Actions run #307 on 2026-11-22 predates this migration and does not validate the new Supabase database.
