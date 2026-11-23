# SupportCenter Native: full active-screen visual revamp + accurate HTTP auth errors

## Intended scope
This is a **guarded native Kotlin / Jetpack Compose patch**. It refreshes all currently implemented native screens (login, shell/header, Overview, Tickets, Ticket Detail/Conversations, RMA, Devices, Device Detail, Satisfaction, Insights, Alerts, Profile) with a consistent component system based on the original Expo `final-theme.ts`, `MetricCard.tsx`, `TicketCard.tsx`, and `WorkspaceHeader.tsx`. The login includes the existing password eye toggle. Cards have Expo-style light-green/cyan/lime palette, borders, radius, spacing, metadata tiles, and status chips. Text content and data calculations remain based on existing native view models.

**Authentication fix:** Kotlin `SupportApi.kt` previously read JSON `error` before `message`, causing NestJS HTTP 401 to appear as generic `Unauthorized`. It now prefers server-provided `message` and displays the HTTP status. This is a diagnostic UX fix and **does not automatically fix a server-side 401**.

**No changes to:** Supabase database, Vercel environment, backend API, JWT signing, workspace access controls, original Expo app, original logo files, RMA classification, or native credential/cache encryption.

## Installation and build

```powershell
$root = 'E:\Supportcenter'
$patch = "$root\native-android\_patches\FullUI"
New-Item -ItemType Directory -Force $patch | Out-Null
Expand-Archive "$env:USERPROFILE\Downloads\SupportCenter_NATIVE_FULL_UI_AUTH_RECOVERY.zip" $patch -Force
Set-ExecutionPolicy -Scope Process Bypass -Force
& "$patch\CHECK-LOGIN-VERCEL.ps1"
& "$patch\CHECK-LOGIN-VERCEL.ps1" -TestLogin
& "$patch\APPLY-REVAMP.ps1" -RepoPath $root -DryRun
& "$patch\APPLY-REVAMP.ps1" -RepoPath $root
& "$patch\CHECK-REVAMP.ps1" -RepoPath $root
adb devices -l
& "$patch\BUILD-AND-ADB-REVAMP.ps1" -RepoPath $root
```

Run `-BuildOnly` to assemble APK without a connected device. If multiple devices appear in `adb devices -l`, use `-Serial 'DEVICE_SERIAL'`.

Output APK after real successful Gradle build: `E:\Supportcenter\native-android\dist\SupportCenter-Native-UI-Revamp-debug.apk`.

## Auth diagnostic interpretation
- `/api/health` HTTP 200 means service is reachable, *not* that DB credentials are correct.
- Unauthenticated `/auth/me` HTTP 401 is normal and not a login test.
- `POST /auth/login` HTTP 401 with `Invalid email or password.` means user absent/inactive or bcrypt password mismatch. `No active workspace assigned.` means membership missing.
- Auth POST successful, `/api/zendesk-cache-snapshot?part=meta` HTTP 401 means token/permission issues; confirm deployment JWT consistency.
- New DB (`vggiadhzvqklqkztjmnb`) needs seeded users + active workspace memberships. Vercel `SUPABASE_DATABASE_URL` alone does not migrate users or passwords.
- `CHECK-LOGIN-VERCEL.ps1 -TestLogin` uses a hidden password prompt, prints only statuses and summary, never tokens.

## Safety / validation
- Installer SHA-256 checks package and allowed source baselines. Unknown local changes cause a hard stop.
- Dry run does not write files; actual install backs up original files outside repo (`E:\SupportCenter_Native_Revamp_Backup_...`).
- Source/manifest/offline guard tests run here, **but Android Gradle/ADB compile and device UI parity are not verified in this environment**.
- Already-running Android app will continue to show the old UI until new APK is built and installed.
- Do not run old Batch3/ExpoUI hash-check scripts after this patch; they check old UI hashes. Use `CHECK-REVAMP.ps1` and `BUILD-AND-ADB-REVAMP.ps1`.

## Remaining differences from original Expo
The additional Expo-native screens `system-health`, `region/[name]`, `agent/[id]`, `ticket-results`, `insight-results`, and `rma-results` are not implemented as separate deep-link screen routes in the current Kotlin application. This patch improves **every currently implemented native screen** but should not be described as total feature parity with Expo without further work. Actual data parity and layout acceptance require testing with the user's authenticated Atomos/Angelbird workspaces.
