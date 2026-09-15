import { Pool } from 'pg';

function present(name: string) {
  return Boolean(
    process.env[name] &&
    String(process.env[name]).trim(),
  );
}

function safeDatabaseHost() {
  try {
    const raw =
      process.env.SUPABASE_DATABASE_URL || '';

    if (!raw) return null;

    const parsed = new URL(raw);

    return {
      host: parsed.hostname,
      port: parsed.port || null,
      database:
        parsed.pathname.replace(/^\//, '') || null,
      sslMode:
        parsed.searchParams.get('sslmode') || null,
    };
  } catch {
    return {
      parseError: true,
    };
  }
}

export default async function handler(
  _req: any,
  res: any,
) {
  const checks: Record<string, any> = {
    environment: {
      SUPABASE_URL: present('SUPABASE_URL'),
      SUPABASE_DATABASE_URL:
        present('SUPABASE_DATABASE_URL'),
      JWT_ACCESS_SECRET:
        present('JWT_ACCESS_SECRET'),
      JWT_REFRESH_SECRET:
        present('JWT_REFRESH_SECRET'),
      AAMIR_PASSWORD:
        present('AAMIR_PASSWORD'),
      SHAHID_PASSWORD:
        present('SHAHID_PASSWORD'),
      ANGELBIRD_ZENDESK_SUBDOMAIN:
        present('ANGELBIRD_ZENDESK_SUBDOMAIN'),
      ANGELBIRD_ZENDESK_EMAIL:
        present('ANGELBIRD_ZENDESK_EMAIL'),
      ANGELBIRD_ZENDESK_API_TOKEN:
        present('ANGELBIRD_ZENDESK_API_TOKEN'),
      ATOMOS_ZENDESK_SUBDOMAIN:
        present('ATOMOS_ZENDESK_SUBDOMAIN'),
      ATOMOS_ZENDESK_EMAIL:
        present('ATOMOS_ZENDESK_EMAIL'),
      ATOMOS_ZENDESK_API_TOKEN:
        present('ATOMOS_ZENDESK_API_TOKEN'),
    },
    databaseTarget: safeDatabaseHost(),
    database: {
      ok: false,
      error: null as string | null,
    },
  };

  if (!present('SUPABASE_DATABASE_URL')) {
    checks.database.error =
      'SUPABASE_DATABASE_URL is missing';

    return res.status(200).json({
      ok: false,
      service: 'Support Command Center Diagnostics',
      checks,
    });
  }

  const pool = new Pool({
    connectionString:
      process.env.SUPABASE_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 1,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 8000,
  });

  try {
    await pool.query('select 1 as ok');
    checks.database.ok = true;
  } catch (error: any) {
    checks.database.error =
      error?.code ||
      error?.message ||
      'Database connection failed';
  } finally {
    await pool.end().catch(() => undefined);
  }

  const requiredCore = [
    checks.environment.SUPABASE_DATABASE_URL,
    checks.environment.JWT_ACCESS_SECRET,
    checks.environment.JWT_REFRESH_SECRET,
  ].every(Boolean);

  return res.status(200).json({
    ok: requiredCore && checks.database.ok,
    service: 'Support Command Center Diagnostics',
    timestamp: new Date().toISOString(),
    checks,
  });
}
