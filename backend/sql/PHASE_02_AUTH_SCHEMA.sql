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
