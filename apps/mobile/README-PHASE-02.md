# Phase 02 — Auth, Session & Workspace Foundation

Target root: `E:\Supportcenter`

Extract this ZIP at the project root so that:
- `apps/mobile/...` merges into your existing Phase 01 mobile app
- `backend/...` is created
- `INSTALL-PHASE-02.ps1` is available inside `apps/mobile`

From PowerShell:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-02.ps1
```

## Branding behavior

Login stays neutral: no Atomos or AngelBird logo.

After login:
- `aamir@mahimediasolutions.com` → AngelBird workspace → AngelBird mark
- `shahid@mahimediasolutions.com` → Atomos workspace → Atomos mark

This mapping is stored in the database and returned by the backend; it is not hardcoded in the final mobile auth flow.

## Workspace logo files

AngelBird:
`assets/brand/workspaces/angelbird/`

Atomos:
`assets/brand/workspaces/atomos/`

## Phase 03

Zendesk read-only connection, Views, Tickets, Forms and pull-to-refresh sync.
