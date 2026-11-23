'use strict';
// Single-account, transactionally safe seeding. Reads password from STDIN only.
const path = require('node:path');
const { createRequire } = require('node:module');
const backend = process.env.SUPPORTCENTER_BACKEND_PATH || path.resolve(process.cwd(), 'backend');
const requireFromBackend = createRequire(path.join(backend, 'package.json'));
const dotenv = requireFromBackend('dotenv');
const { Client } = requireFromBackend('pg');
const bcrypt = requireFromBackend('bcryptjs');
const PROJECT_REF = 'vggiadhzvqklqkztjmnb';
const EMAIL = 'shahid@mahimediasolutions.com';

async function readPassword() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  // PowerShell string pipeline adds one final newline. Do not trim password characters.
  return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
}

async function main() {
  const loaded = dotenv.config({ path: path.join(backend, '.env'), quiet: true });
  if (loaded.error) throw new Error('BACKEND_DOTENV_NOT_READABLE');
  const raw = (process.env.SUPABASE_DATABASE_URL || '').trim();
  if (!/^postgres(?:ql)?:\/\//.test(raw)) throw new Error('SUPABASE_DATABASE_URL_NOT_CONFIGURED');
  const uri = new URL(raw);
  if (!uri.username.includes(PROJECT_REF) && !uri.hostname.includes(PROJECT_REF)) {
    throw new Error('WRONG_DB_PROJECT: local .env is not pointing to new Supabase');
  }
  if (!(/(^|\.)pooler\.supabase\.com$/i.test(uri.hostname) || uri.hostname === `db.${PROJECT_REF}.supabase.co`)) {
    throw new Error('UNEXPECTED_DATABASE_HOSTNAME');
  }
  const pass = await readPassword();
  if (pass.length < 12) throw new Error('APP_PASSWORD_TOO_SHORT: use at least 12 characters');
  if (pass === decodeURIComponent(uri.password || '')) throw new Error('APP_PASSWORD_MUST_DIFFER_FROM_DATABASE_PASSWORD');
  uri.searchParams.delete('sslmode');
  uri.searchParams.delete('uselibpqcompat');
  const client = new Client({
    connectionString: uri.toString(),
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 20000,
  });
  try {
    await client.connect();
    console.log('TARGET_PROJECT_PASS:', PROJECT_REF);
    await client.query('BEGIN');
    const ws = await client.query(
      'select id from public.workspaces where slug=$1 and is_active=true limit 1', ['atomos']
    );
    if (!ws.rows.length) throw new Error('ATOMOS_WORKSPACE_MISSING_OR_INACTIVE: run project bootstrap SQL');
    const hash = await bcrypt.hash(pass, 12);
    const user = await client.query(
      `insert into public.users (email,display_name,password_hash,is_active)
       values ($1,$2,$3,true)
       on conflict(email) do update set
         display_name=excluded.display_name,
         password_hash=excluded.password_hash,
         is_active=true,
         updated_at=now()
       returning id`,
      [EMAIL, 'Shahid', hash]
    );
    await client.query(
      `insert into public.workspace_members (user_id,workspace_id,role,is_active)
       values ($1,$2,'manager',true)
       on conflict(user_id,workspace_id) do update set role='manager',is_active=true`,
      [user.rows[0].id, ws.rows[0].id]
    );
    const counts = await client.query(
      `select
         (select count(*)::int from public.users) as users,
         (select count(*)::int from public.workspace_members where is_active) as memberships`
    );
    await client.query('COMMIT');
    console.log('SHAHID_ACCOUNT_SEEDED_PASS:', EMAIL);
    console.log('SHAHID_WORKSPACE_PASS: atomos');
    console.log('ACTIVE_MEMBERSHIPS:', counts.rows[0].memberships);
    console.log('TOTAL_USERS:', counts.rows[0].users);
    console.log('PASSWORD: stored as bcrypt hash only');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}
main().catch(err => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('SHAHID_SEED_FAILED:', msg);
  process.exitCode = 1;
});
