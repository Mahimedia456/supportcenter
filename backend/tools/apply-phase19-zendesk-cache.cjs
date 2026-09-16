
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

async function main() {
  const raw = String(process.env.SUPABASE_DATABASE_URL || "").trim();
  if (!raw) throw new Error("SUPABASE_DATABASE_URL missing");

  const url = new URL(raw);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("uselibpqcompat");

  const pool = new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 15000,
  });

  try {
    const sql = fs.readFileSync(
      path.resolve(__dirname, "..", "PHASE_19_ZENDESK_CACHE.sql"),
      "utf8",
    );

    await pool.query(sql);

    const check = await pool.query(
      "select to_regclass('public.zendesk_cache_snapshots') as name",
    );

    if (!check.rows[0]?.name) {
      throw new Error("zendesk_cache_snapshots table was not created");
    }

    console.log("PASS: zendesk_cache_snapshots ready");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
