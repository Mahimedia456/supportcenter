import {Client} from 'pg';
import {connectDb,list,last90DayTickets,zendesk,type WorkspaceSlug} from './_support-cache-common';

const WORKSPACES:WorkspaceSlug[]=['atomos','angelbird'];
const LOCK_KEY=74251008;
const DAY=24*60*60*1000;

async function allPages(workspace:WorkspaceSlug,path:string,key:string,maxPages=40){
 const rows:any[]=[];
 let next:string|null=path;
 for(let page=0;page<maxPages&&next;page+=1){
  const body=await zendesk(workspace,next);
  rows.push(...(Array.isArray(body?.[key])?body[key]:[]));
  if(body?.end_of_stream||!body?.next_page){next=null;break;}
  const url=new URL(String(body.next_page));
  next=`${url.pathname}${url.search}`;
 }
 return rows;
}

function cutoffRows(rows:any[],days:number,dateKeys:string[]){
 const cutoff=Date.now()-days*DAY;
 return rows.filter(row=>{
  const raw=dateKeys.map(k=>row?.[k]).find(Boolean);
  if(!raw)return true;
  const ms=new Date(raw).getTime();
  return !Number.isFinite(ms)||ms>=cutoff;
 });
}

async function satisfaction90(workspace:WorkspaceSlug){
 const rows=await allPages(workspace,'/api/v2/satisfaction_ratings.json?sort_by=created_at&sort_order=desc&per_page=100','satisfaction_ratings',20);
 return cutoffRows(rows,90,['created_at','updated_at']);
}

async function breachEvents90(workspace:WorkspaceSlug,ticketIds:Set<number>){
 const start=Math.floor((Date.now()-90*DAY)/1000);
 const rows=await allPages(workspace,`/api/v2/incremental/ticket_metric_events.json?start_time=${start}`,'ticket_metric_events',60);
 return rows.filter((event:any)=>event?.type==='breach'&&ticketIds.has(Number(event?.ticket_id)));
}

function embeddedMetrics(tickets:any[]){
 return tickets.map(ticket=>{
  const metric=ticket?.metric_set||ticket?.metric_sets;
  if(!metric||typeof metric!=='object')return null;
  return {...metric,ticket_id:Number(metric.ticket_id||ticket.id)};
 }).filter(Boolean);
}

async function collect(workspace:WorkspaceSlug){
 const [tickets,forms,fields,groups,agents,satisfaction]=await Promise.all([
  last90DayTickets(workspace),
  list(workspace,'/api/v2/ticket_forms.json?active=true&per_page=100','ticket_forms'),
  list(workspace,'/api/v2/ticket_fields.json?per_page=100','ticket_fields'),
  list(workspace,'/api/v2/groups.json?per_page=100','groups'),
  list(workspace,'/api/v2/users.json?role[]=agent&role[]=admin&per_page=100','users'),
  satisfaction90(workspace),
 ]);
 const ticketIds=new Set(tickets.map((ticket:any)=>Number(ticket?.id)).filter(Number.isFinite));
 const metricEvents=await breachEvents90(workspace,ticketIds);
 const metrics=embeddedMetrics(tickets);
 const errors=[forms.error,fields.error,groups.error,agents.error].filter(Boolean);
 return {
  workspace,tickets,forms:forms.rows,fields:fields.rows,groups:groups.rows,agents:agents.rows,
  satisfaction,metrics,metricEvents,
  status:errors.length?'partial':'ok',
  error:errors.length?errors.join(' | ').slice(0,2000):null,
 };
}

async function save(client:Client,data:Awaited<ReturnType<typeof collect>>){
 const now=new Date().toISOString();
 await client.query(
  `insert into public.zendesk_cache_snapshots(
    workspace_slug,tickets,forms,fields,groups,agents,satisfaction,metrics,metric_events,
    synced_at,sync_status,last_error,updated_at
   ) values($1,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,now())
   on conflict(workspace_slug) do update set
    tickets=excluded.tickets,forms=excluded.forms,fields=excluded.fields,groups=excluded.groups,
    agents=excluded.agents,satisfaction=excluded.satisfaction,metrics=excluded.metrics,
    metric_events=excluded.metric_events,synced_at=excluded.synced_at,sync_status=excluded.sync_status,
    last_error=excluded.last_error,updated_at=now()`,
  [data.workspace,JSON.stringify(data.tickets),JSON.stringify(data.forms),JSON.stringify(data.fields),
   JSON.stringify(data.groups),JSON.stringify(data.agents),JSON.stringify(data.satisfaction),
   JSON.stringify(data.metrics),JSON.stringify(data.metricEvents),now,data.status,data.error],
 );
 return {workspace:data.workspace,tickets:data.tickets.length,forms:data.forms.length,fields:data.fields.length,agents:data.agents.length,satisfaction:data.satisfaction.length,metrics:data.metrics.length,breaches:data.metricEvents.length,status:data.status};
}

export default async function handler(req:any,res:any){
 if(req.method!=='GET'&&req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
 const expected=String(process.env.CRON_SECRET||'').trim();
 if(!expected)return res.status(500).json({ok:false,error:'CRON_SECRET missing'});
 if(String(req.headers.authorization||'').trim()!==`Bearer ${expected}`)return res.status(401).json({ok:false,error:'Unauthorized'});
 let client:Client|null=null;
 let locked=false;
 try{
  client=await connectDb();
  const lock=await client.query('select pg_try_advisory_lock($1) as locked',[LOCK_KEY]);
  locked=Boolean(lock.rows?.[0]?.locked);
  if(!locked)return res.status(202).json({ok:true,skipped:true,reason:'A snapshot sync pass is already running'});

  const results=[];
  for(const workspace of WORKSPACES){
   try{results.push(await save(client,await collect(workspace)));}
   catch(error:any){results.push({workspace,ok:false,error:error?.message||'Workspace sync failed'});}
  }
  return res.status(200).json({ok:true,mode:'single-pass',storedSnapshotRows:2,conversationBulkSync:false,timestamp:new Date().toISOString(),results});
 }catch(error:any){
  return res.status(500).json({ok:false,error:error?.message||'Single-pass Zendesk sync failed'});
 }finally{
  if(client){if(locked)await client.query('select pg_advisory_unlock($1)',[LOCK_KEY]).catch(()=>undefined);await client.end().catch(()=>undefined);}
 }
}
