'use strict';
/*
 P31 scheduled publisher: reproduce the verified V4 paged read on GitHub runner,
 stage immutable complete period reports, then atomically switch a tiny active
 version pointer. No Vercel multi-minute SQL, no full JSONB SELECT, no Zendesk calls.
 The existing P30 rows remain as rollback until first P31 active version.
*/
const {Client}=require('pg');
const path=require('node:path');
require('dotenv').config({path:path.join(__dirname,'..','.env'),quiet:true});

const EXPECTED_PROJECT='vggiadhzvqklqkztjmnb';
const workspaceAt=process.argv.indexOf('--workspace');
const WORKSPACE=workspaceAt>=0?process.argv[workspaceAt+1]:'atomos';
if(!['atomos','angelbird'].includes(WORKSPACE))throw Error('INVALID_WORKSPACE');
const PERIODS=['today','30','60','90'];
const SPECS=[
  {key:'tickets',batch:25},
  {key:'fields',batch:10},
  {key:'forms',batch:25},
  {key:'agents',batch:25},
  {key:'groups',batch:25},
  {key:'satisfaction',batch:60},
  {key:'metrics',batch:60},
  {key:'metric-events',batch:40},
];
const redact=err=>String(err instanceof Error?err.message:err)
 .replace(/postgres(?:ql)?:\/\/\S+/gi,'[REDACTED_DB_URI]')
 .replace(/Bearer\s+\S+/gi,'Bearer [REDACTED]').slice(0,280);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const parseTime=x=>{const t=Date.parse(String(x||''));return Number.isFinite(t)?t:null};
const arr=x=>Array.isArray(x)?x:[];
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const dateOf=x=>x&&typeof x==='object'?(parseTime(x.created_at)??parseTime(x.updated_at)):null;
const pick=(item,keys)=>Object.fromEntries(keys.map(k=>[k,Object.prototype.hasOwnProperty.call(item,k)?item[k]:null]));
const TICKET_KEYS=['id','subject','status','priority','created_at','updated_at','description',
  'assignee_id','requester_id','group_id','ticket_form_id','type','tags','custom_fields'];
const RATING_KEYS=['id','ticket_id','score','comment','created_at','updated_at'];
const METRIC_KEYS=['ticket_id','replies','reopens','reply_time_in_minutes'];
const BREACH_KEYS=['ticket_id','type','time','created_at','updated_at'];

