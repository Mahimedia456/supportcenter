import type {Client} from 'pg';

type WorkspaceSlug = 'atomos' | 'angelbird';

/* One PostgreSQL transaction publishes all payload parts atomically. Source stages
   write the existing cache row; app reads ONLY this last published row. */
export async function publishMobileSnapshot(client:Client,workspace:WorkspaceSlug) {
  await client.query('BEGIN');
  try {
    const source=await client.query(`
      SELECT workspace_slug,synced_at,sync_status
      FROM public.zendesk_cache_snapshots WHERE workspace_slug=$1 FOR SHARE`,[workspace]);
    const row=source.rows[0];
    if(!row || row.sync_status!=='ok' || !row.synced_at)
      throw new Error('Source snapshot is not complete; publication refused');

    // Full source stays in zendesk_cache_snapshots. The published mobile view
    // contains all 90-day tickets/metrics/ratings and only SLA breach events.
    // Large event arrays are filtered inside PostgreSQL, not moved to Node.
    await client.query(`
      INSERT INTO public.support_mobile_published
       (workspace_slug,source_synced_at,published_at,report_timezone,payload,summary)
      SELECT workspace_slug,synced_at,now(),'Asia/Karachi',
        jsonb_build_object(
          'tickets',coalesce(tickets,'[]'::jsonb),
          'fields',coalesce(fields,'[]'::jsonb),
          'forms',coalesce(forms,'[]'::jsonb),
          'agents',coalesce(agents,'[]'::jsonb),
          'groups',coalesce(groups,'[]'::jsonb),
          'satisfaction',coalesce(satisfaction,'[]'::jsonb),
          'metrics',coalesce(metrics,'[]'::jsonb),
          'metric-events',coalesce(
            jsonb_path_query_array(coalesce(metric_events,'[]'::jsonb),
             '$[*] ? (@.type == "breach")'), '[]'::jsonb)
        ),'{}'::jsonb
      FROM public.zendesk_cache_snapshots
      WHERE workspace_slug=$1 AND synced_at IS NOT NULL AND sync_status='ok'
      ON CONFLICT(workspace_slug) DO UPDATE SET
        source_synced_at=EXCLUDED.source_synced_at,
        published_at=EXCLUDED.published_at,
        report_timezone=EXCLUDED.report_timezone,
        payload=EXCLUDED.payload,
        summary=EXCLUDED.summary
      WHERE public.support_mobile_published.source_synced_at IS DISTINCT FROM EXCLUDED.source_synced_at
      `,[workspace]);

    // Summary is computed from the ENTIRE published dataset, not mobile pages.
    // Status and priority semantics match original Expo overview.ts.
    const result=await client.query(`
      WITH p AS (
        SELECT source_synced_at,report_timezone,payload
        FROM public.support_mobile_published WHERE workspace_slug=$1
      ), windows AS (
        SELECT * FROM (VALUES ('today',1),('7',7),('30',30),('60',60),('90',90)) AS w(period,days)
      ), bounds AS (
        SELECT w.period,
          CASE WHEN w.days=1 THEN
            ((p.source_synced_at AT TIME ZONE p.report_timezone)::date::timestamp
              AT TIME ZONE p.report_timezone)
          ELSE p.source_synced_at - (w.days || ' days')::interval END AS cutoff,
          p.source_synced_at AS finished
        FROM windows w CROSS JOIN p
      ), tickets AS (
        SELECT (t.item->>'id')::bigint AS ticket_id,
          coalesce(nullif(t.item->>'created_at','')::timestamptz,
                   nullif(t.item->>'updated_at','')::timestamptz) AS created,
          lower(coalesce(t.item->>'status','')) AS status,
          lower(coalesce(t.item->>'priority','')) AS priority,
          nullif(t.item->>'assignee_id','') AS assignee_id
        FROM p, LATERAL jsonb_array_elements(p.payload->'tickets') AS t(item)
      ), m AS (
        SELECT (x.item->>'ticket_id')::bigint AS ticket_id,
          max(coalesce(nullif(x.item->>'replies','')::int,0)) AS replies,
          max(coalesce(nullif(x.item #>> '{reply_time_in_minutes,calendar}','')::numeric,0)) AS reply_minutes
        FROM p,LATERAL jsonb_array_elements(p.payload->'metrics') AS x(item)
        WHERE nullif(x.item->>'ticket_id','') IS NOT NULL
        GROUP BY (x.item->>'ticket_id')::bigint
      ), breaching AS (
        SELECT DISTINCT (x.item->>'ticket_id')::bigint AS ticket_id
        FROM p,LATERAL jsonb_array_elements(p.payload->'metric-events') AS x(item)
        WHERE x.item->>'type'='breach'
      ), rating AS (
        SELECT coalesce(nullif(x.item->>'created_at','')::timestamptz,
                         nullif(x.item->>'updated_at','')::timestamptz) AS created,
          lower(coalesce(x.item->>'score','')) AS score
        FROM p,LATERAL jsonb_array_elements(p.payload->'satisfaction') AS x(item)
      ), ticket_summary AS (
        SELECT b.period,
          count(t.ticket_id)::int AS total,
          count(t.ticket_id) FILTER (WHERE t.status IN ('new','open'))::int AS open,
          count(t.ticket_id) FILTER (WHERE t.status='pending')::int AS pending,
          count(t.ticket_id) FILTER (WHERE t.priority IN ('high','urgent'))::int AS high_priority,
          count(t.ticket_id) FILTER (WHERE t.assignee_id IS NULL OR t.assignee_id='0')::int AS unassigned,
          count(t.ticket_id) FILTER (WHERE br.ticket_id IS NOT NULL)::int AS breached,
          count(t.ticket_id) FILTER (WHERE t.status IN ('new','open','pending','hold') AND
                  m.ticket_id IS NOT NULL AND m.replies=0 AND
                  t.created<=b.finished - interval '4 hours')::int AS no_reply_4h,
          count(t.ticket_id) FILTER (WHERE m.reply_minutes>240)::int AS first_reply_4h,
          count(t.ticket_id) FILTER (WHERE t.status IN ('new','open','pending','hold') AND
                  t.created<=b.finished - interval '72 hours')::int AS unsolved_72h
        FROM bounds b LEFT JOIN tickets t ON t.created>=b.cutoff AND t.created<=b.finished
        LEFT JOIN m ON m.ticket_id=t.ticket_id
        LEFT JOIN breaching br ON br.ticket_id=t.ticket_id
        GROUP BY b.period
      ), rating_summary AS (
        SELECT b.period,
          count(r.score)::int AS total,
          count(r.score) FILTER (WHERE r.score='good')::int AS good,
          count(r.score) FILTER (WHERE r.score='bad')::int AS bad
        FROM bounds b LEFT JOIN rating r ON r.created>=b.cutoff AND r.created<=b.finished
        GROUP BY b.period
      )
      SELECT coalesce(jsonb_object_agg(t.period,
        jsonb_build_object(
         'totalTickets',t.total,'open',t.open,'pending',t.pending,
         'highPriority',t.high_priority,'unassigned',t.unassigned,
         'slaBreached',t.breached,'noReplyOver4h',t.no_reply_4h,
         'firstReplyOver4h',t.first_reply_4h,'unsolvedOver72h',t.unsolved_72h,
         'satisfactionTotal',r.total,'satisfactionGood',r.good,'satisfactionBad',r.bad
        )), '{}'::jsonb) AS summary
      FROM ticket_summary t JOIN rating_summary r USING(period)`,[workspace]);

    const summary=result.rows[0]?.summary||{};
    await client.query('UPDATE public.support_mobile_published SET summary=$2::jsonb WHERE workspace_slug=$1',
      [workspace,JSON.stringify(summary)]);
    await client.query('COMMIT');
    return {workspace,stage:'publish',done:true,version:row.synced_at,counts:summary};
  } catch(e) {
    await client.query('ROLLBACK').catch(()=>undefined);
    throw e;
  }
}
