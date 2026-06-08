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
import { project } from '../data/project.js'

const QUEUE_KEY = 'clp-lead-queue-v1'
const MAX_QUEUE = 50          // hard cap zodat localStorage niet vol loopt
const MAX_RETRIES = 5         // per item, daarna gooi 'm weg

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

// Source-key voor lead-tagging in Supabase + n8n routing + CRM project field
// + gemini-followup prompt-selectie. Volgorde:
//   1. project.crmProject (project-data is bron van waarheid — bv. "Paveri BUnit")
//   2. VITE_CLP_SOURCE env-var (legacy override, alleen voor edge cases)
//   3. Hostname-afgeleide fallback (project.id → clp_<slug>)
//
// Cruciaal voor hostname-aware routing: dehofman.clp.repp.nl en
// depaveri.clp.repp.nl delen één Vercel-project (en dus één env-var),
// dus de hostname-afleiding via project.crmProject is wat ze uit elkaar
// trekt. Zonder dit zouden Paveri-leads ten onrechte als clp_dehofman
// binnenkomen in n8n + Brevo + de Gemini-prompt.
function source() {
  if (project?.crmProject) return project.crmProject
  const envSrc = readEnv('VITE_CLP_SOURCE', '')
  if (envSrc) return envSrc
  const id = project?.id || 'de-hofman'
  return `clp_${id.replace(/-/g, '')}`
}

// Master-switch om de Supabase-koppeling per Vercel-environment te kunnen
// flippen zonder rebuild. Gebruik:
//   VITE_SUPABASE_ENABLED=false → calls worden geskipped, retourneert
//                                  { ok: true, queued: false, skipped: true }
//   VITE_SUPABASE_ENABLED=true  → normale push naar Edge Function
//
// Standaard 'false' zodat een nieuwe deploy nooit per ongeluk lead-data naar
// een mis-geconfigureerde Supabase stuurt. Activeren is een bewuste keuze.
function isEnabled() {
  return readEnv('VITE_SUPABASE_ENABLED', 'false') === 'true'
}

export function isApiConfigured() {
  return isEnabled() && !!endpoint() && !!anonKey()
}

// ── Dual-write naar clp-analytics (admin-zicht) ─────────────────────────────
//
// Naast de reppbot-push hieronder ook een fire-and-forget kopie naar de
// gedeelde clp-analytics, zodat het admin-dashboard De Hofman-leads ziet
// in de Registraties-sectie via clp-leads-fetch. Reppbot blijft canoniek
// voor de bot (gemini-followup, outbound, portal); de analytics-kopie is
// alleen voor visueel overzicht in /admin. Onafhankelijk gegated van de
// reppbot-flag zodat je 'm los kunt aan- of uitzetten via een eigen env.

function analyticsEndpoint() {
  const base = readEnv('VITE_SUPABASE_ANALYTICS_URL', '')
  if (!base) return null
  return base.replace(/\/+$/, '') + '/functions/v1/clp-leads-upsert'
}

function analyticsAnonKey() {
  return readEnv('VITE_SUPABASE_ANALYTICS_ANON_KEY', '')
}

function isAnalyticsEnabled() {
  return readEnv('VITE_SUPABASE_ANALYTICS_ENABLED', 'false') === 'true'
}

// Spiegelt clp-didamdesk's buildLeadPayload (clp-leads-upsert contract).
// Reppbot's lead-upsert hieronder heeft een rijker schema met intent_id /
// size_id / etc top-level; clp-leads-upsert kent slechts een slankere set
// kolommen en propt de rest in attributes-jsonb.
function buildAnalyticsPayload(session, extras = {}) {
  if (!session || !session.sessionId) return null
  const lead = session.lead ?? {}
  // Quiz-antwoorden mee in attributes, zonder de lead-PII die er via
  // answers.lead in zit (e-mail/telefoon staan al in de eigen kolommen).
  const { lead: _omitLeadPII, ...answersNoPII } = session.answers ?? {}

  const attributes = {
    ...(extras.attributes ?? {}),
    project:             session.project ?? null,
    answers:             answersNoPII,
    intent_id:           extras.intent_id ?? null,
    size_id:             extras.size_id ?? null,
    timeline_id:         extras.timeline_id ?? null,
    cta_variant:         session.ctaVariant ?? null,
    handoff_shown:       session.handoffShown ?? null,
    handoff_temperature: session.handoffTemperature ?? null,
    handoff_persona:     session.handoffPersona ?? null,
  }

  return {
    session_id: session.sessionId,
    source:     source(),

    email:      lead.email ?? null,
    first_name: lead.firstName ?? null,
    phone:      lead.phone ?? null,

    persona:         session.persona ?? null,
    stage:           session.stage ?? null,
    temperature:     extras.temperature ?? session.temperature ?? session.handoffTemperature ?? null,
    score:           extras.score ?? session.score ?? null,
    status:          extras.status ?? session.status ?? (session.completed ? 'completed' : 'in_progress'),
    followup:        session.followup ?? null,
    afhaak_reason:   session.afhaakReason ?? null,
    handoff_outcome: session.handoffOutcome ?? null,

    started_at:    session.startedAt ? new Date(session.startedAt).toISOString() : null,
    last_event_at: session.lastEventAt ? new Date(session.lastEventAt).toISOString() : null,
    completed_at:  session.completed
      ? new Date(session.lastEventAt ?? Date.now()).toISOString()
      : null,

    privacy_statement_version: PRIVACY_STATEMENT_VERSION,
    attributes,

    consents: (extras.consents ?? []).map(c => ({
      scope:    c.scope,
      granted:  !!c.granted,
      privacy_statement_version: c.privacy_statement_version ?? PRIVACY_STATEMENT_VERSION,
      detail:   c.detail ?? {},
    })),
  }
}

