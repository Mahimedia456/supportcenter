-- Read-only. Exactly four rows should match the active version for each enabled workspace.
WITH a AS (
 SELECT workspace_slug, source_synced_at, published_at
 FROM public.support_mobile_period_active
)
SELECT a.workspace_slug, a.source_synced_at, a.published_at,
  v.period_key,
  jsonb_array_length(v.report->'tickets') AS tickets,
  (v.summary->>'totalTickets')::int AS expected_tickets,
  jsonb_array_length(v.report->'satisfaction') AS ratings,
  (v.summary->>'satisfactionTotal')::int AS expected_ratings,
  (v.report->'meta'->>'syncedAt')::timestamptz = a.source_synced_at AS metadata_matches,
  (jsonb_array_length(v.report->'tickets') = (v.summary->>'totalTickets')::int)
   AND (jsonb_array_length(v.report->'satisfaction') = (v.summary->>'satisfactionTotal')::int) AS counts_match
FROM a
JOIN public.support_mobile_period_versions v
  ON v.workspace_slug = a.workspace_slug AND v.source_synced_at = a.source_synced_at
ORDER BY a.workspace_slug, CASE v.period_key WHEN 'today' THEN 0 WHEN '30' THEN 1 WHEN '60' THEN 2 WHEN '90' THEN 3 END;
