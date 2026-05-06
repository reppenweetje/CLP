// Edge Function: lead-upsert
// Runtime:  Supabase Edge (Deno)
// Purpose:  Single write-path for CLP leads + consent. Service-role-key lives
//           here (server-side env vars), never in the browser bundle.
//
// Endpoint shape:
//   POST  https://<project>.supabase.co/functions/v1/lead-upsert
//   Headers:
//     Content-Type: application/json
//     Authorization: Bearer <SUPABASE_ANON_KEY>     (Supabase requires this for
//                                                    Edge Function invocation;
//                                                    it does NOT grant DB access)
//   Body:
//     { "session_id": "...", "source": "clp_dehofman", ...lead fields,
//       "consents": [{ "scope": "...", "granted": true, "detail": {...} }] }
//
// Behavior:
//   1. Validate minimal payload shape. Reject with 400 on bad input.
//   2. Upsert into public.leads keyed on (source, session_id).
//   3. Append every consent in `consents[]` to public.consent_log.
//   4. If lead temperature === 'hot' and Slack webhook is configured,
//      fire a HOTLEADS notification (best-effort, never blocks the response).
//   5. Always return JSON. On error, include a stable error code so the
//      frontend can decide whether to retry.
//
// Idempotency:
//   Multiple calls with the same (source, session_id) UPSERT a single row.
//   Consent rows are append-only by design — if the browser retries a submit,
//   you may get duplicate consent rows for the same scope. That is acceptable
//   AVG-wise (we'd rather over-record than miss).
//
// Env vars (configure in Supabase dashboard → Edge Functions → Secrets):
//   SUPABASE_URL                     (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY        (auto-provided in Edge runtime)
//   SLACK_HOTLEADS_WEBHOOK_URL       (optional — set to enable Slack alerts)
//   ALLOWED_ORIGINS                  (comma-separated, default: dehofman.clp.repp.nl,clp-xi-tan.vercel.app,localhost:5173)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { notifyHotLead } from './slack.ts'

// ── CORS ────────────────────────────────────────────────────────────────────

const DEFAULT_ALLOWED = [
  'https://dehofman.clp.repp.nl',
  'https://clp-xi-tan.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

function corsAllowed(origin: string | null): string {
  const list = (Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ALLOWED.join(','))
    .split(',').map(s => s.trim()).filter(Boolean)
  if (origin && list.includes(origin)) return origin
  return list[0] ?? '*'
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':  corsAllowed(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age':       '86400',
    'Vary':                         'Origin',
  }
}

// ── Types ───────────────────────────────────────────────────────────────────

interface ConsentEntry {
  scope: string
  granted: boolean
  privacy_statement_version?: string
  user_agent?: string
  detail?: Record<string, unknown>
}

interface LeadPayload {
  session_id:    string
  source:        string

  // Identity (any can be null while the visitor progresses through the chat)
  email?:        string | null
  first_name?:   string | null
  phone?:        string | null

  // Qualification
  persona?:              string | null
  intent_id?:            string | null
  size_id?:              string | null
  timeline_id?:          string | null
  temperature?:          string | null
  score?:                number | null
  stage?:                string | null
  status?:               string | null
  cta_variant?:          string | null
  followup?:             string | null
  afhaak_reason?:        string | null
  handoff_shown?:        boolean | null
  handoff_outcome?:      string | null
  handoff_temperature?:  string | null
  handoff_persona?:      string | null

  // Timeline
  started_at?:    string | null   // ISO 8601
  last_event_at?: string | null
  completed_at?:  string | null

  // Privacy
  privacy_statement_version?: string | null

  // Project-specific extras
  attributes?: Record<string, unknown>

  // Consent batch — every entry written to consent_log
  consents?: ConsentEntry[]
}

// ── Validation ──────────────────────────────────────────────────────────────

