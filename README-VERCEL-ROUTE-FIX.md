# Vercel Route Fix

The backend's Nest route is `/health`, while `/api/health` was returning:

```json
{"message":"Cannot GET /api/health","error":"Not Found","statusCode":404}
```

This is a route-prefix mismatch, not a PORT problem.

## Changes

- `/api/health` now has a direct Vercel health function.
- `/` rewrites to `/api/health`.
- `/health` rewrites to `/api/health`.
- `/auth/*` and `/zendesk/*` go through the Nest serverless entry.
- Nest serverless entry strips accidental `/api/` prefixes.
- `@types/express` is installed.
- `server.set('trust proxy', 1)` is used instead of invalid `app.set()`.

## Mobile

Use:

```env
EXPO_PUBLIC_API_BASE_URL=https://supportcenter-kappa.vercel.app
```

Do not add `/api`.

## PORT

Remove `PORT` from Vercel Environment Variables. Vercel serverless functions do
not need your Nest application's local listen port.
