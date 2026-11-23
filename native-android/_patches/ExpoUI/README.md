# SupportCenter Native Android: Expo UI parity + Vercel DB diagnosis

This is a **guarded native UI patch** for the previously delivered B3 Android project. It does not modify backend or Expo sources and never writes to `.env`.

Verified from original Expo source: `src/app/(auth)/login.tsx`, `src/components/ui/AppTextField.tsx`, `src/components/ui/PrimaryButton.tsx`, `src/components/WorkspaceHeader.tsx`, `src/constants/final-theme.ts`, `src/app/(tabs)/index.tsx` and native Batch 2/3 source. The new login uses the exact Expo green/cyan/border/ink color tokens, a no-text SupportCenter image, white rounded card, input icons, password visibility, gradient button, workspace auto-selection copy, and branded native header navigation. Native Tickets/RMA/Devices/Satisfaction/Insights use coordinated palette and rounded card accents. This is a visual parity improvement, **not a claim that all Expo screen interactions and designs are now pixel-for-pixel identical**.

The login API contract is unchanged. Expo uses `EXPO_PUBLIC_API_BASE_URL` to call `/auth/login`; native uses `BuildConfig.API_BASE_URL` with the same `/auth/login`; only the Vercel backend has `SUPABASE_DATABASE_URL`. Never put Supabase credentials in mobile code.

## Apply

```powershell
$root = 'E:\Supportcenter'
$patch = "$root\native-android\_patches\ExpoUI"
New-Item -ItemType Directory -Force $patch | Out-Null
Expand-Archive "$env:USERPROFILE\Downloads\SupportCenter_NATIVE_EXPO_UI_PARITY_RECOVERY.zip" $patch -Force
& "$patch\CHECK-VERCEL-DB.ps1"
& "$patch\APPLY-EXPO-UI.ps1" -RepoPath $root -DryRun
& "$patch\APPLY-EXPO-UI.ps1" -RepoPath $root
& "$patch\CHECK-EXPO-UI.ps1" -RepoPath $root
& "$patch\BUILD-AND-ADB-UI.ps1" -RepoPath $root
```

Run `-BuildOnly` to compile without requiring a device or `-Serial 'adb-serial'` if multiple devices are attached. The artifact is `E:\Supportcenter\native-android\dist\SupportCenter-Native-ExpoUI-debug.apk` after a successful Gradle build.

## Important / source guards

The patch applies only when target files match exact pristine B2/B3 source hashes (or B3 after the previously supplied horizontalScroll hotfix). Otherwise it stops without overwriting local modifications. It creates external backups and is idempotent. It intentionally does not update the old Batch3 hash manifest; use `BUILD-AND-ADB-UI.ps1` for upgraded UI source, not the old B3 hash checker.

## Backend failure

The current `ENOTFOUND` is produced in Vercel Postgres connection, not by Expo/native login. The previously uploaded `backend/.env` targets a different, older Supabase project. The **current Vercel** environment must use the *exact* Session pooler URI copied from the NEW Supabase project `vggiadhzvqklqkztjmnb` Dashboard > Connect. The pooler cluster index/region is not safe to guess. Configure `SUPABASE_URL` and `SUPABASE_DATABASE_URL` in Production, redeploy, then rerun `CHECK-VERCEL-DB.ps1` until `DATABASE_CONNECTED: True`. Do not share or echo secrets.

## Validation limit

Source anchor checks, SHA-256 packaging, and offline static smoke tests run here. Actual Android Gradle compilation and ADB install require your Windows environment.
