
create table if not exists public.zendesk_cache_snapshots (
  workspace_slug text primary key
    check (workspace_slug in ('angelbird','atomos')),
  tickets jsonb not null default '[]'::jsonb,
  forms jsonb not null default '[]'::jsonb,
  fields jsonb not null default '[]'::jsonb,
  groups jsonb not null default '[]'::jsonb,
  agents jsonb not null default '[]'::jsonb,
  satisfaction jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '[]'::jsonb,
  metric_events jsonb not null default '[]'::jsonb,
  synced_at timestamptz,
  sync_status text not null default 'never',
  last_error text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_zendesk_cache_snapshots_synced
  on public.zendesk_cache_snapshots (synced_at desc);

revoke all on public.zendesk_cache_snapshots from anon;
revoke all on public.zendesk_cache_snapshots from authenticated;
