# Support Command Center Backend — Phase 02

## Setup

1. Create `backend/.env` from `.env.example`.
2. Put the Supabase PostgreSQL connection string in `SUPABASE_DATABASE_URL`.
3. Set strong JWT secrets.
4. Set local passwords for `AAMIR_PASSWORD` and `SHAHID_PASSWORD`.
5. Run `sql/PHASE_02_AUTH_SCHEMA.sql` in Supabase SQL Editor.
6. Install + seed:

```powershell
cd E:\Supportcenter\backend
npm install
npm run seed:phase02
npm run start:dev
```

Health:
`GET http://127.0.0.1:3000/health`

Auth:
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Zendesk credentials are intentionally backend-only and are not consumed until Phase 03.
