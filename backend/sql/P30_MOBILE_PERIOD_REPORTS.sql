-- P30: immutable-version report per workspace/period, replaced atomically at publication.
-- Run in the new Supabase project's SQL editor before deploying the P30 backend.
CREATE TABLE IF NOT EXISTS public.support_mobile_period_reports (
    workspace_slug text NOT NULL CHECK (workspace_slug IN ('atomos','angelbird')),
    period_key text NOT NULL CHECK (period_key IN ('today','30','60','90')),
    source_synced_at timestamptz NOT NULL,
    published_at timestamptz NOT NULL DEFAULT now(),
    summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    report jsonb NOT NULL,
    PRIMARY KEY (workspace_slug, period_key)
);
REVOKE ALL ON TABLE public.support_mobile_period_reports FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS support_mobile_period_version_idx
 ON public.support_mobile_period_reports (workspace_slug, source_synced_at DESC);
