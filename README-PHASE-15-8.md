# Support Command Center — Phase 15.8

Combined fix for:

1. Vercel backend TypeScript errors
2. old/cropped/circle-style logo replacement

## UI is NOT redesigned

Current mobile layout, colors, gradients, login card, splash animation, spacing,
and navigation remain unchanged.

Only the brand image files are replaced.

## New brand assets

Same current palette:

- deep green
- cyan
- lime

Files:

- `apps/mobile/assets/brand/final/support-command-center-mark.png`
- `apps/mobile/assets/brand/final/support-command-center-mark.svg`
- `apps/mobile/assets/brand/final/support-command-center-logo-transparent.png`
- `apps/mobile/assets/brand/final/support-command-center-wordmark.svg`

The new mark uses a geometric command/hex form, Support `C`, and analytics bars.
It does not use the old colored circles.

## Vercel fixes

The Vercel build errors were:

- missing `@types/express`
- `app.set()` invalid on `INestApplication`

Phase 15.8:

- installs `@types/express` as dev dependency
- uses `server.set('trust proxy', 1)`
- types request/response with Express types
- preserves NestJS serverless initialization

## Install

Merge into `E:\Supportcenter`, then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-15-8.ps1
```

Expected:

```text
PASS: new green/cyan/lime brand assets present.
PASS: Phase 15.8 brand + Vercel fix complete.
```

Then commit/push and redeploy Vercel.
