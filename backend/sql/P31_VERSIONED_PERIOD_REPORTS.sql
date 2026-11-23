-- SupportCenter P31: use complete immutable periods and one small active-version pointer.
-- Safe to run repeatedly. This migration does not alter/remove P29 or P30 data.
CREATE TABLE IF NOT EXISTS public.support_mobile_period_versions (
    workspace_slug text NOT NULL CHECK (workspace_slug IN ('atomos','angelbird')),
    source_synced_at timestamptz NOT NULL,
    period_key text NOT NULL CHECK (period_key IN ('today','30','60','90')),
    staged_at timestamptz NOT NULL DEFAULT now(),
    summary jsonb NOT NULL,
    report jsonb NOT NULL,
    PRIMARY KEY (workspace_slug, source_synced_at, period_key)
);

CREATE TABLE IF NOT EXISTS public.support_mobile_period_active (
    workspace_slug text PRIMARY KEY CHECK (workspace_slug IN ('atomos','angelbird')),
    source_synced_at timestamptz NOT NULL,
    published_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE public.support_mobile_period_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.support_mobile_period_active FROM PUBLIC, anon, authenticated;

-- No backfill needed: first P31 publication will fill four staged rows and flip pointer.
-- P30 API fallback continues serving existing complete reports before that first flip.
