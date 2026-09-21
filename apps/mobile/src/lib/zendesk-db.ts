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
let readInflight:Promise<ZendeskDbSnapshot>|null=null;
let syncInflight:Promise<ZendeskDbSnapshot>|null=null;

const conversationMemory=new Map<number,{at:number,value:ZendeskConversationSnapshot}>();
const conversationInflight=new Map<number,Promise<ZendeskConversationSnapshot>>();

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
 const r=await fetch(`${BASE_URL}${path}`,{
  method,
  headers:{
   Authorization:`Bearer ${token}`,
   'Content-Type':'application/json',
  },
 });

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

export function peekZendeskDbSnapshot(){
 return memorySnapshot;
}

export function clearZendeskDbSnapshotCache(){
 memorySnapshot=null;
 memoryAt=0;
 readInflight=null;
 syncInflight=null;
 conversationMemory.clear();
 conversationInflight.clear();
}

export async function getZendeskDbSnapshot(
 token:string,
 options?:{force?:boolean},
){
 const force=Boolean(options?.force);

 if(
  !force&&
  memorySnapshot&&
  Date.now()-memoryAt<MEMORY_TTL_MS
 ){
  return memorySnapshot;
 }

 if(!force&&readInflight){
  return readInflight;
 }

 readInflight=req('/api/zendesk-cache-snapshot',token)
  .then(normalize)
  .then(x=>{
   memorySnapshot=x;
   memoryAt=Date.now();
   return x;
  })
  .catch(e=>{
   if(memorySnapshot)return memorySnapshot;
   throw e;
  })
  .finally(()=>{
   readInflight=null;
  });

 return readInflight;
}

export async function getZendeskTicketConversationSnapshot(
 token:string,
 ticketId:number,
 options?:{force?:boolean},
){
 const force=Boolean(options?.force);
 const cached=conversationMemory.get(ticketId);

 if(
  !force&&
  cached&&
  Date.now()-cached.at<CONVERSATION_TTL_MS
 ){
  return cached.value;
 }

 const existing=conversationInflight.get(ticketId);

 if(!force&&existing){
  return existing;
 }

 const promise=req(
  `/api/zendesk-ticket-conversation?ticketId=${encodeURIComponent(String(ticketId))}`,
  token,
 )
  .then(normalizeConversation)
  .then(value=>{
   conversationMemory.set(ticketId,{
    at:Date.now(),
    value,
   });

   return value;
  })
  .finally(()=>{
   conversationInflight.delete(ticketId);
  });

 conversationInflight.set(ticketId,promise);

 return promise;
}

async function stage(
 token:string,
 stageName:string,
 cursor?:string,
){
 const qs=new URLSearchParams({stage:stageName});

 if(cursor){
  qs.set('cursor',cursor);
 }

 return req(
  `/api/zendesk-cache-sync?${qs.toString()}`,
  token,
  'POST',
 );
}

export async function syncZendeskDb(token:string){
 if(syncInflight){
  return syncInflight;
 }

 syncInflight=(async()=>{
  await stage(token,'reference');
  await stage(token,'satisfaction');
  await stage(token,'metrics');

  for(const stageName of ['tickets','metric-events']){
   let cursor='';

   for(let i=0;i<50;i++){
    const result:any=await stage(
     token,
     stageName,
     cursor||undefined,
    );

    if(result?.done||!result?.next){
     break;
    }

    cursor=String(result.next);

    await new Promise(resolve=>setTimeout(resolve,700));
   }
  }

  // Conversation cache runs only after ticket snapshot is current.
  // Each backend invocation syncs a small batch of stale/missing tickets.
  for(let i=0;i<100;i++){
   const result:any=await stage(token,'conversations');

   if(result?.done){
    break;
   }

   await new Promise(resolve=>setTimeout(resolve,500));
  }

  conversationMemory.clear();

  const finalSnapshot=await getZendeskDbSnapshot(
   token,
   {force:true},
  );

  memorySnapshot=finalSnapshot;
  memoryAt=Date.now();

  return finalSnapshot;
 })().finally(()=>{
  syncInflight=null;
 });

 return syncInflight;
}
