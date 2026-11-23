import type {Client} from 'pg';

type WorkspaceSlug='atomos'|'angelbird';
const WINDOWS:[string,number][]=[['today',1],['30',30],['60',60],['90',90]];

// Executed inside P29's BEGIN / COMMIT. No destructive DELETE or TRUNCATE.
// Readers see the entire last complete version or the entire next version.
export async function publishPeriodReports(client:Client,workspace:WorkspaceSlug){
  for(const [period,days] of WINDOWS){
    await client.query(`
      WITH p AS (
        SELECT workspace_slug,source_synced_at,published_at,report_timezone,payload,summary
        FROM public.support_mobile_published WHERE workspace_slug=$1
      ), b AS (
        SELECT CASE WHEN $2::text='today' THEN
          ((source_synced_at AT TIME ZONE report_timezone)::date::timestamp
              AT TIME ZONE report_timezone)
        ELSE source_synced_at - ($3::int || ' days')::interval END AS cutoff,
        source_synced_at AS finished
        FROM p
      ), selected AS (
        SELECT t.item,coalesce(nullif(t.item->>'created_at','')::timestamptz,
          nullif(t.item->>'updated_at','')::timestamptz) AS created
        FROM p,b,jsonb_array_elements(coalesce(p.payload->'tickets','[]'::jsonb)) AS t(item)
        WHERE coalesce(nullif(t.item->>'created_at','')::timestamptz,
          nullif(t.item->>'updated_at','')::timestamptz) BETWEEN b.cutoff AND b.finished
      ), ids AS (
        SELECT (item->>'id')::bigint AS ticket_id FROM selected
        WHERE item->>'id' ~ '^[0-9]+$'
      ), projected AS (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id',item->'id', 'subject',item->'subject', 'status',item->'status',
          'priority',item->'priority','created_at',item->'created_at',
          'updated_at',item->'updated_at','description',item->'description',
          'assignee_id',item->'assignee_id','requester_id',item->'requester_id',
          'group_id',item->'group_id','ticket_form_id',item->'ticket_form_id',
          'type',item->'type','tags',item->'tags','custom_fields',item->'custom_fields'
        ) ORDER BY created DESC), '[]'::jsonb) AS tickets FROM selected
      ), ratings AS (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id',r.item->'id', 'ticket_id',r.item->'ticket_id',
          'score',r.item->'score','comment',r.item->'comment',
          'created_at',r.item->'created_at','updated_at',r.item->'updated_at'
        )), '[]'::jsonb) AS satisfaction
        FROM p,b,jsonb_array_elements(coalesce(p.payload->'satisfaction','[]'::jsonb)) AS r(item)
        WHERE coalesce(nullif(r.item->>'created_at','')::timestamptz,
          nullif(r.item->>'updated_at','')::timestamptz) BETWEEN b.cutoff AND b.finished
      ), metrics AS (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'ticket_id',m.item->'ticket_id','replies',m.item->'replies',
          'reopens',m.item->'reopens',
          'reply_time_in_minutes',m.item->'reply_time_in_minutes'
        )), '[]'::jsonb) AS metrics
        FROM p,jsonb_array_elements(coalesce(p.payload->'metrics','[]'::jsonb)) AS m(item)
        WHERE m.item->>'ticket_id' ~ '^[0-9]+$' AND
          (m.item->>'ticket_id')::bigint IN (SELECT ticket_id FROM ids)
      ), breaches AS (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'ticket_id',e.item->'ticket_id','type',e.item->'type',
          'time',e.item->'time','created_at',e.item->'created_at',
          'updated_at',e.item->'updated_at'
        )), '[]'::jsonb) AS events
        FROM p,jsonb_array_elements(coalesce(p.payload->'metric-events','[]'::jsonb)) AS e(item)
        WHERE e.item->>'type'='breach'
          AND e.item->>'ticket_id' ~ '^[0-9]+$'
          AND (e.item->>'ticket_id')::bigint IN (SELECT ticket_id FROM ids)
      )
      INSERT INTO public.support_mobile_period_reports
        (workspace_slug,period_key,source_synced_at,published_at,summary,report)
      SELECT p.workspace_slug,$2,p.source_synced_at,now(),
        coalesce(p.summary->$2,'{}'::jsonb),
        jsonb_build_object(
          'meta',jsonb_build_object('workspace',p.workspace_slug,
            'snapshotStatus','ready','syncStatus','ok',
            'syncedAt',p.source_synced_at,'lastError',NULL),
          'tickets',projected.tickets,
          'fields',coalesce(p.payload->'fields','[]'::jsonb),
          'forms',coalesce(p.payload->'forms','[]'::jsonb),
          'agents',coalesce(p.payload->'agents','[]'::jsonb),
          'groups',coalesce(p.payload->'groups','[]'::jsonb),
          'satisfaction',ratings.satisfaction,'metrics',metrics.metrics,
          'slaEvents',breaches.events,
          'slaLoaded',true,'satisfactionLoaded',true,'metricsLoaded',true
        )
      FROM p CROSS JOIN projected CROSS JOIN ratings CROSS JOIN metrics CROSS JOIN breaches
      ON CONFLICT (workspace_slug,period_key) DO UPDATE SET
        source_synced_at=EXCLUDED.source_synced_at,
        published_at=EXCLUDED.published_at,
        summary=EXCLUDED.summary,
        report=EXCLUDED.report
    `,[workspace,period,days]);
  }
}
