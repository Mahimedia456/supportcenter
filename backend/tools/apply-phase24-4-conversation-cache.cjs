require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const raw = String(process.env.SUPABASE_DATABASE_URL || '').trim();
  if (!raw) throw new Error('SUPABASE_DATABASE_URL missing in backend .env');

  const url = new URL(raw);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('uselibpqcompat');

  const client = new Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  });

  const sqlPath = path.join(
    __dirname,
    '..',
    'sql',
    'PHASE_24_4_TICKET_CONVERSATION_SNAPSHOT.sql',
  );

  const sql = fs.readFileSync(sqlPath, 'utf8');

  await client.connect();
  try {
    await client.query(sql);
    console.log('PASS: ticket conversation snapshot table ready.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
