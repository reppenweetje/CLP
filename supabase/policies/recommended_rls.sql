-- Recommended RLS policies for CLP
-- Author:    REPP / Jann
-- Date:      2026-05-06
-- Risk:      MEDIUM — review before applying.
--
-- ⚠️  READ THIS FIRST  ⚠️
-- This file is intentionally separate from the main migrations because RLS
-- changes can break the existing WhatsApp-bot if it relies on anon access
-- to public.leads. Tharwat — please verify the assumption below before
-- applying:
--
--   ASSUMPTION:  the WhatsApp-bot writes to public.leads using the
--                service-role key (server-side), NOT the anon key.
--                If that's true, this file is safe to apply as-is.
--                If the WhatsApp-bot uses the anon key directly,
--                STOP and ping us — we'll need a different policy shape.
--
-- How to verify the assumption:
--   1. In Supabase dashboard → Authentication → Policies → public.leads.
--      Check whether RLS is enabled and what policies exist.
--   2. In the WhatsApp-bot code, search for 'SUPABASE_ANON_KEY' vs
--      'SUPABASE_SERVICE_ROLE_KEY'. The latter is what we expect.
--
-- What this file does:
--   1. Enables RLS on public.leads (no-op if already enabled).
--   2. Enables RLS on public.consent_log.
--   3. Adds a deny-all policy for the anon role on leads (service-role
--      bypasses RLS, so the Edge Function still works).
--   4. Adds an INSERT-only policy on consent_log for both anon and
--      service-role (we want the audit log to capture even attempted
--      consents from the browser, but never updates or deletes).
--
-- What this file does NOT do:
--   - Drop or replace any existing policy. Existing policies stay intact.

BEGIN;

-- ── public.leads ────────────────────────────────────────────────────────────

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Block anon completely. The Edge Function uses the service-role key, which
-- bypasses RLS, so this does not block our own writes.
DROP POLICY IF EXISTS "clp: anon has no access to leads" ON public.leads;
CREATE POLICY "clp: anon has no access to leads"
  ON public.leads
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ── public.consent_log ──────────────────────────────────────────────────────

ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

-- Anon may INSERT only. This means the browser can write a consent row
-- directly via the supabase-js anon client if we ever want that — but only
-- ever as an INSERT, never SELECT/UPDATE/DELETE.
-- Today the Edge Function does the writing, but having anon-INSERT as a
-- fallback means a single consent doesn't get lost if the function is down.
DROP POLICY IF EXISTS "clp: anon may insert consent" ON public.consent_log;
CREATE POLICY "clp: anon may insert consent"
  ON public.consent_log
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Anon may NOT read other people's consent. Service-role reads via Edge.
DROP POLICY IF EXISTS "clp: no anon read of consent" ON public.consent_log;
CREATE POLICY "clp: no anon read of consent"
  ON public.consent_log
  AS RESTRICTIVE
  FOR SELECT
  TO anon
  USING (false);

-- Anon may NOT update.
DROP POLICY IF EXISTS "clp: no anon update of consent" ON public.consent_log;
CREATE POLICY "clp: no anon update of consent"
  ON public.consent_log
  AS RESTRICTIVE
  FOR UPDATE
  TO anon
  USING (false)
  WITH CHECK (false);

-- Anon may NOT delete.
DROP POLICY IF EXISTS "clp: no anon delete of consent" ON public.consent_log;
CREATE POLICY "clp: no anon delete of consent"
  ON public.consent_log
  AS RESTRICTIVE
  FOR DELETE
  TO anon
  USING (false);

COMMIT;

-- Verification queries (run as superuser / postgres, not as anon):
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('leads','consent_log');
--
--   SELECT polname, polcmd, polroles::regrole[]
--   FROM pg_policy
--   WHERE polrelid IN ('public.leads'::regclass, 'public.consent_log'::regclass);
