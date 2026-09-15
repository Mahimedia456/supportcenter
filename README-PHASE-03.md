# Phase 03 — Phase 02 fixes + Zendesk read-only integration

Extract this ZIP at `E:\Supportcenter` and merge/overwrite.

Fixes:
- Fixes Expo/npm peer resolution by pinning react-dom and react-native-worklets and using legacy peer resolution for this SDK 57 project.
- Fixes missing Workspace.id in `src/data/workspaces.ts`.
- Rejects an `https://...supabase.co` value when used as `SUPABASE_DATABASE_URL` and explains the correct PostgreSQL URI requirement.
- Adds `npm run db:check` before seeding.

Zendesk:
- Server-side credentials only.
- Workspace-aware read-only health, Views, View tickets, recent tickets, ticket forms, ticket + comments.
- Mobile Tickets tab now loads real Zendesk Views and ticket subjects.
- Insights > Forms now loads active Zendesk forms.
- Pull-to-refresh is enabled.

Do not commit `.env`.
