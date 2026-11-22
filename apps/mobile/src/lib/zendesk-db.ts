import type {
  ZendeskComment,
  ZendeskForm,
  ZendeskGroup,
  ZendeskMetricEvent,
  ZendeskSatisfactionRating,
  ZendeskTicket,
  ZendeskTicketField,
  ZendeskTicketMetric,
  ZendeskUser,
} from '@/lib/api';

export type ZendeskDbSnapshot = {
  workspace: string;
  scopeDays: number;
  tickets: ZendeskTicket[];
  forms: ZendeskForm[];
  fields: ZendeskTicketField[];
  groups: ZendeskGroup[];
  agents: ZendeskUser[];
  satisfaction: ZendeskSatisfactionRating[];
  metrics: ZendeskTicketMetric[];
  metricEvents: ZendeskMetricEvent[];
  syncedAt: string | null;
  syncStatus: string;
  lastError?: string | null;
};

export type ZendeskConversationSnapshot = {
  workspace: string;
  ticketId: number;
  comments: ZendeskComment[];
  commentCount: number;
  syncedAt: string | null;
  ticketUpdatedAt: string | null;
  snapshotStatus: 'ready' | 'missing';
};

const BASE_URL=(process.env.EXPO_PUBLIC_API_BASE_URL||'https://supportcenter-kappa.vercel.app').replace(/\/$/,'');

let memorySnapshot:ZendeskDbSnapshot|null=null;
let memoryAt=0;
let memoryToken:string|null=null;
let readInflight:Promise<ZendeskDbSnapshot>|null=null;
let readInflightToken:string|null=null;

const conversationMemory=new Map<string,{at:number,value:ZendeskConversationSnapshot}>();
const conversationInflight=new Map<string,Promise<ZendeskConversationSnapshot>>();

const MEMORY_TTL_MS=5*60*1000;
const CONVERSATION_TTL_MS=5*60*1000;

function normalize(value:any):ZendeskDbSnapshot{
 return {
  workspace:String(value?.workspace||''),
  scopeDays:Number(value?.scopeDays||value?.scope_days||90),
  tickets:Array.isArray(value?.tickets)?value.tickets:[],
  forms:Array.isArray(value?.forms)?value.forms:[],
  fields:Array.isArray(value?.fields)?value.fields:[],
  groups:Array.isArray(value?.groups)?value.groups:[],
  agents:Array.isArray(value?.agents)?value.agents:[],
  satisfaction:Array.isArray(value?.satisfaction)?value.satisfaction:[],
  metrics:Array.isArray(value?.metrics)?value.metrics:[],
  metricEvents:Array.isArray(value?.metricEvents)
   ?value.metricEvents
   :(Array.isArray(value?.metric_events)?value.metric_events:[]),
  syncedAt:value?.syncedAt??value?.synced_at??null,
  syncStatus:String(value?.syncStatus||value?.sync_status||'ready'),
  lastError:value?.lastError??value?.last_error??null,
 };
}

function normalizeConversation(value:any):ZendeskConversationSnapshot{
 return {
  workspace:String(value?.workspace||''),
  ticketId:Number(value?.ticketId||value?.ticket_id||0),
  comments:Array.isArray(value?.comments)?value.comments:[],
  commentCount:Number(
   value?.commentCount??
   value?.comment_count??
   (Array.isArray(value?.comments)?value.comments.length:0)
  ),
  syncedAt:value?.syncedAt??value?.synced_at??null,
  ticketUpdatedAt:value?.ticketUpdatedAt??value?.ticket_updated_at??null,
  snapshotStatus:value?.snapshotStatus==='ready'?'ready':'missing',
 };
}

async function req(path:string,token:string,method='GET'){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),45000);
 let r:Response;
 try{
  r=await fetch(`${BASE_URL}${path}`,{
   method,signal:controller.signal,
   headers:{
    Authorization:`Bearer ${token}`,
    'Content-Type':'application/json',
    'Cache-Control':'no-cache',
   },
  });
 }finally{clearTimeout(timer)}

 const b:any=await r.json().catch(()=>({}));

 if(!r.ok){
  throw new Error(
   b?.message||
   b?.error||
   `Request failed (${r.status})`,
  );
 }

 return b;
}

// Fetch each snapshot collection in bounded pages. The server retains full
// metric-event history but returns only the breach events needed by the UI.
const SNAPSHOT_PARTS=[
 'tickets','forms','fields','groups','agents','satisfaction','metrics','metric-events',
] as const;

