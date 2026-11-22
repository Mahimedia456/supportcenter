import {
  bearer,
  connectDb,
  resolveWorkspaceSlug,
  verifyAccess,
} from './_support-cache-common';

// Chunked authenticated response avoids Vercel's single-response payload limit.
// Column names are server-controlled, never interpolated from untrusted input.
const parts:Record<string,string>={
  tickets:'tickets',
  forms:'forms',
  fields:'fields',
  groups:'groups',
  agents:'agents',
  satisfaction:'satisfaction',
  metrics:'metrics',
  'metric-events':'metric_events',
};

export default async function handler(req:any,res:any){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 const token=bearer(req.headers.authorization);
 if(!token)return res.status(401).json({error:'Unauthorized'});

 let client;
 try{
  const payload=verifyAccess(token);
  client=await connectDb();
  const workspace=await resolveWorkspaceSlug(client,payload);
  const part=String(req.query?.part||'');

  if(part==='meta'){
   const r=await client.query(
    `select synced_at,sync_status,last_error
     from public.zendesk_cache_snapshots where workspace_slug=$1 limit 1`,
    [workspace],
   );
   const row=r.rows[0];
   return res.status(200).json({
    workspace,scopeDays:90,
    syncedAt:row?.synced_at||null,
    syncStatus:row?.sync_status||'never',
    lastError:row?.last_error||null,
    snapshotStatus:row?.synced_at?'ready':'missing',
   });
  }

  if(part){
   const col=parts[part];
   if(!col)return res.status(400).json({error:'Invalid snapshot part'});
   const offsetValue=Number(req.query?.offset??0);
   const limitValue=Number(req.query?.limit??100);
   if(!Number.isSafeInteger(offsetValue)||offsetValue<0||offsetValue>1000000||
      !Number.isSafeInteger(limitValue)||limitValue<1||limitValue>150){
    return res.status(400).json({error:'Invalid pagination'});
   }
   // The UI only uses SLA breach metric events. Preserve ALL raw events in DB.
   // Filtering in SQL avoids returning the unbounded event stream to phones.
   const onlyBreaches=part==='metric-events' ? "and item->>'type'='breach'" : '';
   const r=await client.query(
    `select item from public.zendesk_cache_snapshots s,
      lateral jsonb_array_elements(s.${col}) with ordinality as x(item,ordinal)
     where s.workspace_slug=$1 ${onlyBreaches}
     order by ordinal limit $2 offset $3`,
    [workspace,limitValue+1,offsetValue],
   );
   const done=r.rows.length<=limitValue;
   return res.status(200).json({
    workspace,part,items:r.rows.slice(0,limitValue).map((x:any)=>x.item),
    done,nextOffset:done?null:offsetValue+limitValue,
   });
  }

  // Legacy endpoint preserved for previously installed apps, although old
  // clients should upgrade to the paginated endpoint for larger snapshots.
  const r=await client.query(
   `select workspace_slug,tickets,forms,fields,groups,agents,satisfaction,
     metrics,metric_events,synced_at,sync_status,last_error
    from public.zendesk_cache_snapshots where workspace_slug=$1 limit 1`,
   [workspace],
  );
  const row=r.rows[0];
  return res.status(200).json(row?{
   workspace:row.workspace_slug,scopeDays:90,
   tickets:row.tickets||[],forms:row.forms||[],fields:row.fields||[],
   groups:row.groups||[],agents:row.agents||[],satisfaction:row.satisfaction||[],
   metrics:row.metrics||[],metricEvents:row.metric_events||[],
   syncedAt:row.synced_at||null,syncStatus:row.sync_status||'unknown',
   lastError:row.last_error||null,snapshotStatus:row.synced_at?'ready':'missing',
  }:{
   workspace,scopeDays:90,tickets:[],forms:[],fields:[],groups:[],agents:[],
   satisfaction:[],metrics:[],metricEvents:[],syncedAt:null,
   syncStatus:'never',lastError:null,snapshotStatus:'missing',
  });
 }catch(error:any){
  return res.status(500).json({error:error?.message||'Unable to read support snapshot'});
 }finally{
  if(client)await client.end().catch(()=>undefined);
 }
}
