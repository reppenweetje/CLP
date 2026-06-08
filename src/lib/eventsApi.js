// Client voor de Supabase Edge Function `clp-events-upsert` in het
// dedicated analytics-project (los van het leads-project).
//
// Dual-write architectuur: trackEvent() in analytics.js schrijft naar
// localStorage (per-browser, bestaand), Plausible (cross-device, beperkt
// query-baar) en hier — Supabase events table voor cross-device admin.
//
// Net als pushLead: lokaal queuen bij netwerkfout / 5xx, drop bij 4xx,
// flushPending op app-mount + pagehide + visibility-change-hidden.
//
// Env vars (Vercel project clp-didamdesk):
//   VITE_SUPABASE_ANALYTICS_URL         # https://xxx.supabase.co
//   VITE_SUPABASE_ANALYTICS_ANON_KEY    # publieke anon key
//   VITE_SUPABASE_ANALYTICS_ENABLED     # default: 'false'
//   VITE_CLP_SOURCE                     # default: clp_uitgifte
//                                        # → tenant via map: clp_uitgifte → 'uitgifte'

const QUEUE_KEY = 'clp-events-queue-v1'
const MAX_QUEUE = 500          // events kunnen snel oplopen, ruim cap
const MAX_BATCH = 50           // events per POST (Edge Function max is 100)
const MAX_RETRIES = 5          // per batch, daarna drop

import { project } from '../data/project.js'

// ── Config ──────────────────────────────────────────────────────────────────

function readEnv(key, fallback) {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const v = import.meta.env[key]
    if (v != null && v !== '') return v
  }
  return fallback
}

function endpoint() {
  const base = readEnv('VITE_SUPABASE_ANALYTICS_URL', '')
  if (!base) return null
  return base.replace(/\/+$/, '') + '/functions/v1/clp-events-upsert'
}

function anonKey() {
  return readEnv('VITE_SUPABASE_ANALYTICS_ANON_KEY', '')
}

function isEnabled() {
  return readEnv('VITE_SUPABASE_ANALYTICS_ENABLED', 'false') === 'true'
}

// Source-tag → tenant-naam in events-tabel. Whitelist-gevalideerd door
// Edge Function — onbekende waardes worden door de Function geweigerd.
const TENANT_MAP = {
  clp_uitgifte:    'uitgifte',
  clp_dehofman:    'dehofman',
  'Paveri BUnit':  'depaveri',
  'Elst BUnit':    'elst',
  'PIER14 BUnit':  'pier14',
}

// Source-key + tenant-string voor analytics. Volgorde:
//   1. project.crmProject (project-data is bron van waarheid)
//   2. VITE_CLP_SOURCE env-var (legacy override)
//   3. Hostname-afgeleid uit project.id (clp_<slug>)
// Zie dezelfde logica in api.js — bewust gespiegeld zodat lead-upsert
// en clp-events naar dezelfde tenant-tag verwijzen.
function resolveSource() {
  if (project?.crmProject) return project.crmProject
  const envSrc = readEnv('VITE_CLP_SOURCE', '')
  if (envSrc) return envSrc
  const id = project?.id || 'de-hofman'
  return `clp_${id.replace(/-/g, '')}`
}

function tenant() {
  return TENANT_MAP[resolveSource()] || null
}

export function isAnalyticsConfigured() {
  return isEnabled() && !!endpoint() && !!anonKey() && !!tenant()
}

// Voor admin team-mode: tenant moet altijd bekend zijn ongeacht of write
// is enabled. Lees direct uit env zonder enabled-check.
export function getTenant() {
  return tenant()
}

// ── Team-mode fetch (admin) ─────────────────────────────────────────────────

function fetchEndpoint() {
  const base = readEnv('VITE_SUPABASE_ANALYTICS_URL', '')
  if (!base) return null
  return base.replace(/\/+$/, '') + '/functions/v1/clp-events-fetch'
}

function adminReadToken() {
  return readEnv('VITE_ADMIN_READ_TOKEN', '')
}

export function isTeamFetchConfigured() {
  return !!fetchEndpoint() && !!anonKey() && !!adminReadToken() && !!tenant()
}

// Haal events uit Supabase via clp-events-fetch Edge Function en converteer
// naar het lokale event-formaat zodat buildSessions() er direct mee werkt.
// Geen date-filter hier — de caller (AdminScreen) past zelf filterByDateRange
// toe op de sessies, consistent met lokale mode.
export async function fetchTeamEvents({ tenantOverride = null, limit = 10000 } = {}) {
  if (!isTeamFetchConfigured()) {
    throw new Error('Team-mode not configured (need VITE_SUPABASE_ANALYTICS_URL + _ANON_KEY + VITE_ADMIN_READ_TOKEN + VITE_CLP_SOURCE)')
  }
  const t = tenantOverride || tenant()
  const url = new URL(fetchEndpoint())
  url.searchParams.set('tenant', t)
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${anonKey()}`,
      'apikey': anonKey(),
      'X-Admin-Token': adminReadToken(),
    },
  })
  const text = await res.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = { raw: text } }
  if (!res.ok || !body?.ok) {
    const err = new Error(`clp-events-fetch ${res.status}: ${body?.error || 'unknown'}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body.events || []
}

