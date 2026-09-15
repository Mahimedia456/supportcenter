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
