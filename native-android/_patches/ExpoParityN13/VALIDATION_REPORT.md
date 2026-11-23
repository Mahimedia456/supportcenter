# Offline validation report

- Expo React Native source used directly from user-uploaded `mobile(6).zip`.
- New Compose screen module exports the eight route entrypoints required by the installer.
- PowerShell installer refuses missing or duplicate navigation anchors, verifies new file SHA-256, supports `-DryRun`, makes a backup outside repo and restores previous screen source if verify fails.
- No network credentials or changes to backend, cron, auth, Supabase database or original Expo source.
- Off-main-thread RMA, device, Alerts, Overview and Insights data computations.
- ADB crash diagnostic captures crash buffer without clearing app data.
- Known limitation: Android Gradle compile and physical device crash root cause were not verified in this runtime.
