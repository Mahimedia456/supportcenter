/* SupportCenter P29: guarded, one-time Atomos 90-day snapshot backfill.
 * Uses the existing backend Zendesk stage implementation. No API server changes.
 * Never prints connection strings, Zendesk secrets, or app passwords.
 */
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { runStage, markStageFailure, type SyncStage } from '../../api/_support-staged-sync';

const PROJECT_REF = 'vggiadhzvqklqkztjmnb';
const WORKSPACE = 'atomos' as const;
const LOCK_KEY = 74251008; // Same advisory lock as the Vercel Atomos sync endpoint.
const STAGES: SyncStage[] = ['reference','satisfaction','metrics','tickets','metric-events'];
const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKPOINT = join(HERE, 'progress.atomos.json');
const args = new Set(process.argv.slice(2));
const mode = args.has('--run') ? 'run' : args.has('--verify') ? 'verify' : args.has('--preflight') ? 'preflight' : '';
if (!mode || (args.has('--run') && (args.has('--verify') || args.has('--preflight')))) {
  console.error('USAGE: run-backfill.ts --preflight | --run | --verify');
  process.exit(2);
}
loadEnv({ path: join(process.cwd(), '.env'), quiet: true });

function safeError(e:unknown):string {
  const x = e instanceof Error ? e.message : String(e);
  // Never include embedded credentials from connection errors.
  return x.replace(/postgres(?:ql)?:\/\/\S+/gi,'[REDACTED_DB_URI]')
          .replace(/Bearer\s+\S+/gi,'Bearer [REDACTED]')
          .slice(0,300);
}
function configured(s:string):boolean { return Boolean((process.env[s]||'').trim()); }
function databaseConfig(){
  const raw=(process.env.SUPABASE_DATABASE_URL||'').trim();
  if(!raw) throw new Error('SUPABASE_DATABASE_URL_MISSING');
  let u: URL;
  try{u=new URL(raw);}catch{throw new Error('INVALID_SUPABASE_DATABASE_URL');}
  if(!['postgresql:','postgres:'].includes(u.protocol))throw new Error('INVALID_DB_PROTOCOL');
  if(!u.username.includes(PROJECT_REF) && !u.hostname.includes(PROJECT_REF))
    throw new Error('WRONG_DATABASE_PROJECT: Must target vggiadhzvqklqkztjmnb');
  u.searchParams.delete('sslmode');u.searchParams.delete('uselibpqcompat');
  return {connectionString:u.toString(),ssl:{rejectUnauthorized:true},connectionTimeoutMillis:20000};
}
function validateCredentials(){
  const keys=['ATOMOS_ZENDESK_SUBDOMAIN','ATOMOS_ZENDESK_EMAIL','ATOMOS_ZENDESK_API_TOKEN'];
  for (const k of keys) if (!configured(k))throw new Error(`${k}_MISSING`);
  console.log('ATOMOS_ZENDESK_ENV_PASS: all three required variables configured');
}
interface Progress {project:string;workspace:string;stageIndex:number;cursor:string;completed:boolean;}
function initial():Progress {return {project:PROJECT_REF,workspace:WORKSPACE,stageIndex:0,cursor:'',completed:false};}
async function loadProgress():Promise<Progress>{
  try{
    const x=JSON.parse(await readFile(CHECKPOINT,'utf8')) as Progress;
    if(x.project!==PROJECT_REF||x.workspace!==WORKSPACE||!Number.isInteger(x.stageIndex)||x.stageIndex<0||x.stageIndex>STAGES.length||typeof x.cursor!=='string')
      throw new Error('CHECKPOINT_INVALID_OR_WRONG_PROJECT');
    return x;
  }catch(e:any){if(e?.code==='ENOENT')return initial();throw e;}
}
async function saveProgress(x:Progress){
  const temp=CHECKPOINT+'.tmp';
  await writeFile(temp,JSON.stringify({...x,updatedAt:new Date().toISOString()},null,2),'utf8');
  await rename(temp,CHECKPOINT);
}
async function rowSummary(c:Client){
  const r=await c.query(`select workspace_slug,sync_status,synced_at,last_error,
  jsonb_array_length(tickets) as tickets,
  jsonb_array_length(satisfaction) as satisfaction,
  jsonb_array_length(metric_events) as metric_events
  from public.zendesk_cache_snapshots where workspace_slug=$1`,[WORKSPACE]);
  const row=r.rows[0]||null;
  console.log('SNAPSHOT_STATE',JSON.stringify(row));
  return row;
}
async function main(){
  if(mode!=='verify')validateCredentials();
  const c=new Client(databaseConfig());
  let locked=false;
  try{
    await c.connect();
    console.log('DATABASE_CONNECTION_PASS: verified TLS, new Supabase project');
    await rowSummary(c);
    if(mode==='preflight'){console.log('BACKFILL_PREFLIGHT_PASS: no data modified');return;}
    if(mode==='verify'){
      const r=await c.query(`select synced_at,sync_status,jsonb_array_length(tickets) as tickets from public.zendesk_cache_snapshots where workspace_slug=$1`,[WORKSPACE]);
      const x=r.rows[0];
      if(!x?.synced_at||x?.sync_status!=='ok'||Number(x?.tickets||0)<1)throw new Error('SNAPSHOT_NOT_READY');
      console.log('ATOMOS_SNAPSHOT_READY_PASS: ticket data present');return;
    }
    const lock=await c.query('select pg_try_advisory_lock($1) as locked',[LOCK_KEY]);
    locked=Boolean(lock.rows?.[0]?.locked);
    if(!locked)throw new Error('CONCURRENT_SYNC_IN_PROGRESS: Atomos lock busy; do not run simultaneously');
    const progress=await loadProgress();
    if(progress.completed){
      console.log('BACKFILL_ALREADY_COMPLETED: run --verify; remove checkpoint only if new full import explicitly intended');return;
    }
    console.log('BACKFILL_BEGIN: Atomos 90-day snapshot. Progress will be checkpointed without passwords.');
    for(let idx=progress.stageIndex;idx<STAGES.length;idx++){
      const stage=STAGES[idx];
      let cursor=idx===progress.stageIndex?progress.cursor:'';
      let done=false;
      for(let part=1;part<=250;part++){
        console.log(`RUN_STAGE workspace=${WORKSPACE} stage=${stage} chunk=${part}`);
        let r: Awaited<ReturnType<typeof runStage>>;
        try{r=await runStage(c,WORKSPACE,stage,cursor||null);}
        catch(e){await markStageFailure(c,WORKSPACE,stage,e).catch(()=>{});throw e;}
        if(!r||r.workspace!==WORKSPACE||r.stage!==stage)throw new Error(`STAGE_INVALID_RESULT ${stage}`);
        const count='count'in r?r.count:('counts'in r?JSON.stringify(r.counts):'?');
        console.log(`STAGE_RESULT stage=${stage} count=${count} done=${r.done===true}`);
        if(r.done===true){
          progress.stageIndex=idx+1;progress.cursor='';await saveProgress(progress);
          done=true;break;
        }
        const next='next'in r?String(r.next||''):'';
        if(!next)throw new Error(`STAGE_NO_NEXT_CURSOR: ${stage}`);
        cursor=next;progress.stageIndex=idx;progress.cursor=cursor;await saveProgress(progress);
      }
      if(!done)throw new Error(`STAGE_CHUNK_LIMIT_REACHED: ${stage}`);
    }
    const final=await rowSummary(c);
    if(!final?.synced_at||final.sync_status!=='ok'||Number(final.tickets||0)<1){
      throw new Error('BACKFILL_NO_VERIFIED_TICKETS_OR_SYNC_TIME');
    }
    progress.completed=true;await saveProgress(progress);
    console.log('ATOMOS_SNAPSHOT_BACKFILL_PASS: ready + tickets > 0; next check mobile snapshot meta');
    console.log('NOTE: Conversations remain on-demand; this importer did not bulk fetch private comments.');
  } finally {
    if(locked)await c.query('select pg_advisory_unlock($1)',[LOCK_KEY]).catch(()=>{});
    await c.end().catch(()=>{});
  }
}
main().catch(e=>{console.error('ATOMOS_BACKFILL_FAIL',safeError(e));process.exitCode=1;});
