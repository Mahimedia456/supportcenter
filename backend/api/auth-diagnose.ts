import { Pool } from 'pg';

function poolConfig() {
  const raw = (process.env.SUPABASE_DATABASE_URL || '').trim();

  if (!raw) {
    throw new Error('SUPABASE_DATABASE_URL is missing');
  }

  const parsed = new URL(raw);
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('uselibpqcompat');

  return {
    connectionString: parsed.toString(),
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 1000,
  };
}

export default async function handler(
  _req: any,
  res: any,
) {
  const pool = new Pool(poolConfig());

  try {
    const tables = await pool.query(
      `select
         to_regclass('public.users') as users,
         to_regclass('public.workspaces') as workspaces,
         to_regclass('public.workspace_members') as workspace_members,
         to_regclass('public.user_sessions') as user_sessions`
    );

    const columns = await pool.query(
      `select column_name
       from information_schema.columns
       where table_schema='public'
         and table_name='user_sessions'
       order by ordinal_position`
    );

    const users = await pool.query(
      `select
         count(*)::int as total_users,
         count(*) filter (where is_active=true)::int as active_users
       from public.users`
    );

    const memberships = await pool.query(
      `select count(*)::int as active_memberships
       from public.workspace_members
       where is_active=true`
    );

    return res.status(200).json({
      ok: true,
      service: 'Support Command Center Auth Schema Diagnostics',
      tables: tables.rows[0],
      userSessionColumns: columns.rows.map(
        (row) => row.column_name,
      ),
      counts: {
        totalUsers: users.rows[0]?.total_users ?? 0,
        activeUsers: users.rows[0]?.active_users ?? 0,
        activeMemberships:
          memberships.rows[0]?.active_memberships ?? 0,
      },
      expectedAuthSessionContract: {
        table: 'user_sessions',
        tokenColumn: 'refresh_token_hash',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(200).json({
      ok: false,
      service: 'Support Command Center Auth Schema Diagnostics',
      errorCode: error?.code || null,
      error: error?.message || 'Auth schema check failed',
      timestamp: new Date().toISOString(),
    });
  } finally {
    await pool.end().catch(() => undefined);
  }
}
