# Batch 2 static validation

- Guarded source SHA-256 manifests: every existing patched file matches original Batch 1 source packaged in this conversation.
- PowerShell 5.1 checksum error fixed by `Invoke-WebRequest -OutFile` followed by `ReadAllText` and SHA-256 match against official Gradle distribution.
- Existing B1 `MainActivity`, `SupportScreens`, `SupportRepository` and `MainViewModel` expanded without touching authentication/brand resources.
- Backend P26 `part=meta`, `part=tickets`, `part=forms`, `part=fields`, `part=groups`, `part=agents`, `part=metric-events` shape reviewed; ticket conversation shape verified against backend API source.
- No Android SDK installed in authoring runtime. Gradle build/APK/device testing **not executed**.
