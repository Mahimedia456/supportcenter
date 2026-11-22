// Optional safe installer. Reads external DB env only; no credentials embedded.
require('dotenv').config();
const fs=require('node:fs');
const path=require('node:path');
const {Client}=require('pg');
const REF='vggiadhzvqklqkztjmnb';
async function main(){
 if(process.env.CONFIRM_PHASE26_NEW_DB!=='YES')
  throw new Error('Set CONFIRM_PHASE26_NEW_DB=YES only after verifying target project');
 const raw=process.env.SUPABASE_DATABASE_URL||'';
 if(!raw.startsWith('postgresql://')&&!raw.startsWith('postgres://'))
  throw new Error('SUPABASE_DATABASE_URL is missing');
 const url=new URL(raw);
 if(!(url.hostname.includes(REF)||url.username.includes(REF)))
  throw new Error('Refusing schema apply: URI does not target new project');
 url.searchParams.delete('sslmode');url.searchParams.delete('uselibpqcompat');
 const c=new Client({connectionString:url.toString(),ssl:{rejectUnauthorized:true},connectionTimeoutMillis:15000});
 const sql=fs.readFileSync(path.join(__dirname,'../sql/PHASE_26_NEW_SUPABASE_BOOTSTRAP.sql'),'utf8');
 try{await c.connect();await c.query(sql);console.log('PHASE26_SCHEMA_APPLIED (idempotent)')}
 finally{await c.end().catch(()=>{})}
}
main().catch(err=>{console.error('PHASE26_APPLY_FAIL',err.code||err.message);process.exitCode=1});