async function pushAnalyticsCopy(payloadOrSession, extras) {
  if (!isAnalyticsEnabled()) return
  const url = analyticsEndpoint()
  const key = analyticsAnonKey()
  if (!url || !key) return

  // Als de caller al een snake_case payload meegaf (consent.js style),
  // hergebruik 'm. Anders bouw van de session-shape.
  const payload = payloadOrSession?.session_id
    ? payloadOrSession
    : buildAnalyticsPayload(payloadOrSession, extras)
  if (!payload) return

  // Best-effort: geen queue, geen retry. Bot heeft de lead canoniek in
  // reppbot. Een gemiste analytics-kopie betekent alleen dat die ene lead
  // niet in /admin Registraties verschijnt; niet kritiek.
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
        'apikey':        key,
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // swallow
  }
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
  // Dual-write naar clp-analytics (admin-zicht). Fire-and-forget, parallel
  // aan de reppbot-push hieronder. Onafhankelijk gegated via
  // VITE_SUPABASE_ANALYTICS_ENABLED.
  pushAnalyticsCopy(payloadOrSession, extras).catch(() => {})

  // Feature-flag uit: doe niets, retourneer skipped. Frontend ziet dit als
  // succes (geen error-state) — chat-ervaring blijft identiek aan localStorage-
  // only mode. Wordt geskipped zonder ook maar een fetch te doen.
  if (!isEnabled()) {
    return { ok: true, queued: false, skipped: true }
  }
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
  // Feature-flag uit: queue wordt niet leeggetrokken want de Edge Function
  // is sowieso niet beschikbaar. Bij later-flippen van de flag kan een
  // achterstand alsnog worden opgehaald — items blijven in localStorage.
  if (!isEnabled()) return { flushed: 0, remaining: readQueue().length, skipped: true }
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
        console.warn('[api] dropping lead, server rejected payload', err.body)
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

// ── Team-mode fetch voor admin Registraties-sectie ──────────────────────────
//
// Leest clp_leads-rijen uit clp-analytics via clp-leads-fetch Edge Function,
// gefilterd op de eigen tenant. clp_leads bevat PII en is RLS-locked —
// alleen via de service-role Edge Function gepoort achter X-Admin-Token.
// Toont dus de dual-write kopieën die pushAnalyticsCopy hierboven schrijft.

// Source-key → admin-tenant. Sleutels moeten matchen met de source() output.
// "Paveri BUnit" met spatie is bewust — dat is de officiële CRM-project-naam
// bij Tharwat, niet een technische slug.
const SOURCE_TO_TENANT = {
  clp_dehofman:    'dehofman',
  'Paveri BUnit':  'depaveri',
  'Elst BUnit':    'elst',
  'PIER14 BUnit':  'pier14',
  clp_uitgifte:    'uitgifte',
}

function leadsFetchEndpoint() {
  const base = readEnv('VITE_SUPABASE_ANALYTICS_URL', '')
  if (!base) return null
  return base.replace(/\/+$/, '') + '/functions/v1/clp-leads-fetch'
}

function adminReadToken() {
  return readEnv('VITE_ADMIN_READ_TOKEN', '')
}

function leadsFetchTenant() {
  return SOURCE_TO_TENANT[source()] || null
}

export function isLeadsFetchConfigured() {
  return !!leadsFetchEndpoint()
    && !!analyticsAnonKey()
    && !!adminReadToken()
    && !!leadsFetchTenant()
}

