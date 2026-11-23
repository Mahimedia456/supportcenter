# SupportCenter Native Android: Expo Screen Parity + Crash Diagnostic (N13)

## Scope grounded in `mobile(6).zip`

Expo source compared: `src/app/(tabs)/index.tsx`, `tickets.tsx`, `rma.tsx`, `devices.tsx`, `satisfaction.tsx`, `src/app/insights.tsx`, `alerts.tsx`, `profile.tsx`, `lib/overview.ts`, `lib/alerts.ts` and `lib/rma-analytics.ts`.

This is a **guarded native Android screen implementation**, not an Expo/React Native runtime. It adds one new Kotlin file and changes only **existing navigation route calls** in `SupportScreens.kt`. No backend, secret, workspace/session, database or existing Android source is overwritten wholesale.

### Updated UI/data behavior

- **Overview:** selected-date totals, Open (new + open), High Priority, Unassigned; SLA Health (unique breach tickets, no reply >4h, first reply >4h, unsolved >72h), region bars and Needs Attention; each actionable KPI navigates to filtered Tickets.
- **Tickets:** search ID/subject/status/priority/tags, period chips, status and priority chips, newest/oldest sorting, filtered results and existing ticket detail/conversation.
- **RMA:** RMA cases, Pending ship, Shipped, Returned, Completed, Repair, Replaced, status/outcome/workflow/category filters and searchable cases with ticket detail. **Completed** uses solved/closed *ticket status* and is explicitly not a proven returned/shipped status. Shipment is classified from the underlying documented Zendesk fields.
- **Devices:** model search, active-only toggle, ticket/active/high/RMA/unassigned counts and per-device ticket detail.
- **Satisfaction:** Total, Good, Bad, comment count, filter chips and ticket links.
- **Insights:** Region, Device, Category, Fault, Status, Priority, Form, Group, Agent breakdowns using imported fields. Large breakdowns run on `Dispatchers.Default`.
- **Alerts:** critical/warning/info categories, SLA/reply/waiting/priority/unassigned/bad-CSAT signals, links into appropriately filtered Tickets.
- **Profile:** account/workspace, server sync state, refresh, cache clear and logout. Remote push/notification preferences are not falsely claimed to work.
- **Tabs:** Overview, Tickets, **RMA**, Satisfaction, Devices. Insights, Alerts and Profile remain available from the workspace header.

Native design uses green/cyan/mint/lime palette, rounded cards, typography and dense KPI hierarchy from Expo. Original Expo source is untouched.

### Main-thread crash mitigation

The earlier native screens calculated RMA classification and device field matches for thousands of tickets synchronously in Compose. This package moves Overview aggregation, ticket filters, RMA classification, device rollups/details, Insights and Alerts calculations to `Dispatchers.Default`, while keeping long lists virtualized with `LazyColumn`. This addresses a plausible UI freeze/ANR cause but **does not prove or guarantee that the reported process crash is fixed**. An Android `FATAL EXCEPTION`/OOM stack is necessary for the definitive root cause. The package includes `CAPTURE-ANDROID-CRASH.ps1` to collect that evidence. Do not disable memory limits or clear app storage as a workaround.

### Important remaining differences from Expo

Native date chips currently support Today/7/30/90 days. Expo's *custom start/end date picker* and several deep result routes (Agent/Region/System Health/RMA Results) are not fully ported in this package. Production push notifications, full preference persistence and signed release are not addressed. Avoid claiming 100% pixel or feature parity before screenshot and functional comparisons on device.

## Windows install

Extract ZIP to `E:\Supportcenter\native-android\_patches\ExpoParityN13` (do **not** replace the native-android project root).

```powershell
$root = 'E:\Supportcenter'
$patch = "$root\native-android\_patches\ExpoParityN13"
New-Item -ItemType Directory -Force $patch | Out-Null
Expand-Archive "$env:USERPROFILE\Downloads\SupportCenter_NATIVE_EXPO_PARITY_CRASH_RECOVERY.zip" $patch -Force
Set-ExecutionPolicy -Scope Process Bypass -Force
& "$patch\APPLY-EXPO-PARITY.ps1" -RepoPath $root -DryRun
# Only after PARITY_DRY_RUN_PASS:
& "$patch\APPLY-EXPO-PARITY.ps1" -RepoPath $root
& "$patch\VERIFY-EXPO-PARITY.ps1" -RepoPath $root
adb devices -l
& "$patch\BUILD-INSTALL-TEST.ps1" -RepoPath $root
```

If any `PARITY_ANCHOR_MISMATCH` appears, stop. No existing files are modified by the dry run and do not bypass the guard. The script supports the known original ExpoUI and FullUI screen layout call sites; unknown user-customized call sites require a reviewed merge. Source backups are stored outside the repository.

## Capture Android crash evidence

```powershell
# Launch app with clean crash buffer (does not clear app data):
& "$patch\CAPTURE-ANDROID-CRASH.ps1" -Mode Start -RepoPath $root
# Reproduce crashing login/snapshot loading on the physical phone
& "$patch\CAPTURE-ANDROID-CRASH.ps1" -Mode Capture -RepoPath $root
```

On multiple ADB devices, add `-Serial '<actual adb serial>'` to both calls.
Logs go to `native-android\reports\ANDROID_CRASH_*.txt`. Review for email, tokens, URLs or other personal data before sharing. If there is no Java stack, investigate ANR/native crash with full logcat.

**Validation:** This ZIP is source-only. Static anchor simulations and Kotlin parser checks can run in the packaging environment, but a real Compose Gradle compile, installed APK, performance test and crash root cause must be verified on the user's Windows/Android machine.
