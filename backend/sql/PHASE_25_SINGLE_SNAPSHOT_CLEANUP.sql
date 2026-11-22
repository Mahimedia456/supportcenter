-- One-time cleanup requested for Support Command Center.
-- Clears snapshot payloads only. Auth/workspaces and all non-snapshot tables remain untouched.
DO $$
BEGIN
  IF to_regclass('public.zendesk_ticket_conversation_snapshots') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.zendesk_ticket_conversation_snapshots';
  END IF;
  IF to_regclass('public.zendesk_cache_snapshots') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.zendesk_cache_snapshots';
  END IF;
END $$;
