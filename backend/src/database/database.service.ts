import 'dotenv/config';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResultRow } from 'pg';

function databaseUrl() {
  const value = (process.env.SUPABASE_DATABASE_URL || '').trim();

  if (!value) {
    throw new Error(
      'SUPABASE_DATABASE_URL is required. Copy the PostgreSQL Session Pooler URI from Supabase Dashboard > Connect.',
    );
  }

  if (!/^postgres(ql)?:\/\//i.test(value)) {
    throw new Error(
      'SUPABASE_DATABASE_URL must start with postgresql:// or postgres://.',
    );
  }

  return value;
}

function poolConfig() {
  const parsed = new URL(databaseUrl());

  // Remove sslmode query handling and configure TLS explicitly so the
  // Supabase pooler does not fail on local/self-signed CA-chain handling.
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('uselibpqcompat');

  return {
    connectionString: parsed.toString(),
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 15000,
  };
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool = new Pool(poolConfig());

  query<T extends QueryResultRow = any>(
    text: string,
    params: unknown[] = [],
  ) {
    return this.pool.query<T>(text, params);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}

