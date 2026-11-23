-- SupportCenter P29: last COMPLETE published snapshot for mobile.
-- Do not expose this table directly to public clients. Read through the authenticated API.
CREATE TABLE IF NOT EXISTS public.support_mobile_published (
    workspace_slug text PRIMARY KEY CHECK (workspace_slug IN ('atomos','angelbird')),
    source_synced_at timestamptz NOT NULL,
    published_at timestamptz NOT NULL DEFAULT now(),
    report_timezone text NOT NULL DEFAULT 'Asia/Karachi',
    payload jsonb NOT NULL,
    summary jsonb NOT NULL DEFAULT '{}'::jsonb
);
REVOKE ALL ON TABLE public.support_mobile_published FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS support_mobile_published_source_idx
    ON public.support_mobile_published (source_synced_at DESC);