async function fetchPagedSnapshot(token:string):Promise<ZendeskDbSnapshot>{
 const meta:any=await req('/api/zendesk-cache-snapshot?part=meta',token);
 const workspace=String(meta?.workspace||'');
 if(!['atomos','angelbird'].includes(workspace))
  throw new Error('Invalid workspace in snapshot metadata');

 const data:Record<string,any[]>={};
 if(!meta?.syncedAt){
  for(const part of SNAPSHOT_PARTS)data[part]=[];
 }else{
  for(const part of SNAPSHOT_PARTS){
   const items:any[]=[];
   let offset=0;
   let done=false;
   for(let i=0;i<250;i++){
    const body:any=await req(
     `/api/zendesk-cache-snapshot?part=${encodeURIComponent(part)}&offset=${offset}&limit=100`,
     token,
    );
    if(body?.workspace!==workspace||body?.part!==part||!Array.isArray(body?.items))
     throw new Error(`Invalid ${part} page returned by the backend`);
    items.push(...body.items);
    if(body.done===true){done=true;break;}
    const next=Number(body.nextOffset);
    if(!Number.isSafeInteger(next)||next<=offset)
     throw new Error(`Pagination stalled for ${part}`);
    offset=next;
   }
   if(!done)throw new Error(`Snapshot ${part} exceeded pagination limit`);
   data[part]=items;
  }
 }
 return normalize({
  ...meta,...data,metricEvents:data['metric-events'],
 });
}

export function peekZendeskDbSnapshot(){
 return memorySnapshot;
}

export function clearZendeskDbSnapshotCache(){
 memorySnapshot=null;
 memoryAt=0;
 memoryToken=null;
 readInflight=null;
 readInflightToken=null;
 conversationMemory.clear();
 conversationInflight.clear();
}

export async function getZendeskDbSnapshot(
 token:string,
 options?:{force?:boolean;expectedWorkspace?:string},
){
 const force=Boolean(options?.force);
 if(memoryToken!==token){
  memorySnapshot=null;
  memoryAt=0;
  memoryToken=token;
  conversationMemory.clear();
  conversationInflight.clear();
 }

 if(
  !force&&
  memorySnapshot&&
  Date.now()-memoryAt<MEMORY_TTL_MS
 ){
  return memorySnapshot;
 }

 if(!force&&readInflight&&readInflightToken===token){
  return readInflight;
 }

 const expected=options?.expectedWorkspace;
 readInflightToken=token;
 const promise=fetchPagedSnapshot(token)
  .then(x=>{
   if(!['atomos','angelbird'].includes(x.workspace))
    throw new Error('Invalid snapshot workspace returned by backend');
   if(expected&&x.workspace!==expected)
    throw new Error(`Snapshot workspace mismatch: expected ${expected}`);
   if(memoryToken===token){memorySnapshot=x;memoryAt=Date.now();}
   return x;
  })
  .catch(e=>{
   // Background reads may use the same user's cached snapshot.
   // Forced refresh must never report stale data as a successful API read.
   if(!force&&memoryToken===token&&memorySnapshot)return memorySnapshot;
   throw e;
  })
  .finally(()=>{
   if(readInflight===promise){readInflight=null;readInflightToken=null;}
  });
 readInflight=promise;
 return promise;
}

export async function getZendeskTicketConversationSnapshot(
 token:string,
 ticketId:number,
 options?:{force?:boolean;expectedWorkspace?:string},
){
 const force=Boolean(options?.force);
 if(memoryToken!==token){
  memorySnapshot=null;
  memoryAt=0;
  memoryToken=token;
  conversationMemory.clear();
  conversationInflight.clear();
 }
 const cacheKey=`${token}:${ticketId}`;
 const cached=conversationMemory.get(cacheKey);

 if(
  !force&&
  cached&&
  Date.now()-cached.at<CONVERSATION_TTL_MS
 ){
  return cached.value;
 }

 const existing=conversationInflight.get(cacheKey);

 if(!force&&existing){
  return existing;
 }

 const promise=req(
  `/api/zendesk-ticket-conversation?ticketId=${encodeURIComponent(String(ticketId))}`,
  token,
 )
  .then(normalizeConversation)
  .then(value=>{
   conversationMemory.set(cacheKey,{
    at:Date.now(),
    value,
   });

   return value;
  })
  .finally(()=>{
   conversationInflight.delete(cacheKey);
  });

 conversationInflight.set(cacheKey,promise);

 return promise;
}

// Zendesk ingestion is intentionally scheduled server-side only.
// The phone reads the completed paged snapshot via getZendeskDbSnapshot().
