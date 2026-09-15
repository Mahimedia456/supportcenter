import 'dotenv/config';
import dns from 'node:dns/promises';
import { Pool } from 'pg';

const PROJECT_REF = 'azabpgjshpbcdzfuzyhi';

function buildPoolConfig(raw: string) {
  const parsed = new URL(raw);

  // pg-connection-string can translate sslmode=require into certificate
  // verification behavior. For this app we keep TLS enabled explicitly and
  // avoid local Windows/ISP CA-chain failures from the Supabase pooler.
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
  const raw = (process.env.SUPABASE_DATABASE_URL || '').trim();

  if (!/^postgres(ql)?:\/\//i.test(raw)) {
    throw new Error(
      'SUPABASE_DATABASE_URL must be a PostgreSQL URI from Supabase Dashboard > Connect > Session pooler.',
    );
  }

  const parsed = new URL(raw);
  const isDirect =
    parsed.hostname === `db.${PROJECT_REF}.supabase.co` ||
    parsed.hostname.startsWith('db.');
  const isPooler = parsed.hostname.endsWith('.pooler.supabase.com');

  console.log(`DB host: ${parsed.hostname}:${parsed.port || '5432'}`);
  console.log(
    `Connection mode: ${
      isPooler
        ? 'Supabase Session/Transaction Pooler'
        : isDirect
          ? 'Direct database'
          : 'Custom PostgreSQL host'
    }`,
  );

  try {
    const addresses = await dns.lookup(parsed.hostname, { all: true });
    if (!addresses.length) throw new Error('No DNS addresses returned');

    console.log(
      'DNS: PASS',
      addresses
        .map((x) => `${x.family === 6 ? 'IPv6' : 'IPv4'} ${x.address}`)
        .join(', '),
    );
  } catch (error: any) {
    console.error(`DNS: FAIL (${error?.code || error?.message || error})`);
    process.exit(2);
  }

  if (isPooler) {
    const user = decodeURIComponent(parsed.username);
    if (!user.includes('.')) {
      console.warn(
        `WARNING: Supabase pooler username normally looks like postgres.${PROJECT_REF}`,
      );
    }
  }

  const pool = new Pool(buildPoolConfig(raw));

  try {
    const result = await pool.query(
      'select now() as now, current_database() as db, current_user as user_name',
    );

    console.log('PASS: Supabase PostgreSQL connected');
    console.log(result.rows[0]);
  } catch (error: any) {
    console.error('FAIL: Supabase PostgreSQL connection failed.');
    console.error(error?.code || error?.message || error);

    if (error?.code === '28P01') {
      console.error(
        'Authentication failed. Verify the database password and pooler username.',
      );
    }

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