function pgConfig(){
 const raw=String(process.env.SUPPORTCENTER_DATABASE_URL||process.env.SUPABASE_DATABASE_URL||'').trim();
 if(!raw)throw Error('SUPPORTCENTER_DATABASE_URL_MISSING');
 const u=new URL(raw);
 if(!['postgres:','postgresql:'].includes(u.protocol) ||
    !(u.hostname.includes(EXPECTED_PROJECT)||u.username.includes(EXPECTED_PROJECT)))
      throw Error('WRONG_SUPABASE_PROJECT_ABORT');
 u.searchParams.delete('sslmode');u.searchParams.delete('uselibpqcompat');
 return {connectionString:u.toString(),ssl:{rejectUnauthorized:true},
   keepAlive:true,connectionTimeoutMillis:25000,statement_timeout:90000,query_timeout:110000};
}
class Runner{
 constructor(config){this.config=config;this.client=null;this.broken=false}
 async connect(){
   if(this.client&&!this.broken)return;
   await this.close();
   const c=new Client(this.config);
   this.broken=false;
   c.on('error',e=>{this.broken=true;console.error('P31_PG_EVENT',redact(e))});
   try{await c.connect();this.client=c}
   catch(e){try{await c.end()}catch{};this.broken=true;throw e}
 }
 async close(){const c=this.client;this.client=null;if(c){try{await c.end()}catch{}}this.broken=false}
 async queryRead(sql,args,label){
   let last;
   for(let attempt=1;attempt<=3;attempt++){
     try{await this.connect();return await this.client.query(sql,args)}
     catch(e){last=e;console.error(`P31_READ_RETRY ${label} attempt=${attempt} reason=${redact(e)}`);
       this.broken=true;await this.close();if(attempt<3)await sleep(attempt*1200)}
   }
   throw Error(`READ_FAILED ${label}: ${redact(last)}`)
 }
 /** Stage ONE complete period, committed independently. The API cannot read it yet. */
 async stageOne(period,version,summary,report){
   const payload=JSON.stringify(report);
   const summaryText=JSON.stringify(summary);
   const bytes=Buffer.byteLength(payload,'utf8');
   console.log(`P31_STAGE_UPLOAD ${period} bytes=${bytes}`);
   for(let attempt=1;attempt<=3;attempt++){
     let tx=false;
     try{
       await this.connect();
       await this.client.query('BEGIN');tx=true;
       await this.client.query("SET LOCAL lock_timeout='8s'");
       const source=await this.client.query(`SELECT source_synced_at FROM public.support_mobile_published
         WHERE workspace_slug=$1 FOR SHARE NOWAIT`,[WORKSPACE]);
       if(!source.rows.length||new Date(source.rows[0].source_synced_at).toISOString()!==version)
         throw Error('SOURCE_VERSION_CHANGED_ABORT_RESTART');
       const rs=await this.client.query(`INSERT INTO public.support_mobile_period_versions
        (workspace_slug,source_synced_at,period_key,staged_at,summary,report)
        VALUES($1,$2::timestamptz,$3,now(),$4::jsonb,$5::jsonb)
        ON CONFLICT(workspace_slug,source_synced_at,period_key) DO UPDATE SET
          staged_at=EXCLUDED.staged_at,summary=EXCLUDED.summary,report=EXCLUDED.report`,
         [WORKSPACE,version,period,summaryText,payload]);
       if(rs.rowCount!==1)throw Error('STAGE_DID_NOT_UPDATE_ONE_ROW');
       await this.client.query('COMMIT');tx=false;
       console.log(`P31_STAGE_COMMITTED ${period} tickets=${report.tickets.length} ratings=${report.satisfaction.length}`);
       return;
     }catch(e){
       if(tx&&this.client&&!this.broken)try{await this.client.query('ROLLBACK')}catch{}
       this.broken=true;await this.close();
       // COMMIT acknowledgment may be lost; read the completed staging row first.
       let committed=false;
       try{const v=await this.queryRead(`SELECT source_synced_at,
         jsonb_array_length(report->'tickets') AS tickets,
         jsonb_array_length(report->'satisfaction') AS ratings
         FROM public.support_mobile_period_versions
         WHERE workspace_slug=$1 AND source_synced_at=$2 AND period_key=$3`,
         [WORKSPACE,version,period],'stage-commit-check');
         committed=Boolean(v.rows[0]&&new Date(v.rows[0].source_synced_at).toISOString()===version&&
           Number(v.rows[0].tickets)===report.tickets.length&&
           Number(v.rows[0].ratings)===report.satisfaction.length);
       }catch{}
       if(committed){console.log(`P31_STAGE_COMMITTED_CONFIRMED ${period}`);return}
       console.error(`P31_STAGE_RETRY ${period} attempt=${attempt} ${redact(e)}`);
       if(String(e.message||'').includes('SOURCE_VERSION_CHANGED'))throw e;
       if(attempt===3)throw Error(`STAGE_FAILED_${period}: ${redact(e)}`);
       await sleep(1500*attempt);
     }
   }
 }