// Converteer Supabase clp_events rij → lokale event-shape voor buildSessions.
// Flat columns (step/persona/stage/score/etc.) worden terug in payload gezet
// zodat de bestaande aggregators (buildFunnel, buildDropoffMatrix, etc.) op
// dezelfde data werken.
export function supabaseRowToLocalEvent(row) {
  const payload = { ...(row.payload || {}) }
  if (row.step != null) payload.step = row.step
  if (row.persona != null) payload.persona = row.persona
  if (row.stage != null) payload.stage = row.stage
  if (row.temperature != null) payload.temperature = row.temperature
  if (typeof row.score === 'number') payload.score = row.score
  if (row.cta_variant != null) payload.ctaVariant = row.cta_variant
  if (row.copy_variant != null) payload.copyVariant = row.copy_variant
  return {
    id: String(row.id),
    sessionId: row.session_id,
    timestamp: new Date(row.created_at).getTime(),
    type: row.event_type,
    payload,
  }
}

// ── HTTP ────────────────────────────────────────────────────────────────────

async function postBatch(events, signal) {
  const url = endpoint()
  const key = anonKey()
  const t = tenant()
  if (!url || !key) {
    throw new Error('clp-events-upsert endpoint not configured')
  }
  if (!t) {
    throw new Error('unknown tenant (VITE_CLP_SOURCE not in TENANT_MAP)')
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'apikey': key,
    },
    body: JSON.stringify({ tenant: t, events }),
    signal,
  })
  const text = await res.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = { raw: text } }
  if (!res.ok) {
    const err = new Error(`clp-events-upsert ${res.status}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body
}

// Probeert direct te flushen. Bij fout: queue + retry-later.
export async function pushEvent(event) {
  if (!isEnabled()) {
    return { ok: true, queued: false, skipped: true }
  }
  // Buffer-strategie: queue altijd, flush async in batches. Voorkomt dat
  // elke trackEvent een netwerkrequest doet — efficiënter en minder ruis
  // in de network-tab voor debugging.
  enqueue(event)
  return { ok: true, queued: true }
}

// ── localStorage queue ──────────────────────────────────────────────────────

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

function enqueue(event) {
  const q = readQueue()
  q.push({ event, attempts: 0, queuedAt: Date.now() })
  writeQueue(q)
}

export function pendingEventsCount() {
  return readQueue().length
}

// Flush in batches. Stopt bij eerste batch-fail (rest blijft voor next flush).
// Aanroepen bij: app-mount, 'online' event, 'pagehide', 'visibilitychange:hidden',
// of via timer (5s in App.jsx).
export async function flushPendingEvents() {
  if (!isEnabled()) return { flushed: 0, remaining: readQueue().length, skipped: true }
  const items = readQueue()
  if (items.length === 0) return { flushed: 0, remaining: 0 }

  const remaining = []
  let flushed = 0
  let cursor = 0

  while (cursor < items.length) {
    const slice = items.slice(cursor, cursor + MAX_BATCH)
    const events = slice.map((it) => it.event)
    try {
      await postBatch(events)
      flushed += slice.length
      cursor += slice.length
    } catch (err) {
      // 4xx: drop deze batch (slechte payload)
      if (err.status && err.status >= 400 && err.status < 500) {
        console.warn('[eventsApi] dropping batch, server rejected', err.body)
        cursor += slice.length
        continue
      }
      // Retry-pad: increment attempts, behoud in queue
      for (const it of slice) {
        if (it.attempts + 1 >= MAX_RETRIES) {
          console.warn('[eventsApi] dropping event after max retries', it)
        } else {
          remaining.push({ ...it, attempts: it.attempts + 1 })
        }
      }
      // Resterende items (na deze gefaalde batch) ook bewaren — anders
      // raken we ze kwijt bij netwerk-uitval halverwege flush
      remaining.push(...items.slice(cursor + slice.length))
      writeQueue(remaining)
      return { flushed, remaining: remaining.length }
    }
  }

  writeQueue(remaining)
  return { flushed, remaining: remaining.length }
}

// Voor admin/debug-paneel.
export function inspectEventsQueue() {
  return readQueue()
}

export function clearEventsQueue() {
  writeQueue([])
}

// ── Auto-flush helpers (in App.jsx aan te roepen) ───────────────────────────

// Hook deze in App.jsx als:
//   useEffect(() => attachEventsAutoFlush(), [])
export function attachEventsAutoFlush() {
  if (typeof window === 'undefined' || !isEnabled()) return () => {}

  const FLUSH_INTERVAL_MS = 5000
  let timer = null

  const flush = () => { flushPendingEvents().catch(() => {}) }

  // 1. Initial flush bij mount
  flush()

  // 2. Periodic flush
  timer = setInterval(flush, FLUSH_INTERVAL_MS)

  // 3. Flush bij online-event (na netwerk-recovery)
  const onOnline = () => flush()
  window.addEventListener('online', onOnline)

  // 4. Flush bij pagehide / visibility-change-hidden (laatste kans voor laden)
  const onHide = () => {
    // Synchronous queue-write naar localStorage is al gedaan bij enqueue;
    // hier proberen we de actieve queue nog mee te krijgen
    flush()
  }
  window.addEventListener('pagehide', onHide)
  const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    if (timer) clearInterval(timer)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('pagehide', onHide)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
