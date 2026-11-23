# SupportCenter Native Android - Batch 1 (N01 to N04)

**Install directory:** `E:\Supportcenter\native-android` (zip's root files belong in this directory).

**Scope**
- N01: Standalone Kotlin + Jetpack Compose Android Studio project. No Expo or React Native dependencies.
- N02: Real Vercel `/auth/login`, `/auth/refresh`, `/auth/logout`; encrypted Android Keystore-backed session.
- N03: Workspace-specific header, copying existing local Atomos and Angelbird PNG marks. Generic app icon and login splash use the approved P27 no-text SupportCenter mark.
- N04: Authenticated `?part=meta` and paginated `?part=tickets` server snapshot reads, workspace and user isolation, encrypted on-device snapshot cache, explicit offline/failure state. Lightweight Overview preview with ticket count, open, high priority, unassigned, date filters.

**Not implemented in Batch 1:** Complete Overview SLA dashboard, tickets/ticket details/conversations, RMA, Devices, Satisfaction, Insights, Alerts, notifications, release signing, Play Store deployment. These are in Batches 2/3. Existing React Native application and backend remain unchanged.

**Security:** No backend/Supabase/Zendesk/JWT secrets in Android. HTTPS only. Android Keystore-encrypted auth and local snapshots. App `applicationId` is `com.mahimediasolutions.supportcenter.nativeapp` for a safe side-by-side test; final production ID/signing review is Batch 3.

## Run on Windows

1. Extract ZIP contents **into** `E:\Supportcenter\native-android` (do not create an extra nested `SupportCenter_NATIVE_BATCH1` directory).
2. Open PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
& 'E:\Supportcenter\native-android\CHECK-PROJECT.ps1' -RepoPath 'E:\Supportcenter'
& 'E:\Supportcenter\native-android\RUN-BUILD.ps1' -RepoPath 'E:\Supportcenter'
& 'E:\Supportcenter\native-android\RUN-INSTALL.ps1' -RepoPath 'E:\Supportcenter' -SkipBuild
```

`RUN-BUILD.ps1` bootstraps Gradle 8.11.1 via HTTPS and verifies the official SHA-256 checksum. Android SDK API 35 + Build Tools and JDK 17+ must be installed. Internet is required on first build.

If the original logos are missing, `COPY-WORKSPACE-LOGOS.ps1` fails rather than silently replacing official Atomos/Angelbird marks with the generic logo.

## Test sequence

- Start with **Shahid (Atomos)** assigned account, sign in with your *current private* password.
- Check header shows **Atomos Support** and original Atomos logo.
- Check `SERVER SNAPSHOT` vs `CACHED / OFFLINE` status and Last server sync timestamp.
- Test Today, 7 Days, 30 Days, 90 Days filters. Batch 1 displays only verified ticket-derived KPIs.
- Logout and sign in as Angelbird (when configured); check logo/header switch and no Atomos snapshot reuse.
- Disconnect network to verify labelled encrypted offline fallback; restore network, refresh.

**No false PASS claims:** No physical Android build or real API login has been performed in the authoring environment. Device test is required.

## Batch boundaries

- **Batch 2 (N05 to N08):** full Overview + SLA, Tickets + filters + detail, ticket conversations, RMA + Devices.
- **Batch 3 (N09 to N12):** Insights + Satisfaction, Alerts + notifications, Profile/settings, regression + release APK/AAB parity.

## Practical notes

- `gradle/wrapper/gradle-wrapper.properties` documents the pinned Gradle version. The package does not include a Gradle wrapper JAR: Windows scripts download and verify the official distribution instead. Android Studio may need a Gradle installation/wrapper configured for IDE sync; `RUN-BUILD.ps1` is the supported initial build entrypoint.
- The native app points at `https://supportcenter-kappa.vercel.app` and does not know database passwords.
- New Supabase must have users seeded and an Atomos snapshot imported on the *production* API or native app will show a clear "snapshot not imported" message.
