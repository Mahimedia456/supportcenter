import {Client} from 'pg';
import {runStage,type SyncStage,type WorkspaceSlug} from './_support-staged-sync';

async function db(){const raw=String(process.env.SUPABASE_DATABASE_URL||'').trim();if(!raw)throw new Error('SUPABASE_DATABASE_URL missing');const u=new URL(raw);u.searchParams.delete('sslmode');u.searchParams.delete('uselibpqcompat');const c=new Client({connectionString:u.toString(),ssl:{rejectUnauthorized:false}});await c.connect();return c}
export default async function handler(req:any,res:any){
 if(req.method!=='GET'&&req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
 const expected=String(process.env.CRON_SECRET||'').trim();
 if(!expected)return res.status(500).json({ok:false,error:'CRON_SECRET missing'});
 if(String(req.headers.authorization||'').trim()!==`Bearer ${expected}`)return res.status(401).json({ok:false,error:'Unauthorized'});
 const workspace=String(req.query?.workspace||'') as WorkspaceSlug;
 const stage=String(req.query?.stage||'') as SyncStage;
 const cursor=req.query?.cursor?decodeURIComponent(String(req.query.cursor)):null;

 // Keep the legacy daily Vercel cron harmless. Full sync is now
 // orchestrated by GitHub Actions using explicit short stages.
 if(!workspace&&!stage){
  return res.status(200).json({
   ok:true,
   staged:true,
   message:'Use the GitHub staged sync workflow for full refresh',
  });
 }

 if(!['atomos','angelbird'].includes(workspace))return res.status(400).json({ok:false,error:'workspace required'});
 if(!['reference','satisfaction','metrics','tickets','metric-events'].includes(stage))return res.status(400).json({ok:false,error:'stage required'});
 let client:Client|null=null;
 try{client=await db();const result=await runStage(client,workspace,stage,cursor);return res.status(200).json({ok:true,...result,timestamp:new Date().toISOString()})}
 catch(error:any){return res.status(500).json({ok:false,error:error?.message||'Staged sync failed'})}
 finally{if(client)await client.end().catch(()=>undefined)}
}
