# Batch 3 validation report

**Scope:** New read-only native Insights, Satisfaction, Alerts, Profile and APK/ADB scripts, based on provided Batch 1 and Batch 2 source snapshots.

**Static/source-level checks:** SHA-256 package manifest, B1/B2 hash alignment, route and function references, API part names, JSON cache round-trip fields, AndroidManifest XML, vector drawable XML, ZIP CRC check, B2 Gradle checksum compatibility.

**Not executed in this container:** Android Gradle compilation, actual debug APK creation, Windows PowerShell execution, USB/Wi-Fi ADB installation, login against private Vercel API, production release signing, physical app regression tests. No Android SDK or user's ADB phone is available in this runtime. Actual `BUILD SUCCESSFUL` and `B3_INSTALL_LAUNCH_PASS` must come from the user device's script output.

**Intentional limitation:** Android local notification is manual/on-demand; FCM background push is not implemented. The metrics screen does not manufacture response-time averages from incomplete metric data. The full original web/Expo application parity remains subject to runtime and end-to-end verification.
