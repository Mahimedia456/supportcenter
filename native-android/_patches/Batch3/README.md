# SupportCenter Native Android - Batch 3 (N09 to N12)

**Exact target:** `E:\Supportcenter\native-android` (standalone Kotlin + Jetpack Compose).  
**Patch extraction folder:** `E:\Supportcenter\native-android\_patches\Batch3`.  
**Prerequisite:** Batch 1 already extracted and Batch 2 successfully applied, **including the official Gradle SHA-256 checksum fix**. This ZIP is **not** a complete replacement project and must not be extracted directly over the native project.

## Features

- **N09**: Native Insights with device, fault, category, status, priority, form, group and agent breakdown, date period filters; native Satisfaction with server-supplied good/bad ratings, comments and ticket links. Server raw ticket metric records loaded and retained in encrypted cache; no invented SLA or response-time figures.
- **N10**: Snapshot-derived attention feed for urgent/unassigned tickets, server-labelled SLA breaches, stale sync, and sync status. Android notification permission and **operator-triggered local notification** included. **Remote/FCM background push delivery is NOT implemented** and cannot be claimed working without a verified backend notification service.
- **N11**: Native Profile, workspace, sync details, server refresh, encrypted offline cache reset, secure logout.
- **N12**: Guarded patch apply, strict file hashes, Gradle SHA-256 bootstrap from Batch 2, full native debug APK build, ADB device selection, install, launch, optional locally signed release APK/AAB using own keystore.

## Exact Windows commands

```powershell
$root = 'E:\Supportcenter'
$patch = 'E:\Supportcenter\native-android\_patches\Batch3'
New-Item -ItemType Directory -Force $patch | Out-Null
Expand-Archive "$env:USERPROFILE\Downloads\SupportCenter_NATIVE_BATCH3_N09-N12_APK_ADB.zip" $patch -Force
Set-ExecutionPolicy -Scope Process Bypass -Force

& "$patch\APPLY-BATCH3.ps1" -RepoPath $root -DryRun
& "$patch\APPLY-BATCH3.ps1" -RepoPath $root
& "$patch\CHECK-BATCH3.ps1" -RepoPath $root

# Build a real debug APK, choose authorized adb device, install and start app:
& "$patch\BUILD-AND-ADB-INSTALL.ps1" -RepoPath $root
```

If **multiple** connected authorized devices:

```powershell
adb devices -l
& "$patch\BUILD-AND-ADB-INSTALL.ps1" -RepoPath $root -Serial 'YOUR_ADB_SERIAL'
```

Only APK build:

```powershell
& "$patch\BUILD-AND-ADB-INSTALL.ps1" -RepoPath $root -BuildOnly
```

Install an APK previously built by this script:

```powershell
& "$patch\BUILD-AND-ADB-INSTALL.ps1" -RepoPath $root -InstallOnly
```

**Successful output:** `B3_DRY_RUN_PASS`, `B3_PATCH_APPLIED`, `B3_STATIC_PREFLIGHT_PASS`, `B3_APK_BUILD_PASS` and `B3_INSTALL_LAUNCH_PASS` (verified PID) or `B3_INSTALL_LAUNCH_NOT_VERIFIED` if PID verification unavailable.

**Produced APK:** `E:\Supportcenter\native-android\dist\SupportCenter-Native-B3-debug.apk`  
**Application ID:** `com.mahimediasolutions.supportcenter.nativeapp`  
This is a **debug APK**, installable on a phone; production app signing and Play Console acceptance are separate.

## Optional signed release

If you already own a signing keystore, execute `BUILD-SIGNED-RELEASE.ps1`. It prompts for the `.jks`, alias and hidden passwords, and does not embed signing secrets in source. Outputs are placed in `native-android\dist` as signed release APK and AAB. Keep your keystore and passwords backed up securely, never paste into chats or Git. If you don't have a release keystore, skip this step. **No production signing acceptance is claimed until actually built and verified.**

## Preflight / safety

- The installer confirms SHA-256 hashes of each source file and exact Batch 1/2 baseline before copying anything. Stops on local differences; no force option. Re-running an already installed version does nothing. Backup outside the repo in `E:\SupportCenter_Native_B3_Backup_*`.
- No code changes under `apps\mobile`, `backend`, Supabase, Vercel, or GitHub workflows. Existing Atomos/Angelbird app assets are not overwritten.
- Requires Windows PowerShell 5.1+, Java JDK 17+, Android SDK (API 35), Android Platform Tools, an authorized ADB device, internet to fetch Android/Gradle dependencies if absent.
- Official Gradle download and SHA-256 verification from Batch 2 are retained.
- Existing native test package intentionally differs from original Expo app, and therefore does not overwrite installed original app.
- Debug APK is for functional testing. On-device login, counts, conversations, UI, performance and signed release require physical verification.

## Manual smoke tests

1. Open Atomos account and Angelbird account separately; correct brand header and workspace isolation.
2. Overview 1, 7, 30, 90 day filters; compare ticket counts with server snapshot.
3. Ticket search/status filter, details, conversation public/internal markers and retry.
4. RMA and Devices classification; confirm no invented categories.
5. Satisfaction good/bad counts, date filtering, comments and ticket links.
6. Insights categories, device/fault/agent/group breakdown; zero/error states.
7. Alerts list and request Android notification permission; manual local notification appears.
8. Profile refresh, cache clear, logout and restored session; no cross-workspace cached content.
9. Go offline, reopen and confirm explicit cache/offline indication.
10. Android back/rotation/system permissions, performance, network errors and 401 refresh.
