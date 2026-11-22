-- Read-only verification after deployment. No data is changed.
SELECT
  workspace_slug,
  jsonb_array_length(tickets) AS tickets,
  jsonb_array_length(forms) AS forms,
  jsonb_array_length(fields) AS fields,
  jsonb_array_length(groups) AS groups,
  jsonb_array_length(agents) AS agents,
  jsonb_array_length(satisfaction) AS satisfaction,
  jsonb_array_length(metrics) AS metrics,
  jsonb_array_length(metric_events) AS metric_events,
  synced_at, sync_status, last_error
FROM public.zendesk_cache_snapshots ORDER BY workspace_slug;

SELECT w.slug, count(wm.user_id) AS active_members
FROM public.workspaces w LEFT JOIN public.workspace_members wm
  ON wm.workspace_id=w.id AND wm.is_active
GROUP BY w.slug ORDER BY w.slug;

SELECT workspace_slug,count(*) AS cached_conversations,
       max(synced_at) AS latest_conversation_sync
FROM public.zendesk_ticket_conversation_snapshots
GROUP BY workspace_slug ORDER BY workspace_slug;
