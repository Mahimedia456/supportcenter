import {connectDb} from './_support-cache-common';
import {publishMobileSnapshot} from './_mobile-published';
import {markStageFailure,runStage,type SyncStage,type WorkspaceSlug} from './_support-staged-sync';

// Bounded, authenticated Zendesk stages. Designed for GitHub Actions orchestration.
// Each stage saves its own progress in the server-side PostgreSQL snapshot table.
type ExtendedSyncStage=SyncStage|'publish'|'status';
const STAGES = new Set<ExtendedSyncStage>([
 'reference','satisfaction','metrics','tickets','metric-events','conversations','publish','status',
]);
const WORKSPACES = new Set<WorkspaceSlug>(['atomos','angelbird']);
const LOCKS:Record<WorkspaceSlug,number> = {atomos:74251008,angelbird:74251009};

export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'&&req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
 const secret=String(process.env.CRON_SECRET||'').trim();
 if(!secret)return res.status(503).json({ok:false,error:'CRON_SECRET not configured'});
 if(String(req.headers.authorization||'').trim()!==`Bearer ${secret}`)
   return res.status(401).json({ok:false,error:'Unauthorized'});
 const workspace=String(req.query?.workspace||'').toLowerCase() as WorkspaceSlug;
 const stage=String(req.query?.stage||'') as ExtendedSyncStage;
 const cursor=String(req.query?.cursor||'');
 if(!WORKSPACES.has(workspace)||!STAGES.has(stage))
   return res.status(400).json({ok:false,error:'Provide valid workspace and stage; single-pass mode disabled'});
 if(cursor.length>2048)return res.status(400).json({ok:false,error:'Cursor too long'});
 let client:Awaited<ReturnType<typeof connectDb>>|null=null;
 let locked=false;
 try{
   client=await connectDb();
   // P31_STATUS_READ: metadata-only, authenticated. Never fetch P29/P30 JSON payload.
   if(stage==='status'){
     const q=await client.query(`SELECT p.source_synced_at,
         a.source_synced_at AS active_version,
         GREATEST(0,extract(epoch FROM (now()-p.published_at)))::integer AS source_age_seconds,
         GREATEST(0,extract(epoch FROM (now()-a.published_at)))::integer AS active_age_seconds,
         (SELECT count(*)::integer FROM public.support_mobile_period_versions v
            WHERE v.workspace_slug=p.workspace_slug AND v.source_synced_at=a.source_synced_at) AS n
       FROM public.support_mobile_published p
       LEFT JOIN public.support_mobile_period_active a ON a.workspace_slug=p.workspace_slug
       WHERE p.workspace_slug=$1`,[workspace]);
     const r=q.rows[0];
     const periodsReady=Boolean(r?.source_synced_at&&r?.active_version&&
       new Date(r.source_synced_at).getTime()===new Date(r.active_version).getTime()&&Number(r.n)===4);
     return res.status(200).json({ok:true,workspace,stage:'status',done:true,
       sourceVersion:r?.source_synced_at||null,activeVersion:r?.active_version||null,
       sourceAgeSeconds:r?.source_age_seconds??null,
       ageSeconds:r?.active_age_seconds??null,periodsReady});
   }
   const result=await client.query('select pg_try_advisory_lock($1) as locked',[LOCKS[workspace]]);
   locked=Boolean(result.rows?.[0]?.locked);
   if(!locked)return res.status(409).json({ok:false,error:'Another sync for this workspace is already running'});
   const data=stage==='publish' ? await publishMobileSnapshot(client,workspace)
     : await runStage(client,workspace,stage,cursor||null);
   return res.status(200).json({ok:true,...data,timestamp:new Date().toISOString()});
 }catch(err:any){
   const detail=String(err?.message||'Zendesk sync stage failed').slice(0,500);
   if(client&&locked&&stage!=='publish')await markStageFailure(client,workspace,stage as SyncStage,err).catch(()=>undefined);
   return res.status(500).json({ok:false,workspace,stage,error:detail});
 }finally{
   if(client){
     if(locked)await client.query('select pg_advisory_unlock($1)',[LOCKS[workspace]]).catch(()=>undefined);
     await client.end().catch(()=>undefined);
   }
 }
}
