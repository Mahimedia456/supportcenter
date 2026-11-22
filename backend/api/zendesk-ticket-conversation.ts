import {bearer,connectDb,resolveWorkspaceSlug,verifyAccess,zendesk} from './_support-cache-common';

async function allComments(workspace:any,ticketId:number){
 const rows:any[]=[];let next:string|null=`/api/v2/tickets/${ticketId}/comments.json?per_page=100`;
 for(let i=0;i<20&&next;i++){
  const body=await zendesk(workspace,next);rows.push(...(Array.isArray(body?.comments)?body.comments:[]));
  if(!body?.next_page)break;const u=new URL(String(body.next_page));next=`${u.pathname}${u.search}`;
 }
 return rows;
}

export default async function handler(req:any,res:any){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const token=bearer(req.headers.authorization);if(!token)return res.status(401).json({error:'Unauthorized'});
 const ticketId=Number(req.query?.ticketId);if(!Number.isFinite(ticketId)||ticketId<=0)return res.status(400).json({error:'Valid ticketId required'});
 let client:any;
 try{
  const payload=verifyAccess(token);client=await connectDb();const workspace=await resolveWorkspaceSlug(client,payload);
  const snap=await client.query(`select tickets from public.zendesk_cache_snapshots where workspace_slug=$1 limit 1`,[workspace]);
  const tickets=Array.isArray(snap.rows?.[0]?.tickets)?snap.rows[0].tickets:[];
  const ticket=tickets.find((item:any)=>Number(item?.id)===ticketId);
  if(!ticket)return res.status(404).json({error:'Ticket not found in workspace snapshot'});

  const existing=await client.query(`select ticket_updated_at,comments,comment_count,synced_at from public.zendesk_ticket_conversation_snapshots where workspace_slug=$1 and ticket_id=$2 limit 1`,[workspace,ticketId]);
  const row=existing.rows?.[0];
  const ticketUpdated=new Date(ticket.updated_at||ticket.created_at||0).getTime();
  const cachedUpdated=new Date(row?.ticket_updated_at||0).getTime();
  if(row&&cachedUpdated>=ticketUpdated){
   return res.status(200).json({workspace,ticketId,comments:Array.isArray(row.comments)?row.comments:[],commentCount:Number(row.comment_count||0),syncedAt:row.synced_at||null,ticketUpdatedAt:row.ticket_updated_at||null,snapshotStatus:'ready'});
  }

  const comments=await allComments(workspace,ticketId);
  await client.query(`insert into public.zendesk_ticket_conversation_snapshots(workspace_slug,ticket_id,ticket_updated_at,comments,comment_count,synced_at,updated_at) values($1,$2,$3,$4::jsonb,$5,now(),now()) on conflict(workspace_slug,ticket_id) do update set ticket_updated_at=excluded.ticket_updated_at,comments=excluded.comments,comment_count=excluded.comment_count,synced_at=now(),updated_at=now()`,[workspace,ticketId,ticket.updated_at||ticket.created_at||null,JSON.stringify(comments),comments.length]);
  // Hard cap: only the 40 most recently used conversation caches per workspace.
  await client.query(`delete from public.zendesk_ticket_conversation_snapshots where workspace_slug=$1 and ticket_id in (select ticket_id from public.zendesk_ticket_conversation_snapshots where workspace_slug=$1 order by synced_at desc offset 40)`,[workspace]);
  return res.status(200).json({workspace,ticketId,comments,commentCount:comments.length,syncedAt:new Date().toISOString(),ticketUpdatedAt:ticket.updated_at||ticket.created_at||null,snapshotStatus:'ready'});
 }catch(error:any){return res.status(500).json({error:error?.message||'Unable to load ticket conversation'});}
 finally{if(client)await client.end().catch(()=>undefined);}
}
