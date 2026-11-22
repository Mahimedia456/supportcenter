// Read-only probe. Never prints environment secrets.
require('dotenv').config();
const {Client}=require('pg');
const PROJECT_REF='vggiadhzvqklqkztjmnb';
const TABLES=[
 'users','workspaces','workspace_members','user_sessions',
 'alert_preferences','device_push_tokens','watchlists','sync_state',
 'zendesk_oauth_tokens','zendesk_cache_snapshots',
 'zendesk_ticket_conversation_snapshots',
];
async function main(){
 const raw=process.env.SUPABASE_DATABASE_URL||'';
 if(!raw.startsWith('postgresql://')&&!raw.startsWith('postgres://'))
  throw new Error('Missing SUPABASE_DATABASE_URL PostgreSQL connection');
 const url=new URL(raw);
 if(!(url.hostname.includes(PROJECT_REF)||url.username.includes(PROJECT_REF)))
  throw new Error('DB URI does not target the intended new Supabase project');
 url.searchParams.delete('sslmode');
 url.searchParams.delete('uselibpqcompat');
 const c=new Client({connectionString:url.toString(),ssl:{rejectUnauthorized:true},connectionTimeoutMillis:15000});
 try{
  await c.connect();
  const checks=await c.query('select current_database() as db, current_user as role, now() as checked_at');
  console.log('CONNECTION_PASS',JSON.stringify(checks.rows[0]));
  let missing=0;
  for(const table of TABLES){
   const r=await c.query('select to_regclass($1) as regclass',[`public.${table}`]);
   const exists=Boolean(r.rows[0]?.regclass);
   console.log(exists?'TABLE_PASS':'TABLE_MISSING',table);
   if(!exists)missing++;
  }
  if(missing)throw new Error(`${missing} required tables missing`);
  const r=await c.query(`select workspace_slug,jsonb_array_length(tickets) as tickets,
   jsonb_array_length(metric_events) as metric_events,
   synced_at,sync_status,last_error from public.zendesk_cache_snapshots order by workspace_slug`);
  console.log('SNAPSHOTS',JSON.stringify(r.rows));
 }finally{await c.end().catch(()=>{})}
}
main().catch(err=>{console.error('PHASE26_FAIL',err.code||err.message);process.exitCode=1});
