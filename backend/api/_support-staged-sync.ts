import type {Client} from 'pg';

export type WorkspaceSlug='atomos'|'angelbird';
export type SyncStage='reference'|'satisfaction'|'metrics'|'tickets'|'metric-events'|'conversations';

function cfg(slug:WorkspaceSlug){
 const p=slug==='atomos'?'ATOMOS':'ANGELBIRD';
 return {
  subdomain:String(process.env[`${p}_ZENDESK_SUBDOMAIN`]||'').trim().replace(/^https?:\/\//i,'').replace(/\.zendesk\.com.*$/i,'').replace(/\/$/,''),
  email:String(process.env[`${p}_ZENDESK_EMAIL`]||'').trim(),
  token:String(process.env[`${p}_ZENDESK_API_TOKEN`]||'').trim(),
 };
}

export function workspaceConfigured(slug:WorkspaceSlug){
 const x=cfg(slug);
 return Boolean(x.subdomain&&x.email&&x.token);
}

async function zd(slug:WorkspaceSlug,path:string){
 const x=cfg(slug);
 if(!x.subdomain||!x.email||!x.token) throw new Error(`${slug} Zendesk environment incomplete`);

 const auth=`Basic ${Buffer.from(`${x.email}/token:${x.token}`).toString('base64')}`;

 const r=await fetch(`https://${x.subdomain}.zendesk.com${path}`,{
  headers:{Authorization:auth,Accept:'application/json'},
 });

 const body:any=await r.json().catch(()=>({}));

 if(!r.ok){
  throw new Error(
   body?.error||
   body?.description||
   body?.message||
   `Zendesk HTTP ${r.status}`,
  );
 }

 return body;
}

async function allPages(slug:WorkspaceSlug,path:string,key:string,maxPages=10){
 const rows:any[]=[];
 let next:string|null=path;

 for(let i=0;i<maxPages&&next;i++){
  const body=await zd(slug,next);
  rows.push(...(Array.isArray(body?.[key])?body[key]:[]));

  if(!body?.next_page)break;

  const u=new URL(String(body.next_page));
  next=`${u.pathname}${u.search}`;
 }

 return rows;
}

// Read only the collection needed by the current stage. Previously every
// chunk loaded the entire (potentially huge) metric-event JSON into Node.
async function existing(client:Client,workspace:WorkspaceSlug,stage:SyncStage){
 const col=stage==='metric-events'?'metric_events':'tickets';
 const q=await client.query(
  `select ${col} from public.zendesk_cache_snapshots where workspace_slug=$1 limit 1`,
  [workspace],
 );
 const rows=q.rows?.[0]?.[col];
 return {
  tickets:col==='tickets'&&Array.isArray(rows)?rows:[],
  metricEvents:col==='metric_events'&&Array.isArray(rows)?rows:[],
 };
}

function mergeById(oldRows:any[],newRows:any[]){
 const m=new Map<any,any>();

 for(const x of oldRows||[]){
  m.set(x?.id??x?.ticket_id??JSON.stringify(x),x);
 }

 for(const x of newRows||[]){
  m.set(x?.id??x?.ticket_id??JSON.stringify(x),x);
 }

 return [...m.values()];
}

async function ensureRow(client:Client,workspace:WorkspaceSlug){
 await client.query(
  `insert into public.zendesk_cache_snapshots(
    workspace_slug,tickets,forms,fields,groups,agents,satisfaction,metrics,metric_events,
    synced_at,sync_status,last_error,updated_at
   )
   values($1,'[]','[]','[]','[]','[]','[]','[]','[]',null,'syncing',null,now())
   on conflict(workspace_slug) do nothing`,
  [workspace],
 );
}

async function updateCols(
 client:Client,
 workspace:WorkspaceSlug,
 cols:Record<string,any>,
 status='syncing',
 err:string|null=null,
){
 await ensureRow(client,workspace);

 const allowed=new Set([
  'tickets','forms','fields','groups','agents',
  'satisfaction','metrics','metric_events',
 ]);

 const entries=Object.entries(cols).filter(([k])=>allowed.has(k));
 const sets=entries.map(([k],i)=>`${k}=$${i+2}::jsonb`);
 const vals=[workspace,...entries.map(([,v])=>JSON.stringify(v))];
 const n=vals.length;

 await client.query(
  `update public.zendesk_cache_snapshots
   set ${sets.join(',')}${sets.length?',':''}
       sync_status=$${n+1},
       last_error=$${n+2},
       synced_at=case when $${n+1}='ok' then now() else synced_at end,
       updated_at=now()
   where workspace_slug=$1`,
  [...vals,status,err],
 );
}

function cutoff90(rows:any[],field='created_at'){
 const cutoff=Date.now()-90*24*60*60*1000;

 return rows.filter(x=>{
  const raw=x?.[field]||x?.updated_at||x?.created_at;
  return !raw||new Date(raw).getTime()>=cutoff;
 });
}

async function chunk(slug:WorkspaceSlug,path:string,key:string,maxPages=2){
 const rows:any[]=[];
 let next:string|null=path;

 for(let i=0;i<maxPages&&next;i++){
  const body=await zd(slug,next);
  rows.push(...(Array.isArray(body?.[key])?body[key]:[]));

  if(body?.end_of_stream||!body?.next_page){
   next=null;
   break;
  }

  const u=new URL(String(body.next_page));
  next=`${u.pathname}${u.search}`;
 }

 return {rows,next};
}

function timeOf(value:any){
 const ms=new Date(value||0).getTime();
 return Number.isFinite(ms)?ms:0;
}

async function syncConversationBatch(
 client:Client,
 workspace:WorkspaceSlug,
 tickets:any[],
){
 // Keep scheduled refresh bounded. Other tickets load comments on demand.
 const usable=tickets
  .filter(ticket=>Number.isFinite(Number(ticket?.id)))
  .sort((a,b)=>timeOf(b?.updated_at||b?.created_at)-timeOf(a?.updated_at||a?.created_at))
  .slice(0,80);

 if(!usable.length){
  return {done:true,count:0,remaining:0};
 }

 const cached=await client.query(
  `select ticket_id,ticket_updated_at
   from public.zendesk_ticket_conversation_snapshots
   where workspace_slug=$1`,
  [workspace],
 );

 const cacheMap=new Map<number,number>();

 for(const row of cached.rows||[]){
  cacheMap.set(
   Number(row.ticket_id),
   timeOf(row.ticket_updated_at),
  );
 }

 const stale=usable.filter(ticket=>{
  const id=Number(ticket.id);
  const ticketUpdated=timeOf(ticket.updated_at||ticket.created_at);
  const cachedUpdated=cacheMap.get(id)||0;

  return !cachedUpdated||cachedUpdated<ticketUpdated;
 });

 const BATCH_SIZE=8;
 const batch=stale.slice(0,BATCH_SIZE);

 for(const ticket of batch){
  const ticketId=Number(ticket.id);

  const comments=await allPages(
   workspace,
   `/api/v2/tickets/${ticketId}/comments.json?per_page=100`,
   'comments',
   20,
  );

  await client.query(
   `insert into public.zendesk_ticket_conversation_snapshots(
      workspace_slug,
      ticket_id,
      ticket_updated_at,
      comments,
      comment_count,
      synced_at,
      updated_at
    )
    values($1,$2,$3,$4::jsonb,$5,now(),now())
    on conflict(workspace_slug,ticket_id)
    do update set
      ticket_updated_at=excluded.ticket_updated_at,
      comments=excluded.comments,
      comment_count=excluded.comment_count,
      synced_at=now(),
      updated_at=now()`,
   [
    workspace,
    ticketId,
    ticket.updated_at||ticket.created_at||null,
    JSON.stringify(comments),
    comments.length,
   ],
  );
 }

 const remaining=Math.max(0,stale.length-batch.length);

 return {
  done:remaining===0,
  count:batch.length,
  remaining,
  next:remaining>0?'more':null,
 };
}

export async function runStage(
 client:Client,
 workspace:WorkspaceSlug,
 stage:SyncStage,
 cursor?:string|null,
){
 if(!workspaceConfigured(workspace)){
  throw new Error(`${workspace} Zendesk configuration is incomplete; sync NOT performed`);
 }

 if(stage==='reference'){
  const [forms,fields,groups,agents]=await Promise.all([
   allPages(workspace,'/api/v2/ticket_forms.json?active=true&per_page=100','ticket_forms',3),
   allPages(workspace,'/api/v2/ticket_fields.json?per_page=100','ticket_fields',3),
   allPages(workspace,'/api/v2/groups.json?per_page=100','groups',3),
   allPages(workspace,'/api/v2/users.json?role[]=agent&role[]=admin&per_page=100','users',5),
  ]);

  await updateCols(client,workspace,{forms,fields,groups,agents},'syncing');

  return {
   workspace,
   stage,
   done:true,
   counts:{
    forms:forms.length,
    fields:fields.length,
    groups:groups.length,
    agents:agents.length,
   },
  };
 }

 if(stage==='satisfaction'){
  const startMs=Date.now()-90*24*60*60*1000;
  const rows:any[]=[];
  let next:string|null='/api/v2/satisfaction_ratings.json?sort_by=created_at&sort_order=desc&per_page=100';

  for(let page=0;page<20&&next;page++){
   const body=await zd(workspace,next);
   const current=Array.isArray(body?.satisfaction_ratings)?body.satisfaction_ratings:[];
   let reachedCutoff=false;

   for(const rating of current){
    const created=new Date(rating?.created_at||rating?.updated_at||0).getTime();

    if(Number.isFinite(created)&&created<startMs){
     reachedCutoff=true;
     continue;
    }

    rows.push(rating);
   }

   if(reachedCutoff||!body?.next_page){
    next=null;
    break;
   }

   const url=new URL(String(body.next_page));
   next=`${url.pathname}${url.search}`;
  }

  await updateCols(client,workspace,{satisfaction:rows},'syncing');

  return {workspace,stage,done:true,count:rows.length};
 }

 if(stage==='metrics'){
  const rows=await allPages(
   workspace,
   '/api/v2/ticket_metrics.json?per_page=100',
   'ticket_metrics',
   40,
  );

  await updateCols(client,workspace,{metrics:rows},'syncing');

  return {workspace,stage,done:true,count:rows.length};
 }

 const state=await existing(client,workspace,stage);

 if(stage==='conversations'){
  const tickets=cutoff90(state.tickets);
  const result=await syncConversationBatch(client,workspace,tickets);

  return {
   workspace,
   stage,
   ...result,
  };
 }

 if(stage==='tickets'){
  const start=Math.floor((Date.now()-90*24*60*60*1000)/1000);
  const first=`/api/v2/incremental/tickets.json?start_time=${start}`;
  const c=await chunk(workspace,cursor||first,'tickets',4);
  const merged=cutoff90(mergeById(state.tickets,c.rows));

  await updateCols(
   client,
   workspace,
   {tickets:merged},
   'syncing',
  );

  return {
   workspace,
   stage,
   done:!c.next,
   count:merged.length,
   next:c.next,
  };
 }

 const start=Math.floor((Date.now()-90*24*60*60*1000)/1000);
 const first=`/api/v2/incremental/ticket_metric_events.json?start_time=${start}`;
 const c=await chunk(workspace,cursor||first,'ticket_metric_events',4);
 const merged=cutoff90(mergeById(state.metricEvents,c.rows),'time');

 await updateCols(
  client,
  workspace,
  {metric_events:merged},
  c.next?'syncing':'ok',
 );

 return {
  workspace,
  stage,
  done:!c.next,
  count:merged.length,
  next:c.next,
 };
}

// Only used by the scheduled sync endpoint. Keep failures visible in the database.
export async function markStageFailure(
 client:Client,workspace:WorkspaceSlug,stage:SyncStage,error:unknown,
){
 await ensureRow(client,workspace);
 const detail=error instanceof Error?error.message:String(error);
 await client.query(
  `update public.zendesk_cache_snapshots
   set sync_status='error',last_error=$2,updated_at=now()
   where workspace_slug=$1`,
  [workspace,`${stage}: ${detail}`.slice(0,500)],
 );
}
