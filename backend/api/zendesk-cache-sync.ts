import {bearer,connectDb,resolveWorkspaceSlug,verifyAccess} from './_support-cache-common';

// Mobile/manual refresh must never start a second Zendesk sync pass.
// It only reports the currently stored snapshot state. The hourly GitHub job
// is the sole bulk-sync owner.
export default async function handler(req:any,res:any){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 // Avoid a 15-minute bulk Zendesk import from a mobile client.
 // Scheduled GitHub sync uses the independently authorized hourly endpoint.
 if(process.env.ALLOW_USER_INITIATED_ZENDESK_SYNC!=='true')
  return res.status(403).json({error:'Manual Zendesk imports are disabled. Refresh the saved server snapshot instead.'});
 const token=bearer(req.headers.authorization);if(!token)return res.status(401).json({error:'Unauthorized'});
 let client:any;
 try{
  const payload=verifyAccess(token);client=await connectDb();const workspace=await resolveWorkspaceSlug(client,payload);
  const result=await client.query(`select synced_at,sync_status,last_error from public.zendesk_cache_snapshots where workspace_slug=$1 limit 1`,[workspace]);
  const row=result.rows?.[0]||{};
  return res.status(200).json({ok:true,workspace,scheduledOnly:true,message:'Bulk sync is controlled by the single hourly pass.',syncedAt:row.synced_at||null,syncStatus:row.sync_status||'never',lastError:row.last_error||null});
 }catch(error:any){return res.status(500).json({error:error?.message||'Unable to read support snapshot state'});}
 finally{if(client)await client.end().catch(()=>undefined);}
}
