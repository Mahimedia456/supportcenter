-- SupportCenter Phase 26 - NEW Supabase bootstrap
-- Idempotent CREATE IF NOT EXISTS; no deletes, no truncations, no credential values.
-- Run only against the intended NEW Supabase project.
BEGIN;

-- ===== Auth/workspaces =====
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  role text not null default 'manager',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  support_label text,
  zendesk_subdomain text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role text not null default 'manager',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, workspace_id)
);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  refresh_token_hash text not null,
  device_id text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_sessions_user_id
  on public.user_sessions(user_id);

create index if not exists idx_workspace_members_user_id
  on public.workspace_members(user_id);

create index if not exists idx_workspace_members_workspace_id
  on public.workspace_members(workspace_id);

create table if not exists public.alert_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  sla_risk boolean not null default true,
  no_reply boolean not null default true,
  bad_feedback boolean not null default true,
  device_spike boolean not null default true,
  region_spike boolean not null default true,
  form_spike boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, workspace_id)
);

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  platform text,
  device_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null,
  entity_key text not null,
  label text,
  created_at timestamptz not null default now(),
  unique(user_id, workspace_id, entity_type, entity_key)
);

create table if not exists public.sync_state (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  resource text not null,
  cursor_value text,
  last_synced_at timestamptz,
  status text not null default 'idle',
  last_error text,
  updated_at timestamptz not null default now(),
  unique(workspace_id, resource)
);

insert into public.workspaces (slug, name, support_label, zendesk_subdomain, is_active)
values
  ('angelbird', 'AngelBird', 'AngelBird Support', null, true),
  ('atomos', 'Atomos', 'Atomos Support', 'atomos', true)
on conflict (slug)
do update set
  name = excluded.name,
  support_label = excluded.support_label,
  zendesk_subdomain = coalesce(excluded.zendesk_subdomain, public.workspaces.zendesk_subdomain),
  is_active = true,
  updated_at = now();

-- ===== Zendesk OAuth tokens =====
create table if not exists public.zendesk_oauth_tokens (
  workspace_slug text primary key
    check (workspace_slug in ('angelbird','atomos')),
  access_token_enc text not null,
  refresh_token_enc text,
  expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  token_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on public.zendesk_oauth_tokens from anon;
revoke all on public.zendesk_oauth_tokens from authenticated;

-- ===== 90 day snapshots =====

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

-- ===== Ticket conversations =====
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

-- Create two placeholder workspace snapshots, without claiming an import succeeded.
INSERT INTO public.zendesk_cache_snapshots(workspace_slug,sync_status)
VALUES ('atomos','never'),('angelbird','never')
ON CONFLICT (workspace_slug) DO NOTHING;

COMMIT;
