SupportCenter Shahid-only account seed

1. Extract ZIP to E:\Supportcenter\native-android\_patches\ShahidSeed
2. PowerShell:
   & "E:\Supportcenter\native-android\_patches\ShahidSeed\SET-SHAHID-PASSWORD.ps1" -RepoPath "E:\Supportcenter"
3. Enter a NEW APP login password twice (hidden). Do not use the Supabase DB password.
4. Expect SHAHID_ACCOUNT_SEEDED_PASS and SEED_SHAHID_COMPLETED.
5. Rerun your FullUI\CHECK-LOGIN-VERCEL.ps1 -TestLogin to verify HTTP 200.

Requires backend npm dependencies and backend/.env pointing to the new project. CA certificate: pass -CaCert PATH if needed. The script auto-detects E:\SupportCenter-P26-Certs\supabase-ca.crt.

No credentials included or written to disk. Only Shahid's new app password and Atomos active membership are upserted. No changes to Expo/native app source, Vercel settings, or other users.
