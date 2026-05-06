// Client voor de Supabase Edge Function `lead-upsert`.
// NOG NIET wired — bestaat klaar zodat we 'm in App.jsx kunnen importeren
// zodra Tharwat de keys aanlevert. Tot die tijd verandert de bestaande
// localStorage-only flow niets.
//
// Wiring (later, in App.jsx):
//   import { pushLead, flushPending } from './lib/api.js'
//   ...
//   // bij finishLead() of na elke significante state-change:
//   pushLead({ session, lead, answers })
//   ...
//   // bij app-mount:
//   flushPending()
//
// Env vars (zet in .env.local + Vercel project settings):
//   VITE_SUPABASE_URL                    # https://xxx.supabase.co
//   VITE_SUPABASE_ANON_KEY               # publieke anon key (geen service-role!)
//   VITE_LEAD_UPSERT_PATH                # default: /functions/v1/lead-upsert
//   VITE_CLP_SOURCE                      # default: clp_dehofman
//
// Zie ../../supabase/functions/lead-upsert/index.ts voor het server-contract.

import { PRIVACY_STATEMENT_VERSION } from './consent.js'

const QUEUE_KEY = 'clp-lead-queue-v1'
const MAX_QUEUE = 50          // hard cap zodat localStorage niet vol loopt
const MAX_RETRIES = 5         // per item — daarna gooi 'm weg

// ── Config ──────────────────────────────────────────────────────────────────

function readEnv(key, fallback) {
  // Vite injecteert env-vars die met VITE_ beginnen op `import.meta.env`.
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const v = import.meta.env[key]
    if (v != null && v !== '') return v
  }
  return fallback
}

function endpoint() {
  const base = readEnv('VITE_SUPABASE_URL', '')
  const path = readEnv('VITE_LEAD_UPSERT_PATH', '/functions/v1/lead-upsert')
  if (!base) return null
  return base.replace(/\/+$/, '') + path
}

function anonKey() {
  return readEnv('VITE_SUPABASE_ANON_KEY', '')
}

function source() {
  return readEnv('VITE_CLP_SOURCE', 'clp_dehofman')
}

export function isApiConfigured() {
  return !!endpoint() && !!anonKey()
}

// ── Payload-builder ─────────────────────────────────────────────────────────

// Neemt een session-object zoals analytics.getSessions() teruggeeft, plus
// optioneel een verse lead-snapshot uit App.jsx, en produceert het
// Edge-Function payload-formaat.
//
// `session` shape (zie src/lib/analytics.js getSessions):
//   { sessionId, events, startedAt, lastEventAt, completed,
//     persona, lead: {firstName, email, phone}, ctaVariant,
//     stage, followup, afhaakReason, handoffShown, handoffOutcome,
//     handoffTemperature, handoffPersona }
//
// `extras` mag bevatten:
//   { score, temperature, intent_id, size_id, timeline_id, attributes,
//     consents: [{ scope, granted, detail, privacy_statement_version }] }
export function buildLeadPayload(session, extras = {}) {
  if (!session || !session.sessionId) {
    throw new Error('buildLeadPayload: session.sessionId is required')
  }
  const lead = session.lead ?? {}
  const payload = {
    session_id: session.sessionId,
    source:     source(),

    email:      lead.email ?? null,
    first_name: lead.firstName ?? null,
    phone:      lead.phone ?? null,

    persona:             session.persona ?? null,
    intent_id:           extras.intent_id ?? null,
    size_id:             extras.size_id ?? null,
    timeline_id:         extras.timeline_id ?? null,
    temperature:         extras.temperature ?? session.handoffTemperature ?? null,
    score:               extras.score ?? null,
    stage:               session.stage ?? null,
    status:              extras.status ?? (session.completed ? 'completed' : 'in_progress'),
    cta_variant:         session.ctaVariant ?? null,
    followup:            session.followup ?? null,
    afhaak_reason:       session.afhaakReason ?? null,
    handoff_shown:       !!session.handoffShown,
    handoff_outcome:     session.handoffOutcome ?? null,
    handoff_temperature: session.handoffTemperature ?? null,
    handoff_persona:     session.handoffPersona ?? null,

    started_at:    session.startedAt ? new Date(session.startedAt).toISOString() : null,
    last_event_at: session.lastEventAt ? new Date(session.lastEventAt).toISOString() : null,
    completed_at:  session.completed && session.lastEventAt
      ? new Date(session.lastEventAt).toISOString()
      : null,

    privacy_statement_version: PRIVACY_STATEMENT_VERSION,
    attributes: extras.attributes ?? {},

    consents: (extras.consents ?? []).map(c => ({
      scope:    c.scope,
      granted:  !!c.granted,
      privacy_statement_version: c.privacy_statement_version ?? PRIVACY_STATEMENT_VERSION,
      detail:   c.detail ?? {},
    })),
  }
  return payload
}

