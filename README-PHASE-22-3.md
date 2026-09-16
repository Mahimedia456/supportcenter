# Phase 22.3 — Vercel Hobby Cron Fix

## Why deployment failed

Vercel Hobby allows Cron Jobs only **once per day**.

The project used:

```cron
0 * * * *
```

which runs hourly, so Vercel rejected the deployment.

## New setup

### Vercel
Vercel uses one daily fallback cron:

```cron
0 0 * * *
```

This is Hobby-compatible.

### GitHub Actions
Hourly sync is moved to GitHub Actions:

```cron
0 * * * *
```

The workflow calls:

`https://supportcenter-kappa.vercel.app/api/zendesk-hourly-sync`

with:

`Authorization: Bearer <CRON_SECRET>`

## Required GitHub secret

GitHub repository:

Settings -> Secrets and variables -> Actions -> New repository secret

Name:

`SUPPORTCENTER_CRON_SECRET`

Value:

Use the **same value** already configured as `CRON_SECRET` in Vercel.

Do not commit the secret into the repository.

## Install

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-22-3.ps1
```

Then:

```powershell
cd E:\Supportcenter
git add .
git commit -m "Make cron Hobby compatible and move hourly sync to GitHub Actions"
git push
```
