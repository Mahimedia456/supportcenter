import {gzipSync} from 'node:zlib';
import {bearer,connectDb,resolveWorkspaceSlug,verifyAccess} from './_support-cache-common';

const PERIODS=new Set(['today','30','60','90']);
/** Read ONLY a database-published, complete period. Never contact Zendesk. */
export default async function handler(req:any,res:any){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const token=bearer(req.headers.authorization);
  if(!token)return res.status(401).json({error:'Unauthorized'});
  const period=String(req.query?.period||'today');
  if(!PERIODS.has(period))return res.status(400).json({error:'Invalid period'});
  let client:Awaited<ReturnType<typeof connectDb>>|null=null;
  try{
    const identity=verifyAccess(token);
    client=await connectDb();
    const workspace=await resolveWorkspaceSlug(client,identity);
    const metaOnly=String(req.query?.meta||'')==='1';
    const result=await client.query(metaOnly
      ? `SELECT source_synced_at FROM public.support_mobile_period_reports
          WHERE workspace_slug=$1 AND period_key=$2 LIMIT 1`
      : `SELECT source_synced_at,summary,report FROM public.support_mobile_period_reports
          WHERE workspace_slug=$1 AND period_key=$2 LIMIT 1`,[workspace,period]);
    if(!result.rows.length)return res.status(503).json({error:'P30_PERIOD_NOT_PUBLISHED',workspace,period});
    const entry=result.rows[0];
    // A source can be syncing; only this committed report is returned.
    const version=new Date(entry.source_synced_at).toISOString();
    if(metaOnly)return res.status(200).json({workspace,period,version,snapshotStatus:'ready'});
    // Normalize timestamp to one stable wire representation across PostgreSQL and Node.
    const report={...entry.report,meta:{...entry.report.meta,syncedAt:version}};
    const response={workspace,period,version,
      summary:entry.summary,report,snapshotStatus:'ready'};
    const raw=Buffer.from(JSON.stringify(response),'utf8');
    // Avoid a huge uncompressed Vercel response. Android uses JsonReader + GZIPInputStream.
    const compressed=gzipSync(raw,{level:4});
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Content-Encoding','gzip');
    res.setHeader('Vary','Authorization, Accept-Encoding');
    return res.status(200).end(compressed);
  }catch(err:any){
    return res.status(500).json({error:String(err?.message||'Published period unavailable').slice(0,300)});
  }finally{if(client)await client.end().catch(()=>undefined);}
}
