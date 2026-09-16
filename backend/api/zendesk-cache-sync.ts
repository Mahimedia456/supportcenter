import {bearer,connectDb,resolveWorkspaceSlug,verifyAccess} from './_support-cache-common';
import {runStage,type SyncStage} from './_support-staged-sync';

export default async function handler(req:any,res:any){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const token=bearer(req.headers.authorization);if(!token)return res.status(401).json({error:'Unauthorized'});
 let client:any;
 try{
  const payload=verifyAccess(token);client=await connectDb();const workspace=await resolveWorkspaceSlug(client,payload);
  const stage=String(req.query?.stage||'reference') as SyncStage;
  const cursor=req.query?.cursor?decodeURIComponent(String(req.query.cursor)):null;
  const result=await runStage(client,workspace,stage,cursor);
  return res.status(200).json({ok:true,...result});
 }catch(error:any){return res.status(500).json({error:error?.message||'Unable to sync support snapshot'})}
 finally{if(client)await client.end().catch(()=>undefined)}
}
