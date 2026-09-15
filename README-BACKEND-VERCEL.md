# Support Command Center Backend — Vercel Deployment

Merge this package into:

`E:\Supportcenter`

It adds Vercel support under:

`E:\Supportcenter\backend`

## Files

- `backend/api/index.ts`
- `backend/vercel.json`
- `backend/.vercelignore`
- `backend/.env.vercel.example`
- `backend/INSTALL-VERCEL.ps1`

## Why this is needed

The existing NestJS `main.ts` starts a long-running HTTP listener. Vercel uses
serverless functions, so `api/index.ts` initializes Nest on an Express adapter
without calling `listen()`.

The Nest application is cached in the warm serverless runtime so repeated
requests do not rebuild it unnecessarily.

## Install / Verify

```powershell
cd E:\Supportcenter\backend
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-VERCEL.ps1
```

## Vercel project setup

Create/import a Vercel project with this directory as the project root:

```text
E:\Supportcenter\backend
```

Do not deploy the whole `E:\Supportcenter` monorepo as the backend root unless
you intentionally configure Vercel's Root Directory to `backend`.

## Environment variables

Put backend secrets in:

**Vercel → Project → Settings → Environment Variables**

Use the same backend variables currently present in `backend\.env`, including:

- `SUPABASE_URL`
- `SUPABASE_DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_TTL_SECONDS`
- `REFRESH_TOKEN_TTL_DAYS`
- manager login password variables
- AngelBird Zendesk variables
- Atomos Zendesk variables

Never put these secrets in the mobile `.env`.

Optional:

```env
CORS_ORIGINS=https://your-admin-domain.example
```

For multiple browser origins:

```env
CORS_ORIGINS=https://admin.example.com,https://app.example.com
```

## Test production API

After Vercel deployment:

```powershell
Invoke-RestMethod https://YOUR-PROJECT.vercel.app/health
```

Then test login from the app.

## Mobile production API

Your current emulator-only address:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

must be changed to:

```env
EXPO_PUBLIC_API_BASE_URL=https://YOUR-PROJECT.vercel.app
```

Then restart Metro:

```powershell
cd E:\Supportcenter\apps\mobile
npx expo start -c
```

This removes the dependency on the local emulator bridge and lets a physical
Android/iOS device reach the production backend.
