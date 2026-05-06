-- Rollback for CLP migrations 20260506_*
-- Author:    REPP / Jann
-- Date:      2026-05-06
-- Risk:      LOW for the columns we added (no data loss, only schema).
--            DESTRUCTIVE for consent_log (drops the table).
--
-- ⚠️  ONLY RUN IF YOU NEED TO FULLY UNDO THE CLP CHANGES  ⚠️
--   This rolls back BOTH:
--     - The columns added to public.leads (DROP COLUMN — Postgres throws
--       away the data in those columns. CLP-specific fields will be lost).
--     - The public.consent_log table (DROP TABLE — every consent row is lost,
--       which is an AVG-evidence problem. Consider exporting first).
--
-- Pre-rollback (recommended):
--   COPY (SELECT * FROM public.consent_log) TO '/tmp/consent_log_backup.csv' CSV HEADER;
--   COPY (SELECT id, session_id, source, persona, temperature, score, stage,
--                attributes
--         FROM public.leads
--         WHERE source IS NOT NULL OR session_id IS NOT NULL)
--     TO '/tmp/clp_leads_backup.csv' CSV HEADER;

BEGIN;

-- 1. Drop CLP-specific RLS policies (idempotent).
DROP POLICY IF EXISTS "clp: anon has no access to leads"   ON public.leads;
DROP POLICY IF EXISTS "clp: anon may insert consent"       ON public.consent_log;
DROP POLICY IF EXISTS "clp: no anon read of consent"       ON public.consent_log;
DROP POLICY IF EXISTS "clp: no anon update of consent"     ON public.consent_log;
DROP POLICY IF EXISTS "clp: no anon delete of consent"     ON public.consent_log;

-- 2. Drop consent_log entirely.
DROP TABLE IF EXISTS public.consent_log;

-- 3. Drop the indexes we added on leads (DROP COLUMN cascades, but explicit is clearer).
DROP INDEX IF EXISTS public.leads_source_session_uniq;
DROP INDEX IF EXISTS public.leads_temperature_last_event_idx;
DROP INDEX IF EXISTS public.leads_source_last_event_idx;

-- 4. Drop CLP-specific columns. Existing leads rows are NOT removed —
--    only the CLP columns disappear. WhatsApp-bot data remains intact.
ALTER TABLE public.leads
  DROP COLUMN IF EXISTS session_id,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS persona,
  DROP COLUMN IF EXISTS intent_id,
  DROP COLUMN IF EXISTS size_id,
  DROP COLUMN IF EXISTS timeline_id,
  DROP COLUMN IF EXISTS temperature,
  DROP COLUMN IF EXISTS score,
  DROP COLUMN IF EXISTS stage,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS cta_variant,
  DROP COLUMN IF EXISTS followup,
  DROP COLUMN IF EXISTS afhaak_reason,
  DROP COLUMN IF EXISTS handoff_shown,
  DROP COLUMN IF EXISTS handoff_outcome,
  DROP COLUMN IF EXISTS handoff_temperature,
  DROP COLUMN IF EXISTS handoff_persona,
  DROP COLUMN IF EXISTS started_at,
  DROP COLUMN IF EXISTS last_event_at,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS privacy_statement_version,
  DROP COLUMN IF EXISTS attributes;

-- 5. Note: RLS on public.leads is left enabled. If you want to fully revert
--    to a pre-CLP state and the WhatsApp-bot relied on RLS being OFF,
--    uncomment:
--    ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;

COMMIT;

-- Sanity check post-rollback:
--   SELECT count(*) FROM public.leads;          -- should equal pre-CLP count
--   SELECT to_regclass('public.consent_log');   -- should be NULL
