// Edge Function: portal-event
//
// Schrijft een per-lead gedragsevent naar de `lead_events`-tabel. Wordt
// aangeroepen door de portal (dehofman.nl) via de same-origin route
// `/api/track`, die het HttpOnly `dh_session`-cookie server-side uitleest
// en de `session_token` hier naartoe forwardt.
//
// Waarom een edge function ipv direct vanuit de Next-route in Supabase
// schrijven? De portal heeft alleen de anon-key; inserts in lead_events
// (gekoppeld aan een willekeurig lead_id) moeten via de service role
// zodat de client dit niet kan vervalsen. Dezelfde scheiding als
// portal-resolve / lead-upsert.
//
// Flow:
//   1. Valideer event_name tegen de vaste whitelist (zelfde 10 als lib/track.ts).
//   2. Resolve session_token -> lead via leads.session_token (met verloop-check).
//   3. Insert { lead_id, session_id, project, event_name, props } in lead_events.
//
// Geen geldige/actieve sessie -> stille no-op ({ ok: true, logged: false }).
// Zo blokkeert tracking nooit de UX en lekt het geen leadbestaan.
//
// Endpoint shape:
//   POST https://<project>.supabase.co/functions/v1/portal-event
//   Body: { session_token: string, event_name: string, props?: object, project?: string }
//   Response (200): { ok: true, logged: boolean }
//
// Secrets nodig:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const DEFAULT_ALLOWED = [
  'https://dehofman.nl',
  'https://www.dehofman.nl',
  'https://projectportal.vercel.app',
  'http://localhost:3000',
]

const VERCEL_PREVIEW_REGEX = /^https:\/\/[a-z0-9-]+-repp-1bdaee61\.vercel\.app$/

// Vaste event-whitelist — 1-op-1 met EventName in projectportal/lib/track.ts.
// Onbekende namen worden geweigerd zodat de tabel niet vervuilt.
const ALLOWED_EVENTS = new Set<string>([
  'reservation_started',
  'reservation_submitted',
  'interest_captured',
  'insider_signed_up',
  'xxl_interest',
  'report_requested',
  'document_opened',
  'unit_favorited',
  'calculator_completed',
  'cta_clicked',
])

// Props-guard: max grootte zodat een client de tabel niet kan volpompen.
const MAX_PROPS_BYTES = 4_000

function corsAllowed(origin: string | null): string {
  const fromEnv = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const list = Array.from(new Set([...DEFAULT_ALLOWED, ...fromEnv]))
  if (origin && (list.includes(origin) || VERCEL_PREVIEW_REGEX.test(origin))) return origin
  return list[0] ?? '*'
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': corsAllowed(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

function json(payload: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

function sanitizeProps(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  try {
    const s = JSON.stringify(input)
    if (s.length > MAX_PROPS_BYTES) return {}
    return JSON.parse(s) as Record<string, unknown>
  } catch {
    return {}
  }
}

interface LeadSessionRow {
  id: string
  session_id: string | null
}

async function resolveLead(sessionToken: string): Promise<LeadSessionRow | null> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    console.warn('[portal-event] SUPABASE env ontbreekt')
    return null
  }
  const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supa
    .from('leads')
    .select('id, session_id, session_expires_at')
    .eq('session_token', sessionToken)
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[portal-event] lead lookup failed', error.message)
    return null
  }
  if (!data) return null
  // Verloop-check: verlopen sessie telt niet als ingelogd.
  const exp = (data as { session_expires_at: string | null }).session_expires_at
  if (exp && new Date(exp).getTime() < Date.now()) return null
  return { id: (data as { id: string }).id, session_id: (data as { session_id: string | null }).session_id }
}

async function insertEvent(
  lead: LeadSessionRow,
  eventName: string,
  props: Record<string, unknown>,
  project: string,
): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return false
  const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await supa.from('lead_events').insert({
    lead_id: lead.id,
    session_id: lead.session_id,
    project,
    event_name: eventName,
    props,
  })
  if (error) {
    console.error('[portal-event] insert failed', error.message)
    return false
  }
  return true
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_json' }, 400, cors)
  }
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>

  const sessionToken = typeof b.session_token === 'string' ? b.session_token.trim() : ''
  const eventName = typeof b.event_name === 'string' ? b.event_name.trim() : ''
  const project = typeof b.project === 'string' && b.project.trim() ? b.project.trim() : 'de-hofman'
  const props = sanitizeProps(b.props)

  if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
    return json({ error: 'invalid_event' }, 400, cors)
  }
  // Geen sessie meegegeven -> stille no-op, geen fout. Uitgelogde bezoeker.
  if (!sessionToken || sessionToken.length < 16) {
    return json({ ok: true, logged: false }, 200, cors)
  }

  const lead = await resolveLead(sessionToken)
  if (!lead) {
    // Sessie onbekend/verlopen: niet loggen, maar ook geen fout naar de UX.
    return json({ ok: true, logged: false }, 200, cors)
  }

  const logged = await insertEvent(lead, eventName, props, project)
  return json({ ok: true, logged }, 200, cors)
})
