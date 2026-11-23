import {bearer,connectDb,resolveWorkspaceSlug,verifyAccess} from './_support-cache-common';

/* Read-only, authenticated access to last atomically published snapshot.
   This route NEVER calls Zendesk and NEVER returns 90-day metric event streams. */
const PARTS=new Set(['tickets','fields','forms','agents','groups','satisfaction','metrics','metric-events']);
const PERIODS=new Set(['today','7','30','60','90']);

export default async function handler(req:any,res:any){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  const token=bearer(req.headers.authorization);
  if(!token)return res.status(401).json({error:'Unauthorized'});
  let client:Awaited<ReturnType<typeof connectDb>>|null=null;
  try {
    const payload=verifyAccess(token);
    client=await connectDb();
    const workspace=await resolveWorkspaceSlug(client,payload);
    const part=String(req.query?.part||'meta');
    const period=String(req.query?.period||'today');
    if(!PERIODS.has(period))return res.status(400).json({error:'Invalid period'});
    if(part!=='meta'&&part!=='summary'&&!PARTS.has(part))
      return res.status(400).json({error:'Invalid part'});

    const source=await client.query(`SELECT source_synced_at,published_at,report_timezone,summary
      FROM public.support_mobile_published WHERE workspace_slug=$1 LIMIT 1`,[workspace]);
    const entry=source.rows[0];
    if(!entry)return res.status(200).json({workspace,snapshotStatus:'missing',syncStatus:'never',
      syncedAt:null,source:'published-db',period,items:[],done:true,nextOffset:null});
    const syncedAt=new Date(entry.source_synced_at).toISOString();
    if(part==='meta')return res.status(200).json({
      workspace,snapshotStatus:'ready',syncStatus:'ok',syncedAt,
      publishedAt:entry.published_at,reportTimezone:entry.report_timezone,
      source:'published-db',period,summary:entry.summary?.[period]||{},lastError:null
    });
    if(part==='summary')return res.status(200).json({
      workspace,period,syncedAt,summary:entry.summary?.[period]||{},
      complete:true,source:'published-db'
    });

    const version=String(req.query?.version||'');
    if(version&&version!==syncedAt)
      return res.status(409).json({error:'SNAPSHOT_VERSION_CHANGED',syncedAt});
    const offset=Number(req.query?.offset??0);
    const limit=Number(req.query?.limit??30);
    if(!Number.isSafeInteger(offset)||offset<0||offset>1_000_000||
       !Number.isSafeInteger(limit)||limit<1||limit>60)
      return res.status(400).json({error:'Invalid pagination'});

    // Zendesk ticket time period matches original Expo selection by created_at,
    // falling back to updated_at. For Today use Asia/Karachi local midnight.
    // Source version time is used, so all pages of a version share the same cutoffs.
    const query=`
      WITH pub AS (
        SELECT payload,source_synced_at,report_timezone
        FROM public.support_mobile_published WHERE workspace_slug=$1
      ), bounds AS (
        SELECT CASE WHEN $3::text='today' THEN
            ((source_synced_at AT TIME ZONE report_timezone)::date::timestamp
              AT TIME ZONE report_timezone)
          ELSE source_synced_at - ((($3::text)::int || ' days')::interval) END AS cutoff,
          source_synced_at AS finished FROM pub
      ), selected_tickets AS (
        SELECT (t.item->>'id')::bigint AS id
        FROM pub,bounds,LATERAL jsonb_array_elements(pub.payload->'tickets') AS t(item)
        WHERE coalesce(nullif(t.item->>'created_at','')::timestamptz,
                       nullif(t.item->>'updated_at','')::timestamptz)
              BETWEEN bounds.cutoff AND bounds.finished
      ), candidates AS (
        SELECT x.item,x.ordinal,
          coalesce(nullif(x.item->>'created_at','')::timestamptz,
                   nullif(x.item->>'updated_at','')::timestamptz) AS created
        FROM pub,LATERAL jsonb_array_elements(pub.payload->$2) WITH ORDINALITY AS x(item,ordinal)
      )
      SELECT item FROM candidates c CROSS JOIN bounds b
      WHERE CASE
        WHEN $2 IN ('tickets','satisfaction')
          THEN c.created BETWEEN b.cutoff AND b.finished
        WHEN $2 IN ('metrics','metric-events')
          THEN (c.item->>'ticket_id')::bigint IN (SELECT id FROM selected_tickets)
        ELSE true END
      ORDER BY CASE WHEN $2 IN ('tickets','satisfaction') THEN c.created END DESC NULLS LAST,
               c.ordinal ASC
      LIMIT $4 OFFSET $5`;
    const rows=await client.query(query,[workspace,part,period,limit+1,offset]);
    const done=rows.rows.length<=limit;
    return res.status(200).json({
      workspace,part,period,syncedAt,
      items:rows.rows.slice(0,limit).map((r:any)=>r.item),
      done,nextOffset:done?null:offset+limit
    });
  }catch(error:any){
    return res.status(500).json({error:error?.message||'Published snapshot query failed'});
  }finally {if(client)await client.end().catch(()=>undefined);}
}
