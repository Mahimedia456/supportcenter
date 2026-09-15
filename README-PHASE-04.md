# Support Command Center — Phase 04 Stability Fix

Extract/merge this ZIP at:

`E:\Supportcenter`

This patch fixes the blockers reported after Phase 03:

- `scripts/check-db.ts`: removes CommonJS-incompatible top-level await by using `async main()`.
- `tickets.tsx`: changes invalid `colors.bg` to `colors.background`.
- `insights.tsx`: changes invalid `colors.bg` to `colors.background`.
- `INSTALL-PHASE-04.ps1`: fails immediately if any typecheck/database step fails instead of printing Done after an error.
- `RUN-AFTER-PHASE-04.ps1`: copy/paste-safe DB check + seed runner.

## Install / verify

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-04.ps1
```

If DB check reports `ETIMEDOUT` or `ENETUNREACH`, do not use the Supabase HTTPS project URL and do not guess the pooler host. In Supabase Dashboard open **Connect** and copy the exact **Session pooler** PostgreSQL URI into `backend\.env` as `SUPABASE_DATABASE_URL`.

After PASS:

```powershell
cd E:\Supportcenter\backend
npm run seed:phase02
npm run start:dev
```

Open another PowerShell window:

```powershell
cd E:\Supportcenter\apps\mobile
npm start
```

Do not paste numbered prose such as `5. npm run start:dev` into PowerShell. Only paste the command itself.
