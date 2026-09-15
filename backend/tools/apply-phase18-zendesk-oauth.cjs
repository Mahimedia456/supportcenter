require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

async function main() {
  const raw = String(
    process.env.SUPABASE_DATABASE_URL || ""
  ).trim();

  if (!raw) {
    throw new Error(
      "SUPABASE_DATABASE_URL is missing from backend .env"
    );
  }

  const url = new URL(raw);

  // Node pg handles SSL below. Remove libpq-only query params.
  url.searchParams.delete("sslmode");
  url.searchParams.delete("uselibpqcompat");

  const sqlPath = path.resolve(
    __dirname,
    "..",
    "PHASE_18_ZENDESK_OAUTH.sql"
  );

  if (!fs.existsSync(sqlPath)) {
    throw new Error(
      `Missing SQL migration: ${sqlPath}`
    );
  }

  const sql = fs.readFileSync(
    sqlPath,
    "utf8"
  );

  const pool = new Pool({
    connectionString: url.toString(),
    ssl: {
      rejectUnauthorized: false,
    },
    max: 1,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 2000,
  });

  try {
    await pool.query("select 1 as ok");
    await pool.query(sql);

    const result = await pool.query(`
      select
        to_regclass('public.zendesk_oauth_tokens') as table_name
    `);

    if (
      !result.rows[0] ||
      !result.rows[0].table_name
    ) {
      throw new Error(
        "zendesk_oauth_tokens table was not created"
      );
    }

    console.log(
      "PASS: zendesk_oauth_tokens schema ready"
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    "Phase 18 OAuth migration failed:",
    error && error.message
      ? error.message
      : error
  );
  process.exit(1);
});
