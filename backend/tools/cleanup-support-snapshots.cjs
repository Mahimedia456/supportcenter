require('dotenv').config();
const {Client}=require('pg');
(async()=>{
 const raw=String(process.env.SUPABASE_DATABASE_URL||'').trim();
 if(!raw)throw new Error('SUPABASE_DATABASE_URL missing in backend/.env');
 const u=new URL(raw);u.searchParams.delete('sslmode');u.searchParams.delete('uselibpqcompat');
 const c=new Client({connectionString:u.toString(),ssl:{rejectUnauthorized:false}});await c.connect();
 try{
  const names=['zendesk_cache_snapshots','zendesk_ticket_conversation_snapshots'];
  for(const name of names){
   const exists=(await c.query('select to_regclass($1) as rel',[`public.${name}`])).rows[0]?.rel;
   if(!exists){console.log(`SKIP: ${name} does not exist`);continue;}
   const before=(await c.query(`select pg_size_pretty(pg_total_relation_size('public.${name}')) as size`)).rows[0]?.size;
   console.log(`BEFORE ${name}: ${before}`);
   await c.query(`truncate table public.${name}`);
   const after=(await c.query(`select pg_size_pretty(pg_total_relation_size('public.${name}')) as size`)).rows[0]?.size;
   console.log(`AFTER  ${name}: ${after}`);
  }
  console.log('PASS: snapshot tables cleared. Run the single hourly sync once to repopulate the two workspace rows.');
 }finally{await c.end();}
})().catch(e=>{console.error(e?.message||e);process.exit(1)});