export async function fetchTeamLeads({ tenantOverride = null, limit = 5000, includeArchived = false } = {}) {
  if (!isLeadsFetchConfigured()) {
    throw new Error('Leads-fetch niet geconfigureerd (VITE_SUPABASE_ANALYTICS_URL + _ANON_KEY + VITE_ADMIN_READ_TOKEN + VITE_CLP_SOURCE)')
  }
  const t = tenantOverride || leadsFetchTenant()
  const url = new URL(leadsFetchEndpoint())
  url.searchParams.set('tenant', t)
  url.searchParams.set('limit', String(limit))
  if (includeArchived) url.searchParams.set('include_archived', 'true')

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${analyticsAnonKey()}`,
      'apikey':        analyticsAnonKey(),
      'X-Admin-Token': adminReadToken(),
    },
  })
  const text = await res.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = { raw: text } }
  if (!res.ok || !body?.ok) {
    const err = new Error(`clp-leads-fetch ${res.status}: ${body?.error || 'unknown'}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body.leads || []
}

// =============================================================================
// Mini-CRM mutaties op clp_leads (status, notities, archief).
//
// Spiegelt fetchTeamLeads qua auth (X-Admin-Token + analytics anon-JWT). Edge
// function clp-leads-update accepteert action + lead_id + payload. Bij elke
// mutatie krijgen we de hele bijgewerkte rij terug zodat de UI optimistisch
// kan updaten zonder hertegelijke fetch.
// =============================================================================

function leadsUpdateEndpoint() {
  const base = readEnv('VITE_SUPABASE_ANALYTICS_URL', '')
  if (!base) return null
  return base.replace(/\/+$/, '') + '/functions/v1/clp-leads-update'
}

export function isLeadsUpdateConfigured() {
  return !!leadsUpdateEndpoint()
    && !!analyticsAnonKey()
    && !!adminReadToken()
    && !!leadsFetchTenant()
}

async function callLeadsUpdate(leadId, action, payload = null, { tenantOverride = null } = {}) {
  if (!isLeadsUpdateConfigured()) {
    throw new Error('Leads-update niet geconfigureerd (zelfde env als leads-fetch)')
  }
  const tenant = tenantOverride || leadsFetchTenant()
  const res = await fetch(leadsUpdateEndpoint(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${analyticsAnonKey()}`,
      'apikey':        analyticsAnonKey(),
      'X-Admin-Token': adminReadToken(),
      'content-type':  'application/json',
    },
    body: JSON.stringify({ tenant, lead_id: leadId, action, payload }),
  })
  const text = await res.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = { raw: text } }
  if (!res.ok || !body?.ok) {
    const err = new Error(`clp-leads-update ${res.status}: ${body?.error || 'unknown'}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body.lead
}

export function setLeadStatus(leadId, status, opts) {
  return callLeadsUpdate(leadId, 'set_status', { status }, opts)
}
export function addLeadNote(leadId, text, opts) {
  return callLeadsUpdate(leadId, 'add_note', { text }, opts)
}
export function deleteLeadNote(leadId, noteId, opts) {
  return callLeadsUpdate(leadId, 'delete_note', { note_id: noteId }, opts)
}
export function archiveLead(leadId, opts) {
  return callLeadsUpdate(leadId, 'archive', null, opts)
}
export function restoreLead(leadId, opts) {
  return callLeadsUpdate(leadId, 'restore', null, opts)
}

// CRM-status constanten — hou in sync met de constraint in clp_leads en
// met ALLOWED_STATUSES in clp-leads-update edge function.
//
// REPP sales-flow: nieuw → terugbellen → gesproken → lead / long_term / afgewezen
// Bij status 'rejected' wordt de lead automatisch gearchiveerd (afgewezen
// ≡ gearchiveerd in REPP-flow), afgehandeld in de edge function.
export const CRM_STATUS_LIST = ['new', 'callback', 'spoken', 'lead', 'long_term', 'rejected']
export const CRM_STATUS_LABEL = {
  new:       'Nieuw',
  callback:  'Terugbellen',
  spoken:    'Gesproken',
  lead:      'Lead',
  long_term: 'Long term lead',
  rejected:  'Afgewezen',
}
export const CRM_STATUS_TONE = {
  new:       'bg-canvas-2 text-ink-soft border-mist',
  callback:  'bg-amber-50 text-amber-800 border-amber-200',
  spoken:    'bg-blue-50 text-blue-800 border-blue-200',
  lead:      'bg-emerald-50 text-emerald-800 border-emerald-200',
  long_term: 'bg-violet-50 text-violet-800 border-violet-200',
  rejected:  'bg-rose-50 text-rose-800 border-rose-200',
}
// Welke statussen archiveren auto (zelfde set als in edge function).
// Frontend gebruikt dit voor de "verdwijnt uit deze view" hint in de
// dropdown zodat de gebruiker niet verrast wordt.
export const CRM_STATUS_AUTO_ARCHIVE = new Set(['rejected'])
