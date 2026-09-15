import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const raw = (process.env.SUPABASE_DATABASE_URL || '').trim();

if (!/^postgres(ql)?:\/\//i.test(raw)) {
  throw new Error(
    'SUPABASE_DATABASE_URL must be a PostgreSQL URI from Supabase Dashboard > Connect.',
  );
}

function buildPoolConfig(url: string) {
  const parsed = new URL(url);
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('uselibpqcompat');

  return {
    connectionString: parsed.toString(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    max: 2,
  };
}

const pool = new Pool(buildPoolConfig(raw));

async function upsertUser(
  email: string,
  displayName: string,
  password: string,
  workspaceSlug: string,
) {
  if (!password || password === 'CHANGE_ME') {
    throw new Error(`Set a real password env value for ${email}`);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const u = await pool.query(
    `insert into users (email,display_name,password_hash)
     values ($1,$2,$3)
     on conflict (email)
     do update set
       display_name=excluded.display_name,
       password_hash=excluded.password_hash,
       is_active=true,
       updated_at=now()
     returning id`,
    [email.toLowerCase(), displayName, passwordHash],
  );

  const w = await pool.query(
    `select id from workspaces where slug=$1 limit 1`,
    [workspaceSlug],
  );

  if (!w.rows[0]) {
    throw new Error(
      `Workspace ${workspaceSlug} not found. Run PHASE_02_AUTH_SCHEMA.sql first.`,
    );
  }

  await pool.query(
    `insert into workspace_members (user_id,workspace_id,role,is_active)
     values ($1,$2,'manager',true)
     on conflict (user_id,workspace_id)
     do update set role='manager',is_active=true`,
    [u.rows[0].id, w.rows[0].id],
  );
}

async function main() {
  await pool.query('select 1');
  console.log('PASS: database connection');

  await upsertUser(
    'aamir@mahimediasolutions.com',
    'Aamir',
    process.env.AAMIR_PASSWORD || '',
    'angelbird',
  );

  await upsertUser(
    'shahid@mahimediasolutions.com',
    'Shahid',
    process.env.SHAHID_PASSWORD || '',
    'atomos',
  );

  console.log('PASS: Phase 02 users/workspaces seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => pool.end());
