# Support Command Center — Login 500 Root Cause Fix

The uploaded backend was inspected directly.

## Exact bug

Database schema creates:

```sql
public.user_sessions
refresh_token_hash
```

but `src/auth/auth.service.ts` was using:

```sql
refresh_sessions
token_hash
```

That means:

1. user/password lookup can succeed
2. bcrypt can succeed
3. workspace lookup can succeed
4. session creation then runs an INSERT against a non-existent table
5. Nest returns HTTP 500
6. mobile displays Internal Server Error

This explains why `/api/diagnose` showed the DB connection as healthy.

## Fixed contract

Login/session operations now consistently use:

```sql
user_sessions
refresh_token_hash
```

The fix applies to:

- login session creation
- refresh session lookup
- refresh token revocation
- logout session revocation

## Production auth diagnostic

After deploy:

```text
https://supportcenter-kappa.vercel.app/api/auth-diagnose
```

This confirms:

- `users`
- `workspaces`
- `workspace_members`
- `user_sessions`
- actual `user_sessions` columns
- active user/member counts

No passwords, hashes, or secret values are returned.

## Install

Merge into `E:\Supportcenter`, then:

```powershell
cd E:\Supportcenter\backend
Set-ExecutionPolicy -Scope Process Bypass -Force
.\INSTALL-AUTH-SESSION-FIX.ps1
```

Then:

```powershell
cd E:\Supportcenter
git add .
git commit -m "Fix production auth session table"
git push
```

Redeploy Vercel, then test `/api/auth-diagnose` and mobile login.
