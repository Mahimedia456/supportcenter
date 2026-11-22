import {
  bearer,
  connectDb,
  resolveWorkspaceSlug,
  verifyAccess,
} from './_support-cache-common';

export default async function handler(
 req:any,
 res:any,
){
 if(req.method!=='GET'){
  return res.status(405).json({error:'Method not allowed'});
 }

 const token=bearer(req.headers.authorization);

 if(!token){
  return res.status(401).json({error:'Unauthorized'});
 }

 const ticketId=Number(req.query?.ticketId);

 if(!Number.isFinite(ticketId)||ticketId<=0){
  return res.status(400).json({error:'Valid ticketId required'});
 }

 let client:any;

 try{
  const payload=verifyAccess(token);
  client=await connectDb();

  const workspace=await resolveWorkspaceSlug(client,payload);

  const ticketRow=await client.query(
   `select tickets
    from public.zendesk_cache_snapshots
    where workspace_slug=$1
    limit 1`,
   [workspace],
  );

  const tickets=Array.isArray(ticketRow.rows?.[0]?.tickets)
   ?ticketRow.rows[0].tickets
   :[];

  const belongs=tickets.some(
   (ticket:any)=>Number(ticket?.id)===ticketId,
  );

  if(!belongs){
   return res.status(404).json({
    error:'Ticket not found in workspace snapshot',
   });
  }

  const result=await client.query(
   `select
      ticket_id,
      ticket_updated_at,
      comments,
      comment_count,
      synced_at
    from public.zendesk_ticket_conversation_snapshots
    where workspace_slug=$1
      and ticket_id=$2
    limit 1`,
   [workspace,ticketId],
  );

  const row=result.rows?.[0];

  if(!row){
   return res.status(200).json({
    workspace,
    ticketId,
    comments:[],
    commentCount:0,
    syncedAt:null,
    ticketUpdatedAt:null,
    snapshotStatus:'missing',
   });
  }

  return res.status(200).json({
   workspace,
   ticketId:Number(row.ticket_id),
   comments:Array.isArray(row.comments)?row.comments:[],
   commentCount:Number(row.comment_count||0),
   syncedAt:row.synced_at||null,
   ticketUpdatedAt:row.ticket_updated_at||null,
   snapshotStatus:'ready',
  });
 }
 catch(error:any){
  return res.status(500).json({
   error:error?.message||'Unable to read ticket conversation snapshot',
  });
 }
 finally{
  if(client){
   await client.end().catch(()=>undefined);
  }
 }
}