 async verifyPublished(version){
   const q=await this.queryRead(`SELECT a.source_synced_at,a.published_at,
     v.period_key, jsonb_array_length(v.report->'tickets') AS tickets,
     jsonb_array_length(v.report->'satisfaction') AS ratings,
     (v.summary->>'totalTickets')::int AS expected_tickets,
     (v.summary->>'satisfactionTotal')::int AS expected_ratings
     FROM public.support_mobile_period_active a
     JOIN public.support_mobile_period_versions v
       ON v.workspace_slug=a.workspace_slug AND v.source_synced_at=a.source_synced_at
     WHERE a.workspace_slug=$1`,[WORKSPACE],'final-active');
   return q.rows.length===4 && PERIODS.every(period=>{
     const row=q.rows.find(x=>x.period_key===period);
     return row && new Date(row.source_synced_at).toISOString()===version&&
       Number(row.tickets)===Number(row.expected_tickets)&&
       Number(row.ratings)===Number(row.expected_ratings);
   });
 }

 /** Pointer swap is tiny even when 90-day report is 17+ MB. */
 async activate(version,summary){
   for(let attempt=1;attempt<=3;attempt++){
     let tx=false;
     try{
       await this.connect();await this.client.query('BEGIN');tx=true;
       await this.client.query("SET LOCAL lock_timeout='8s'");
       const source=await this.client.query(`SELECT source_synced_at FROM public.support_mobile_published
         WHERE workspace_slug=$1 FOR SHARE NOWAIT`,[WORKSPACE]);
       if(!source.rows.length||new Date(source.rows[0].source_synced_at).toISOString()!==version)
         throw Error('SOURCE_VERSION_CHANGED_ABORT_RESTART');
       const staged=await this.client.query(`SELECT period_key,
         jsonb_array_length(report->'tickets') AS tickets,
         jsonb_array_length(report->'satisfaction') AS ratings,
         (summary->>'totalTickets')::int AS expected_tickets,
         (summary->>'satisfactionTotal')::int AS expected_ratings
         FROM public.support_mobile_period_versions
         WHERE workspace_slug=$1 AND source_synced_at=$2::timestamptz`,[WORKSPACE,version]);
       if(staged.rows.length!==4 || !PERIODS.every(period=>{
         const r=staged.rows.find(x=>x.period_key===period), expected=obj(summary[period]);
         return r&&Number(r.tickets)===Number(r.expected_tickets)&&
           Number(r.ratings)===Number(r.expected_ratings)&&
           Number(r.tickets)===expected.totalTickets&&Number(r.ratings)===expected.satisfactionTotal;
       }))throw Error('P31_FOUR_STAGED_PERIODS_NOT_VERIFIED');
       const wrote=await this.client.query(`INSERT INTO public.support_mobile_period_active
          (workspace_slug,source_synced_at,published_at)
          VALUES($1,$2::timestamptz,now())
          ON CONFLICT(workspace_slug) DO UPDATE SET
            source_synced_at=EXCLUDED.source_synced_at,published_at=EXCLUDED.published_at`,
         [WORKSPACE,version]);
       if(wrote.rowCount!==1)throw Error('ACTIVE_POINTER_NOT_UPDATED');
       await this.client.query('COMMIT');tx=false;
       console.log(`P31_ATOMIC_ACTIVATION_COMMITTED workspace=${WORKSPACE} version=${version}`);
       return;
     }catch(e){
       if(tx&&this.client&&!this.broken)try{await this.client.query('ROLLBACK')}catch{}
       this.broken=true;await this.close();
       if(await this.verifyPublished(version).catch(()=>false)){
         console.log(`P31_ACTIVATION_CONFIRMED_AFTER_DISCONNECT ${version}`);return;
       }
       if(String(e.message||'').includes('SOURCE_VERSION_CHANGED')||
          String(e.message||'').includes('FOUR_STAGED_PERIODS_NOT_VERIFIED'))throw e;
       if(attempt===3)throw Error(`ACTIVATION_FAILED: ${redact(e)}`);
       console.error(`P31_ACTIVATION_RETRY attempt=${attempt} ${redact(e)}`);
       await sleep(1500*attempt);
     }
   }
 }

