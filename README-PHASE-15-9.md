# Support Command Center — Phase 15.9

Fixes two issues:

## 1. Mobile `fetch failed / request has been cancelled`

The previous client aborted every API request after 12 seconds. That is too
short for a cold Vercel function + database/Zendesk request.

New policy:

- auth requests: 45 seconds
- all other API requests: 30 seconds
- AbortError is converted to a readable timeout error

Production mobile `.env` should be:

```env
EXPO_PUBLIC_API_BASE_URL=https://supportcenter-kappa.vercel.app
```

Do not add `/api`.

## 2. TypeScript 5.9 invalid ignoreDeprecations

Local TypeScript is 5.9.3. `"ignoreDeprecations": "6.0"` is a TypeScript 6
setting and local `tsc` correctly rejects it.

This patch removes that setting from both tsconfigs.

It also adds:

`.vscode/settings.json`

to make VS Code use the project's local TypeScript 5.9.x SDK instead of a newer
editor TypeScript service that was displaying TypeScript 6 migration warnings.

After installing:

```text
Ctrl+Shift+P
TypeScript: Restart TS Server
```

## Vercel PORT

Do not set a `PORT` environment variable in Vercel. Serverless functions are
invoked by Vercel; the backend does not listen on your own port there.

## Root URL

`/health` and `/api/health` returning `ok:true` prove the deployment is alive.

A plain `/` returning 404 does not prevent the mobile app from working because
the mobile app calls `/auth/*` and `/zendesk/*`, not the root page.
