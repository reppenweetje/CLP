-- Migration: extend leads table for CLP (Conversational Landing Page)
-- Author:    REPP / Jann
-- Date:      2026-05-06
-- Risk:      LOW. Only ADD COLUMN with nullable defaults. No data is mutated.
--            No existing column is altered or dropped.
-- Reviewer:  Tharwat — please run `\d leads` first and confirm none of the new
--            column names already exist with a different type. If a name
--            collides, ping us before applying.
--
-- What this does:
--   1. Adds a set of nullable columns to `public.leads` to capture CLP-specific
--      lead-qualification data (persona, score, stage, temperature, etc.).
--   2. Adds `attributes jsonb` for project-specific extras so we never need
--      another schema migration per CLP project.
--   3. Adds a partial unique index on (source, session_id) so the Edge
--      Function can UPSERT idempotently. Existing rows (where session_id
--      is NULL) are unaffected — Postgres allows multiple NULLs in a
--      unique index.
--
-- What this does NOT do:
--   - It does not alter, rename, or drop any existing column.
--   - It does not touch any existing row.
--   - It does not enable or change RLS — see ../policies/recommended_rls.sql
--     for the (separately reviewable) RLS recommendation.
--
-- Pre-flight (run manually before applying):
--   SELECT count(*) AS leads_before FROM public.leads;
--   -- Expected: 391 (as of 2026-05-06). Record the exact number you observe.
--
-- Post-flight (run manually after applying):
--   SELECT count(*) AS leads_after FROM public.leads;
--   -- MUST equal leads_before. If not — STOP and roll back.

BEGIN;

-- Defensive: every ADD is guarded with IF NOT EXISTS (Postgres 9.6+).
-- If a column with the same name already exists with a different type,
-- this is a no-op. That is why Tharwat must do the `\d leads` check first.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS session_id              text,
  ADD COLUMN IF NOT EXISTS source                  text,
  ADD COLUMN IF NOT EXISTS persona                 text,
  ADD COLUMN IF NOT EXISTS intent_id               text,
  ADD COLUMN IF NOT EXISTS size_id                 text,
  ADD COLUMN IF NOT EXISTS timeline_id             text,
  ADD COLUMN IF NOT EXISTS temperature             text,
  ADD COLUMN IF NOT EXISTS score                   integer,
  ADD COLUMN IF NOT EXISTS stage                   text,
  ADD COLUMN IF NOT EXISTS status                  text,
  ADD COLUMN IF NOT EXISTS cta_variant             text,
  ADD COLUMN IF NOT EXISTS followup                text,
  ADD COLUMN IF NOT EXISTS afhaak_reason           text,
  ADD COLUMN IF NOT EXISTS handoff_shown           boolean,
  ADD COLUMN IF NOT EXISTS handoff_outcome         text,
  ADD COLUMN IF NOT EXISTS handoff_temperature     text,
  ADD COLUMN IF NOT EXISTS handoff_persona         text,
  ADD COLUMN IF NOT EXISTS started_at              timestamptz,
  ADD COLUMN IF NOT EXISTS last_event_at           timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at            timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_statement_version text,
  ADD COLUMN IF NOT EXISTS attributes              jsonb DEFAULT '{}'::jsonb;

-- Partial unique index for idempotent upsert.
-- Keyed on (source, session_id) so leads from different sources cannot
-- accidentally collide. WhatsApp-bot leads (session_id IS NULL) are
-- excluded from uniqueness — they retain their existing primary key.
CREATE UNIQUE INDEX IF NOT EXISTS leads_source_session_uniq
  ON public.leads (source, session_id)
  WHERE session_id IS NOT NULL;

-- Helpful for sales-pickup queries ("show me hottest leads of last 24h").
CREATE INDEX IF NOT EXISTS leads_temperature_last_event_idx
  ON public.leads (temperature, last_event_at DESC)
  WHERE temperature IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_source_last_event_idx
  ON public.leads (source, last_event_at DESC)
  WHERE source IS NOT NULL;

-- Lightweight comments so future-us / future-Tharwat knows what's what.
COMMENT ON COLUMN public.leads.session_id      IS 'CLP browser session UUID (crypto.randomUUID). NULL for non-CLP leads.';
COMMENT ON COLUMN public.leads.source          IS 'Origin tag, e.g. ''clp_dehofman'', ''whatsapp_bot''. Use to segment in queries.';
COMMENT ON COLUMN public.leads.persona         IS 'eigen_gebruiker | belegger | beide | huurder | onbekend';
COMMENT ON COLUMN public.leads.temperature     IS 'cold | lukewarm | warm | hot — derived from stage in CLP scoring.js';
COMMENT ON COLUMN public.leads.stage           IS 'koopintentie | actief_geinteresseerd | orienterend | nieuwsgierig | onbekend';
COMMENT ON COLUMN public.leads.attributes      IS 'Project-specific extras (jsonb). Avoid adding new columns per project — store here.';
COMMENT ON COLUMN public.leads.privacy_statement_version IS 'Version of the privacy statement the visitor agreed to (matches consent_log).';

COMMIT;

-- End of migration. Sanity check from psql:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='leads'
--   ORDER BY ordinal_position;