 /** Keep the current and one previous version for rollback. Cleanup is noncritical. */
 async cleanup(){
   try{
     await this.queryRead(`DELETE FROM public.support_mobile_period_versions
       WHERE workspace_slug=$1 AND source_synced_at NOT IN (
         SELECT source_synced_at FROM (
           SELECT DISTINCT source_synced_at FROM public.support_mobile_period_versions
           WHERE workspace_slug=$1 ORDER BY source_synced_at DESC LIMIT 2
         ) keep_versions
       )`,[WORKSPACE],'cleanup');
   }catch(e){console.error(`P31_CLEANUP_WARNING ${redact(e)}`)}
 }

}
function build(period,payload,summary,version,cutoffs){
 const begin=cutoffs[period],end=parseTime(version);
 if(!Number.isFinite(begin)||!Number.isFinite(end))throw Error('INVALID_SOURCE_DATE');
 const within=x=>{const d=dateOf(x);return d!==null&&d>=begin&&d<=end};
 const selectedTickets=arr(payload.tickets).filter(within).sort((a,b)=>(dateOf(b)||0)-(dateOf(a)||0));
 const ids=new Set(selectedTickets.map(t=>String(t.id)).filter(x=>/^\d+$/.test(x)));
 const tickets=selectedTickets.map(t=>pick(t,TICKET_KEYS));
 const ratings=arr(payload.satisfaction).filter(within).map(r=>pick(r,RATING_KEYS));
 const metrics=arr(payload.metrics).filter(m=>ids.has(String(m.ticket_id))).map(m=>pick(m,METRIC_KEYS));
 const breaches=arr(payload['metric-events']).filter(e=>e.type==='breach'&&ids.has(String(e.ticket_id)))
   .map(e=>pick(e,BREACH_KEYS));
 const expected=obj(summary[period]);
 if(!Number.isInteger(expected.totalTickets)||!Number.isInteger(expected.satisfactionTotal))
   throw Error(`P31_SUMMARY_MISSING_${period}`);
 if(tickets.length!==expected.totalTickets||ratings.length!==expected.satisfactionTotal)
   throw Error(`P31_COUNTS_MISMATCH_${period}_tickets_${tickets.length}_expected_${expected.totalTickets}_ratings_${ratings.length}_expected_${expected.satisfactionTotal}`);
 const report={meta:{workspace:WORKSPACE,snapshotStatus:'ready',syncStatus:'ok',syncedAt:version,lastError:null},
   tickets,fields:arr(payload.fields),forms:arr(payload.forms),agents:arr(payload.agents),
   groups:arr(payload.groups),satisfaction:ratings,metrics,slaEvents:breaches,
   slaLoaded:true,satisfactionLoaded:true,metricsLoaded:true};
 return {report,expected};
}
async function main(){
 const db=new Runner(pgConfig());
 try{
   const meta=await db.queryRead(`SELECT source_synced_at,report_timezone,summary,
     ((source_synced_at AT TIME ZONE report_timezone)::date::timestamp AT TIME ZONE report_timezone) AS cutoff_today,
     source_synced_at - interval '30 days' AS cutoff_30,
     source_synced_at - interval '60 days' AS cutoff_60,
     source_synced_at - interval '90 days' AS cutoff_90
     FROM public.support_mobile_published WHERE workspace_slug=$1`,[WORKSPACE],'source-meta');
   const row=meta.rows[0];if(!row||!row.source_synced_at||!row.summary)throw Error('P29_SOURCE_NOT_PUBLISHED');
   const version=new Date(row.source_synced_at).toISOString();
   const summary=obj(row.summary);
   const cuts={today:parseTime(row.cutoff_today),'30':parseTime(row.cutoff_30),
     '60':parseTime(row.cutoff_60),'90':parseTime(row.cutoff_90)};
   if(Object.values(cuts).some(x=>x===null))throw Error('INVALID_DATE_CUTOFF');
   console.log(`P31_TLS_PROJECT_PASS ${EXPECTED_PROJECT}`);
   console.log(`P31_SOURCE_META_PASS workspace=${WORKSPACE} version=${version}`);
   if(await db.verifyPublished(version)){
     console.log(`P31_ALL_FOUR_READY_PASS workspace=${WORKSPACE} version=${version} (already active)`);
     return;
   }
   const stagedRows=await db.queryRead(`SELECT period_key,source_synced_at,
     jsonb_array_length(report->'tickets') AS tickets,
     jsonb_array_length(report->'satisfaction') AS ratings
     FROM public.support_mobile_period_versions
     WHERE workspace_slug=$1 AND source_synced_at=$2::timestamptz`,[WORKSPACE,version],'staged-existing');
   const ready=new Set();
   for(const period of PERIODS){
     const row=stagedRows.rows.find(x=>x.period_key===period),wanted=obj(summary[period]);
     if(row&&Number(row.tickets)===wanted.totalTickets&&
       Number(row.ratings)===wanted.satisfactionTotal){
       ready.add(period);console.log(`P31_STAGED_ALREADY_READY ${period}`);
     }
   }
   const todo=PERIODS.filter(p=>!ready.has(p));
   if(todo.length){
     console.log('P31_CHUNKED_SOURCE_BEGIN');
     const payload={};
     for(const spec of SPECS){
       const key=spec.key;
       const countResult=await db.queryRead(`SELECT jsonb_array_length(coalesce(payload->$2::text,'[]'::jsonb)) AS n
         FROM public.support_mobile_published WHERE workspace_slug=$1`,[WORKSPACE,key],`count-${key}`);
       const count=Number(countResult.rows[0]?.n);
       if(!Number.isSafeInteger(count)||count<0||count>500000)throw Error(`P31_SOURCE_COUNT_INVALID_${key}`);
       const values=[];let index=0;let batch=spec.batch;
       while(index<count){
         const last=Math.min(count-1,index+batch-1);
         try{
           const q=await db.queryRead(`SELECT (p.payload->$2::text)->g.i AS item
             FROM public.support_mobile_published p
             CROSS JOIN LATERAL generate_series($3::int,$4::int) AS g(i)
             WHERE p.workspace_slug=$1 ORDER BY g.i`,[WORKSPACE,key,index,last],`page-${key}-${index}`);
           if(q.rows.length!==last-index+1||q.rows.some(x=>x.item==null))
             throw Error(`P31_SOURCE_PAGE_INCOMPLETE_${key}_${index}`);
           values.push(...q.rows.map(x=>x.item));index=last+1;
           console.log(`P31_SOURCE_PAGE ${key} ${index}/${count}`);
         }catch(e){
           if(batch>1){batch=Math.max(1,Math.floor(batch/2));console.error(`P31_PAGE_SHRINK ${key} batch=${batch}`)}
           else throw e;
         }
       }
       payload[key]=values;
       console.log(`P31_SOURCE_PART_PASS ${key} count=${values.length}`);
     }
     const after=await db.queryRead(`SELECT source_synced_at FROM public.support_mobile_published WHERE workspace_slug=$1`,[WORKSPACE],'source-version-end');
     if(!after.rows.length||new Date(after.rows[0].source_synced_at).toISOString()!==version)
       throw Error('SOURCE_VERSION_CHANGED_DURING_READ_RESTART');
     for(const period of todo){
       const {report,expected}=build(period,payload,summary,version,cuts);
       await db.stageOne(period,version,expected,report);
     }
   }
   await db.activate(version,summary);
   if(!(await db.verifyPublished(version)))throw Error('P31_ACTIVE_VERSION_VERIFICATION_FAILED');
   console.log(`P31_ALL_FOUR_READY_PASS workspace=${WORKSPACE} version=${version}`);
   await db.cleanup();
 }finally{await db.close()}
}
main().catch(e=>{console.error('P31_PUBLISH_ERROR',redact(e));process.exitCode=1});
