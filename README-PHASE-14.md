# Support Command Center — Phase 14 Cache + Performance

## What changed

Phase 14 adds a centralized mobile cache layer for Zendesk read-only data.

### Caching policy

- Zendesk health: 30 seconds
- View definitions: 2 minutes
- Ticket/view lists: 1 minute
- 30-day analytics: 5 minutes
- Satisfaction: 5 minutes
- Forms/fields/groups/agents: 15 minutes
- Ticket detail/conversation: 45 seconds

### Offline/stale fallback

If a network/API request fails after retries and a previous response exists,
the app can return the cached response instead of failing the screen.

The cache metadata records when a stale fallback was used.

### Retry policy

Temporary failures automatically retry:

- HTTP 408
- HTTP 429
- HTTP 500
- HTTP 502
- HTTP 503
- HTTP 504
- transient fetch/network errors

HTTP 429 respects the server's `Retry-After` header when supplied.

### Authentication

Login, refresh and logout are never cached.

## System Health additions

System Health now shows:

- number of cached support resources
- number of stale-cache fallbacks
- latest network-cache freshness
- exact latest cached timestamp
- manual "Clear local support cache"

## Dependency

Phase 14 installs the Expo-compatible version of:

`@react-native-async-storage/async-storage`

through:

```powershell
npx expo install @react-native-async-storage/async-storage
```

## Install

Merge into:

`E:\Supportcenter`

Then:

```powershell
cd E:\Supportcenter\apps\mobile
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-PHASE-14.ps1
```

Then run:

```powershell
cd E:\Supportcenter\backend
npm run start:dev
```

and:

```powershell
cd E:\Supportcenter\apps\mobile
npx expo start -c
```

## Next

Phase 15 = Final QA + Release Readiness:
navigation QA, workspace isolation, auth/session testing, empty/error/loading
states, Android safe-area polish, app metadata review, Expo Doctor, TypeScript,
production env checklist and APK/AAB/iOS build readiness.
