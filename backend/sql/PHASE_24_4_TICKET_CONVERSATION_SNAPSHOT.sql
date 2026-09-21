create table if not exists public.zendesk_ticket_conversation_snapshots (
  workspace_slug text not null
    check (workspace_slug in ('angelbird','atomos')),
  ticket_id bigint not null,
  ticket_updated_at timestamptz,
  comments jsonb not null default '[]'::jsonb,
  comment_count integer not null default 0,
  synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_slug, ticket_id)
);

create index if not exists idx_zendesk_ticket_conversation_workspace_synced
  on public.zendesk_ticket_conversation_snapshots (workspace_slug, synced_at desc);

create index if not exists idx_zendesk_ticket_conversation_ticket
  on public.zendesk_ticket_conversation_snapshots (ticket_id);

revoke all on public.zendesk_ticket_conversation_snapshots from anon;
revoke all on public.zendesk_ticket_conversation_snapshots from authenticated;
