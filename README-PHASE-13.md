# Support Command Center — Phase 13

## Profile + Workspace

Adds a separate manager account screen without adding a sixth bottom tab.

Includes:
- manager name/email
- manager read-only badge
- resolved workspace identity
- Zendesk source label
- notification preference toggles
- System Health entry
- polished logout
- AngelBird/Atomos workspace identity continues after login only

## System Health

Adds a dedicated System Health screen showing:
- Backend API
- Database-backed auth state
- Zendesk connection
- Manager session
- live checked timestamp
- healthy / warning / offline states
- pull-to-refresh

Database status is practically inferred from successful authenticated `/auth/me`,
because that request uses the app's database-backed auth stack.

## Design

Preserves the locked visual language:
- soft off-white/light background
- refined deep green
- cyan information accent
- controlled lime health indicator
- rounded white cards
- thin professional borders

## Bottom navigation

Bottom tabs remain exactly:
1. Overview
2. Tickets
3. Insights
4. Devices
5. Alerts

Profile and System Health are separate routes and do not become bottom tabs.

## Install

Merge ZIP into:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-13.ps1
```

Run backend:

```powershell
cd E:\Supportcenter\backend
npm run start:dev
```

Run mobile:

```powershell
cd E:\Supportcenter\apps\mobile
npx expo start -c
```

## Next

Phase 14 = Cache + Performance:
offline snapshot cache, freshness indicators, retry/rate-limit handling,
incremental refresh foundations and reduced repeated Zendesk calls.
