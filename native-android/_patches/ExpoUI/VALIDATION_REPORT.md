# Static validation
- Expo login/auth source inspected, exact auth route and fallback URL verified.
- Native B2/B3 source inspected; known hotfix import accounted for.
- Four patched Kotlin files created with balanced delimiters; no credential literals.
- Hash manifest pins B2/B3 inputs and outputs; patch performs backup and rollback.
- Build/ADB script uses a non-reserved PID variable and requires authorized device.
- Production diagnostic reads deployed hostname only; never prints DB URI or secrets.
- NOT COMPILED IN THIS CONTAINER: no Android SDK/Gradle Android dependencies. Gradle compilation/ADB testing pending on user's Windows machine.
