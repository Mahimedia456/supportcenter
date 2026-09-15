import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

function poolConfig() {
  const raw = (process.env.SUPABASE_DATABASE_URL || '').trim();
  if (!/^postgres(ql)?:\/\//i.test(raw)) {
    throw new Error('SUPABASE_DATABASE_URL is missing or invalid.');
  }

  const parsed = new URL(raw);
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('uselibpqcompat');

  return {
    connectionString: parsed.toString(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    max: 2,
  };
}

async function main() {
  const sqlPath = path.resolve(process.cwd(), 'sql', 'PHASE_02_AUTH_SCHEMA.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Schema file not found: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const pool = new Pool(poolConfig());

  try {
    console.log('Applying Phase 02 auth/workspace schema...');
    await pool.query(sql);

    const result = await pool.query(`
      select
        to_regclass('public.users') as users,
        to_regclass('public.workspaces') as workspaces,
        to_regclass('public.workspace_members') as workspace_members,
        to_regclass('public.user_sessions') as user_sessions
    `);

    console.log('PASS: schema applied');
    console.log(result.rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('FAIL: schema apply failed');
  console.error(error?.code || error?.message || error);
  process.exit(1);
});
