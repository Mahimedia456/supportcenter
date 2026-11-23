SupportCenter Aamir-only Angelbird account seed (new Supabase)

1. Extract ZIP to E:\Supportcenter\native-android\_patches\AamirSeed
2. Run in PowerShell:
   & "E:\Supportcenter\native-android\_patches\AamirSeed\SET-AAMIR-PASSWORD.ps1" -RepoPath "E:\Supportcenter"
3. Enter a NEW APP login password twice (hidden). Do not use the Supabase database password.
4. Expect AAMIR_ACCOUNT_SEEDED_PASS, AAMIR_WORKSPACE_PASS: angelbird and SEED_AAMIR_COMPLETED.
5. Verify Vercel login using FullUI\CHECK-LOGIN-VERCEL.ps1 -TestLogin.
   Email: aamir@mahimediasolutions.com (password entered securely).

Requirements: backend node_modules, E:\Supportcenter\backend\.env pointing to vggiadhzvqklqkztjmnb, trusted CA certificate as needed.
Optional -CaCert PATH. Auto-detects E:\SupportCenter-P26-Certs\supabase-ca.crt.
The seed only upserts the Aamir user/password and active Angelbird manager membership.
It does not touch Shahid account, app files, Vercel configuration or other users.
Password is passed via stdin, hashed with bcrypt, and not written into any patch file.