// ── Push (network + queue) ──────────────────────────────────────────────────

async function postRaw(payload, signal) {
  const url = endpoint()
  const key = anonKey()
  if (!url || !key) {
    throw new Error('lead-upsert endpoint not configured (set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)')
  }
  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${key}`,
      'apikey':        key,
    },
    body:    JSON.stringify(payload),
    signal,
  })
  const text = await res.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = { raw: text } }
  if (!res.ok) {
    const err = new Error(`lead-upsert ${res.status}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body
}

// Probeert direct te pushen. Bij netwerkfout of 5xx → fallback naar queue.
// Bij 4xx → niet retryen (slechte payload), gooi error door.
export async function pushLead(payloadOrSession, extras) {
  const payload = payloadOrSession?.session_id
    ? payloadOrSession
    : buildLeadPayload(payloadOrSession, extras)
  try {
    const res = await postRaw(payload)
    return { ok: true, queued: false, result: res }
  } catch (err) {
    if (err.status && err.status >= 400 && err.status < 500) {
      // Echte validatiefout — niet queuen, frontend mag tonen wat er mis is.
      return { ok: false, queued: false, error: err.body ?? err.message, status: err.status }
    }
    enqueue(payload)
    return { ok: false, queued: true, error: err.message }
  }
}

// ── localStorage queue (offline-tolerant) ───────────────────────────────────

function readQueue() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function writeQueue(items) {
  if (typeof window === 'undefined') return
  try {
    const capped = items.length > MAX_QUEUE ? items.slice(-MAX_QUEUE) : items
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(capped))
  } catch {}
}

function enqueue(payload) {
  const q = readQueue()
  q.push({ payload, attempts: 0, queuedAt: Date.now() })
  writeQueue(q)
}

export function pendingCount() {
  return readQueue().length
}

// Retry alle items in de queue. Returnt aantal succesvol geflushte items.
// Aanroepen bij: app-mount, na window 'online' event, na succesvolle push.
export async function flushPending() {
  const items = readQueue()
  if (items.length === 0) return { flushed: 0, remaining: 0 }
  const remaining = []
  let flushed = 0
  for (const item of items) {
    if (item.attempts >= MAX_RETRIES) {
      // Geef op — log één keer en gooi weg.
      console.warn('[api] dropping lead after max retries', item)
      continue
    }
    try {
      await postRaw(item.payload)
      flushed += 1
    } catch (err) {
      if (err.status && err.status >= 400 && err.status < 500) {
        console.warn('[api] dropping lead — server rejected payload', err.body)
        continue
      }
      remaining.push({ ...item, attempts: item.attempts + 1 })
    }
  }
  writeQueue(remaining)
  return { flushed, remaining: remaining.length }
}

// Voor admin/debug-paneel.
export function inspectQueue() {
  return readQueue()
}

export function clearQueue() {
  writeQueue([])
}