function validate(payload: unknown): { ok: true; data: LeadPayload } | { ok: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'payload must be a JSON object' }
  }
  const p = payload as Record<string, unknown>
  if (typeof p.session_id !== 'string' || p.session_id.length < 8) {
    return { ok: false, error: 'session_id is required and must be >= 8 chars' }
  }
  if (typeof p.source !== 'string' || p.source.length === 0) {
    return { ok: false, error: 'source is required (e.g. "clp_dehofman")' }
  }
  if (p.score !== undefined && p.score !== null && typeof p.score !== 'number') {
    return { ok: false, error: 'score must be a number or null' }
  }
  if (p.consents !== undefined && !Array.isArray(p.consents)) {
    return { ok: false, error: 'consents must be an array' }
  }
  return { ok: true, data: p as LeadPayload }
}

// ── Database ops ────────────────────────────────────────────────────────────

async function upsertLead(supa: SupabaseClient, p: LeadPayload): Promise<{ id: string | null; isNew: boolean; error: string | null }> {
  // We only send fields the caller actually provided so that we never
  // overwrite existing values with NULL on a partial update.
  const row: Record<string, unknown> = {
    session_id:    p.session_id,
    source:        p.source,
    last_event_at: p.last_event_at ?? new Date().toISOString(),
  }

  const optional: Array<keyof LeadPayload> = [
    'email', 'first_name', 'phone',
    'persona', 'intent_id', 'size_id', 'timeline_id',
    'temperature', 'score', 'stage', 'status',
    'cta_variant', 'followup', 'afhaak_reason',
    'handoff_shown', 'handoff_outcome', 'handoff_temperature', 'handoff_persona',
    'started_at', 'completed_at',
    'privacy_statement_version',
    'attributes',
  ]
  for (const k of optional) {
    if (p[k] !== undefined) row[k] = p[k]
  }

  const { data, error } = await supa
    .from('leads')
    .upsert(row, { onConflict: 'source,session_id', ignoreDuplicates: false })
    .select('id')
    .single()

  if (error) {
    return { id: null, isNew: false, error: error.message }
  }
  return { id: (data as { id: string }).id, isNew: true, error: null }
}

async function appendConsents(
  supa: SupabaseClient,
  leadId: string | null,
  p: LeadPayload,
  userAgent: string,
): Promise<{ inserted: number; error: string | null }> {
  if (!p.consents || p.consents.length === 0) return { inserted: 0, error: null }

  const rows = p.consents.map(c => ({
    session_id: p.session_id,
    lead_id:    leadId,
    source:     p.source,
    scope:      c.scope,
    granted:    !!c.granted,
    privacy_statement_version:
      c.privacy_statement_version ?? p.privacy_statement_version ?? 'unknown',
    user_agent: (c.user_agent ?? userAgent ?? '').slice(0, 200),
    detail:     c.detail ?? {},
  }))

  const { error } = await supa.from('consent_log').insert(rows)
  if (error) return { inserted: 0, error: error.message }
  return { inserted: rows.length, error: null }
}

// ── Handler ─────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const cors   = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405, cors)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_json' }, 400, cors)
  }

  const v = validate(body)
  if (!v.ok) {
    return json({ error: 'validation_failed', detail: v.error }, 400, cors)
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'server_misconfigured' }, 500, cors)
  }

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const ua = req.headers.get('user-agent') ?? ''

  const lead = await upsertLead(supa, v.data)
  if (lead.error) {
    return json({ error: 'lead_upsert_failed', detail: lead.error }, 500, cors)
  }

  const cons = await appendConsents(supa, lead.id, v.data, ua)
  if (cons.error) {
    // Lead is saved; consent failed. Return 207-ish response so frontend
    // knows the lead is fine but consent retry is needed.
    return json(
      { ok: true, lead_id: lead.id, consent_error: cons.error, consents_inserted: 0 },
      207, cors
    )
  }

  // Fire-and-forget Slack notification for hot leads. Never await its result —
  // we don't want a flaky webhook to slow down the response to the visitor.
  if (v.data.temperature === 'hot') {
    notifyHotLead(v.data, lead.id).catch(() => { /* logged in slack.ts */ })
  }

  return json(
    {
      ok: true,
      lead_id:           lead.id,
      consents_inserted: cons.inserted,
    },
    200, cors
  )
})

// ── Helpers ─────────────────────────────────────────────────────────────────

function json(payload: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
