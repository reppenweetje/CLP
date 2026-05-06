-- Migration: create consent_log (AVG/GDPR audit trail)
-- Author:    REPP / Jann
-- Date:      2026-05-06
-- Risk:      LOW. Creates a new table only. Does not touch existing data.
--
-- Why this exists:
--   AVG art. 7 lid 1: "the controller shall be able to demonstrate that the
--   data subject has consented." We need a tamper-evident, append-only log
--   of who consented to what, when, under which version of the privacy
--   statement. localStorage on the visitor's device is not sufficient
--   evidence — they can clear it. Server-side write is.
--
-- Design choices:
--   - `lead_id` is a SOFT reference (no FK constraint) because we don't know
--     the type of the existing leads.id column. Tharwat: if leads.id is uuid,
--     consider adding the FK in a follow-up migration:
--         ALTER TABLE consent_log
--           ADD CONSTRAINT consent_log_lead_id_fkey
--           FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;
--   - Append-only is enforced via RLS in ../policies/recommended_rls.sql,
--     not via a trigger, because RLS plays nicer with Supabase's role model.
--   - We deliberately do NOT store IP address. session_id + truncated
--     user_agent is enough for audit reproduction without unnecessary PII.

BEGIN;

-- gen_random_uuid() lives in pgcrypto on older Postgres; Supabase ships it
-- in the public schema by default, but enable defensively.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.consent_log (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                  text        NOT NULL,
  lead_id                     uuid        NULL,             -- soft ref, see note above
  source                      text        NOT NULL,         -- e.g. 'clp_dehofman'
  scope                       text        NOT NULL,         -- e.g. 'brochure-en-opvolging', 'credion-doorgifte', 'verwijdering-uitgevoerd'
  granted                     boolean     NOT NULL,         -- false (refused) is also a fact we must keep
  privacy_statement_version   text        NOT NULL,         -- matches PRIVACY_STATEMENT_VERSION in src/lib/consent.js
  user_agent                  text        NULL,             -- truncated to 200 chars in client
  detail                      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consent_log_session_id_idx ON public.consent_log (session_id);
CREATE INDEX IF NOT EXISTS consent_log_lead_id_idx    ON public.consent_log (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS consent_log_created_at_idx ON public.consent_log (created_at DESC);
CREATE INDEX IF NOT EXISTS consent_log_scope_idx      ON public.consent_log (scope);

COMMENT ON TABLE  public.consent_log                          IS 'Append-only AVG art. 7 audit log. Never UPDATE or DELETE rows here.';
COMMENT ON COLUMN public.consent_log.scope                    IS 'Machine-readable consent scope. Mirrors src/lib/consent.js logConsent() calls.';
COMMENT ON COLUMN public.consent_log.granted                  IS 'TRUE = consent given, FALSE = explicitly refused. Both are evidence.';
COMMENT ON COLUMN public.consent_log.privacy_statement_version IS 'Identifies the exact privacy text the user saw, see public/privacy.html.';

COMMIT;
