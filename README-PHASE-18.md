# Support Command Center — Phase 18 FINAL Zendesk OAuth

## Important security
Do not hardcode Zendesk client secrets, API tokens, database passwords, JWT
secrets, or manager passwords in Git/mobile code.

Use Vercel Environment Variables.

## Zendesk OAuth flow
After deploy open:

`https://supportcenter-kappa.vercel.app/zendesk/oauth/atomos/start`

The backend:
1. builds the Zendesk authorization URL
2. creates an HMAC-signed state value
3. redirects to Zendesk
4. receives the callback at `/zendesk/oauth/callback`
5. verifies state
6. exchanges the authorization code at `/oauth/tokens`
7. AES-GCM encrypts access/refresh tokens
8. stores them in Supabase
9. refreshes the access token automatically before expiry

Status:

`https://supportcenter-kappa.vercel.app/zendesk/oauth/atomos/status`

## Authentication precedence
Zendesk requests use:
1. stored OAuth token
2. automatic OAuth refresh
3. API-token fallback if OAuth is not connected

## Mobile
- Home includes All
- full Zendesk native data from Phase 17 preserved
- Insights/Products/Forms/Custom/Feedback/Team preserved
- Devices uses actual product custom fields
- Alerts uses Ticket Metrics and Metric Events
- Password focus automatically scrolls login form above keyboard

## Vercel env
See `backend/.env.phase18.example`.

Do not set `PORT`.

## Install
```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-18.ps1
```

Then push/redeploy:
```powershell
cd E:\Supportcenter
git add .
git commit -m "Finalize Zendesk OAuth and manager data"
git push
```
