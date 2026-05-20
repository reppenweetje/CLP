// Event-store voor de CLP demo. Alle events worden in localStorage opgeslagen
// onder clp-events-v1. Een sessie krijgt een uuid bij start van een chat
// en wordt geclearet als de demo opnieuw begint.
//
// Productie-flow: trackEvent schrijft naar localStorage (eigen admin/funnel)
// EN forwardt naar Plausible Pro voor cross-session populatie-analyse. PII
// wordt door safeProps() in plausible.js weggefilterd zodat alleen veilige
// flow-attributen (persona, intent_id, size_id, timeline_id, stage,
// temperature, score, ctaVariant, label, choice, outcome) doorgaan.

import { plausibleEvent } from './plausible.js'
import { isTrackingSuppressed } from './ipExclusion.js'
import { pushEvent as pushSupabaseEvent, isAnalyticsConfigured } from './eventsApi.js'

const EVENTS_KEY = 'clp-events-v1'
const SESSION_KEY = 'clp-session-id'

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'x' + Math.random().toString(16).slice(2) + Date.now().toString(16)
}

function safeRead(key) {
  if (typeof window === 'undefined') return null
  try { return window.localStorage.getItem(key) } catch { return null }
}

function safeWrite(key, value) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(key, value) } catch {}
}

function safeRemove(key) {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(key) } catch {}
}

export function startNewSession() {
  const id = uuid()
  safeWrite(SESSION_KEY, id)
  return id
}

export function getSessionId() {
  return safeRead(SESSION_KEY) || startNewSession()
}

// Auto-injecteert sessie-level props (copyVariant + ctaVariant) op elk
// event zodat Plausible kan filteren zonder dat elke call-site die props
// expliciet hoeft mee te geven. Variant-keys zijn sticky in localStorage,
// dus dezelfde bezoeker → dezelfde variant in elke event.
function autoSessionProps() {
  if (typeof window === 'undefined') return {}
  try {
    const out = {}
    const copy = window.localStorage.getItem('clp-variant')
    if (copy === 'a' || copy === 'b') out.copyVariant = copy
    const cta  = window.localStorage.getItem('clp-cta-variant')
    if (cta) out.ctaVariant = cta
    return out
  } catch { return {} }
}

// Mapt het lokale event-formaat naar de clp_events tabel-structuur:
// flat-columns voor query-bare velden + rest van payload als JSONB.
// Wordt alleen aangeroepen als VITE_SUPABASE_ANALYTICS_ENABLED='true'.
function toSupabaseEvent(localEvent) {
  const p = localEvent.payload || {}
  const flatKeys = new Set([
    'step', 'currentQuestion', 'persona', 'stage', 'temperature',
    'score', 'ctaVariant', 'copyVariant',
  ])
  const restPayload = {}
  for (const [k, v] of Object.entries(p)) {
    if (!flatKeys.has(k)) restPayload[k] = v
  }
  return {
    session_id:   localEvent.sessionId,
    event_type:   localEvent.type,
    step:         p.step ?? p.currentQuestion ?? null,
    persona:      p.persona ?? null,
    stage:        p.stage ?? null,
    temperature:  p.temperature ?? null,
    score:        typeof p.score === 'number' ? p.score : null,
    cta_variant:  p.ctaVariant ?? null,
    copy_variant: p.copyVariant ?? null,
    url_path:     (typeof window !== 'undefined') ? window.location.pathname : null,
    payload:      restPayload,
  }
}

export function trackEvent(type, payload = {}) {
  // IP-uitsluiting: REPP-team-traffic mag analytics niet vervuilen.
  // Skip ALLES — geen localStorage write, geen Plausible forward, geen Supabase.
  if (isTrackingSuppressed()) return null

  const events = loadEvents()
  const enriched = { ...autoSessionProps(), ...payload }
  const event = {
    id: uuid(),
    sessionId: getSessionId(),
    timestamp: Date.now(),
    type,
    payload: enriched,
  }
  events.push(event)
  // cap op 5000 events om localStorage niet vol te laten lopen
  const capped = events.length > 5000 ? events.slice(-5000) : events
  safeWrite(EVENTS_KEY, JSON.stringify(capped))
  // Forward naar Plausible voor cross-session funnel-analyse. PII wordt
  // weggefilterd in safeProps() — zie src/lib/plausible.js.
  plausibleEvent(type, enriched)
  // Forward naar Supabase clp_events tabel via batched queue. No-op als
  // VITE_SUPABASE_ANALYTICS_ENABLED='false'. Queue flushed door
  // attachEventsAutoFlush() in App.jsx (timer + pagehide + online).
  if (isAnalyticsConfigured()) {
    try { pushSupabaseEvent(toSupabaseEvent(event)) } catch (err) {
      console.warn('[analytics] supabase event push failed', err)
    }
  }
  return event
}

export function loadEvents() {
  const raw = safeRead(EVENTS_KEY)
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

export function clearAllEvents() {
  safeRemove(EVENTS_KEY)
  safeRemove(SESSION_KEY)
}

// Aggregeert events per sessie en haalt metadata eruit voor de admin view.
export function getSessions() {
  const events = loadEvents()
  const bySession = new Map()
  for (const ev of events) {
    if (!bySession.has(ev.sessionId)) bySession.set(ev.sessionId, [])
    bySession.get(ev.sessionId).push(ev)
  }
  const out = []
  for (const [sid, evs] of bySession) {
    evs.sort((a, b) => a.timestamp - b.timestamp)
    const completed = evs.some((e) => e.type === 'flow:complete')
    const lead = extractLead(evs)
    out.push({
      sessionId: sid,
      events: evs,
      startedAt: evs[0].timestamp,
      lastEventAt: evs[evs.length - 1].timestamp,
      duration: evs[evs.length - 1].timestamp - evs[0].timestamp,
      completed,
      abandoned: !completed,
      lastStep: evs[evs.length - 1].type,
      persona: evs.find((e) => e.type === 'intent:answered')?.payload?.persona || 'onbekend',
      lead,
      ctaVariant: evs.find((e) => e.type === 'intro:cta-clicked')?.payload?.variant,
      stage: evs.find((e) => e.type === 'flow:complete')?.payload?.stage,
      followup: evs.find((e) => e.type === 'followup:answered')?.payload?.label,
      afhaakReason: evs.find((e) => e.type === 'afhaak-reason:answered')?.payload?.label,
      handoffShown: evs.some((e) => e.type === 'warm-handoff:shown'),
      handoffOutcome: evs.find((e) => e.type?.startsWith('warm-handoff:') && e.type !== 'warm-handoff:shown')?.type?.replace('warm-handoff:', '') || null,
      handoffTemperature: evs.find((e) => e.type === 'warm-handoff:shown')?.payload?.temperature || null,
      handoffPersona: evs.find((e) => e.type === 'warm-handoff:shown')?.payload?.persona || null,
    })
  }
  return out.sort((a, b) => b.startedAt - a.startedAt)
}

function extractLead(events) {
  const email = events.find((e) => e.type === 'lead-email:submitted')?.payload?.email
  const name = events.find((e) => e.type === 'lead-name:submitted')?.payload?.firstName
  const phone = events.find((e) => e.type === 'lead-phone:submitted')?.payload?.phone
  return { email, name, phone }
}

// De volgorde van funnel-stappen die we tonen in het dashboard.
// Elke stap wordt geteld op basis van het voorkomen van het bijbehorende event-type
// in een sessie.
// Funnel-stappen op volgorde van waar in de flow het gebeurt.
// We tellen een sessie voor een stap als ze het bijbehorende event hebben.
// De baseline (100%) is het totaal aantal sessies.
export const FUNNEL_STEPS = [
  { id: 'intent:answered', label: 'Persona-keuze' },
  { id: 'brochure-trigger:answered', label: 'Brochure-trigger' },
  { id: 'lead-email:submitted', label: 'E-mail' },
  { id: 'lead-name:submitted', label: 'Naam' },
  { id: 'lead-phone-ask:answered', label: 'WhatsApp-keuze' },
  { id: 'size:answered', label: 'Grootte' },
  { id: 'timeline:answered', label: 'Termijn' },
  { id: 'followup:answered', label: 'Vervolg' },
  { id: 'flow:complete', label: 'Voltooid' },
]

export function buildFunnel(sessions) {
  const total = sessions.length
  const steps = FUNNEL_STEPS.map((step) => {
    const count = sessions.filter((s) => s.events.some((e) => e.type === step.id)).length
    return { ...step, count }
  })
  return [{ id: '__sessions__', label: 'Sessies', count: total }, ...steps]
}

// Per stap: wat is de meest voorkomende exit. Voor afhaak-analyse.
export function buildAbandonByStep(sessions) {
  // Voor sessies die NIET completed zijn: bij welke laatste event-type stopten ze?
  const abandoned = sessions.filter((s) => !s.completed)
  const counts = new Map()
  for (const s of abandoned) {
    const last = s.lastStep
    counts.set(last, (counts.get(last) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count, label: humanizeEventType(type) }))
    .sort((a, b) => b.count - a.count)
}

export function buildAfhaakReasons(sessions) {
  const counts = new Map()
  for (const s of sessions) {
    if (!s.afhaakReason) continue
    counts.set(s.afhaakReason, (counts.get(s.afhaakReason) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

export function buildPersonaBreakdown(sessions) {
  const counts = new Map()
  for (const s of sessions) {
    counts.set(s.persona, (counts.get(s.persona) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: humanizePersona(key), count }))
    .sort((a, b) => b.count - a.count)
}

export function buildHandoffStats(sessions) {
  const shown = sessions.filter((s) => s.handoffShown).length
  const accepted = sessions.filter((s) => ['callback', 'whatsapp', 'phone'].includes(s.handoffOutcome)).length
  const dismissed = sessions.filter((s) => s.handoffOutcome === 'dismissed').length
  const noAction = sessions.filter((s) => s.handoffShown && !s.handoffOutcome).length
  return { shown, accepted, dismissed, noAction, total: sessions.length }
}

export function buildHandoffByPersona(sessions) {
  const counts = new Map()
  for (const s of sessions) {
    if (!s.handoffShown) continue
    const key = s.handoffPersona || 'onbekend'
    if (!counts.has(key)) counts.set(key, { shown: 0, accepted: 0 })
    const entry = counts.get(key)
    entry.shown += 1
    if (['callback', 'whatsapp', 'phone'].includes(s.handoffOutcome)) entry.accepted += 1
  }
  return [...counts.entries()].map(([persona, v]) => ({ persona, ...v }))
}

export function buildVariantBreakdown(sessions) {
  const counts = new Map()
  for (const s of sessions) {
    if (!s.ctaVariant) continue
    counts.set(s.ctaVariant, (counts.get(s.ctaVariant) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([variant, count]) => ({ variant, count }))
    .sort((a, b) => a.variant.localeCompare(b.variant))
}

export function humanizePersona(key) {
  switch (key) {
    case 'eigen_gebruiker': return 'Voor mijn bedrijf'
    case 'belegger': return 'Als belegging'
    case 'beide': return 'Beide'
    case 'onbekend': return 'Weet ik nog niet'
    default: return key
  }
}

export function humanizeEventType(type) {
  switch (type) {
    case 'session:start': return 'Sessie gestart'
    case 'intent:answered': return 'Persona-keuze gemaakt'
    case 'brochure-trigger:answered': return 'Brochure-trigger beantwoord'
    case 'afhaak-reason:answered': return 'Afhaakreden gegeven'
    case 'lead-email:submitted': return 'E-mail ingevuld'
    case 'lead-name:submitted': return 'Naam ingevuld'
    case 'lead-phone-ask:answered': return 'WhatsApp-keuze gemaakt'
    case 'lead-phone:submitted': return '06 ingevuld'
    case 'size:answered': return 'Grootte gekozen'
    case 'timeline:answered': return 'Termijn gekozen'
    case 'more-info:viewed': return 'Extra info opgevraagd'
    case 'more-info:continue': return 'Doorgegaan zonder extra info'
    case 'followup:answered': return 'Vervolg gekozen'
    case 'flow:complete': return 'Flow voltooid'
    case 'cta:whatsapp-clicked': return 'WhatsApp aangeklikt'
    case 'cta:phone-clicked': return 'Bel-knop aangeklikt'
    case 'cta:brochure-clicked': return 'Brochure geopend'
    case 'direct-contact:requested': return 'Direct contact gevraagd'
    case 'financing:credion-shared': return 'Financiering naar Credion gedeeld'
    case 'rent-match:registered': return 'Huur-interesse vastgelegd'
    case 'unit:detail-opened': return 'Unit-detail bekeken'
    case 'calc:rentability-interaction': return 'Rendement-calc gebruikt'
    case 'calc:mortgage-interaction': return 'Maandlast-calc gebruikt'
    case 'warm-handoff:shown': return 'Warm-handoff getoond'
    case 'warm-handoff:callback': return 'Terugbel-verzoek'
    case 'warm-handoff:whatsapp': return 'WhatsApp via handoff'
    case 'warm-handoff:phone': return 'Bel-zelf via handoff'
    case 'warm-handoff:dismissed': return 'Handoff afgewezen'
    case 'warm-handoff:callback-chip-clicked': return 'Callback-chip gebruikt'
    case 'location:tab-switched': return 'Locatie-tab gewisseld'
    case 'location:maps-opened': return 'Google Maps geopend'
    default: return type
  }
}

export function formatDuration(ms) {
  if (!ms || ms < 1000) return '0s'
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}m ${sec}s`
}

export function formatTimestamp(ts) {
  const d = new Date(ts)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}-${mm} ${hh}:${min}`
}

export function exportSessionsJson() {
  return JSON.stringify({ exportedAt: new Date().toISOString(), sessions: getSessions() }, null, 2)
}

// ============================================================================
// Date range filtering
// ============================================================================

// Standaard ranges. Custom range = { from: ms, to: ms }.
export const DATE_RANGES = [
  { id: '24h', label: '24 uur',  ms: 24 * 60 * 60 * 1000 },
  { id: '7d',  label: '7 dagen', ms: 7  * 24 * 60 * 60 * 1000 },
  { id: '30d', label: '30 dagen', ms: 30 * 24 * 60 * 60 * 1000 },
  { id: 'all', label: 'Alles',   ms: null },
]

export function filterByDateRange(sessions, rangeId = 'all') {
  if (rangeId === 'all') return sessions
  const range = DATE_RANGES.find((r) => r.id === rangeId)
  if (!range || !range.ms) return sessions
  const cutoff = Date.now() - range.ms
  return sessions.filter((s) => s.lastEventAt >= cutoff)
}

// ============================================================================
// Bubble exposure tracking
// ============================================================================

// Bubble-kinds die we tellen. Komen overeen met message.kind in
// src/components/ChatThread.jsx — auto-track via useBubbleExposure() hook.
export const BUBBLE_KINDS = [
  'content-card', 'unit-card', 'gallery', 'usp-cards', 'location',
  'site-plan', 'highlights', 'process', 'planning', 'investor',
  'price', 'price-compare', 'brochure', 'cta-card', 'warm-handoff',
  'service-card',
]

export function humanizeBubble(kind) {
  switch (kind) {
    case 'content-card':   return 'Content-card'
    case 'unit-card':      return 'Unit-detail'
    case 'gallery':        return 'Sfeerbeelden'
    case 'usp-cards':      return 'USP-kaarten'
    case 'location':       return 'Locatie-kaart'
    case 'site-plan':      return 'Plattegrond'
    case 'highlights':     return 'Highlights'
    case 'process':        return 'Proces-uitleg'
    case 'planning':       return 'Planning'
    case 'investor':       return 'Belegger-info'
    case 'price':          return 'Prijs-bubble'
    case 'price-compare':  return 'Prijs-vergelijk'
    case 'brochure':       return 'Brochure-bubble'
    case 'cta-card':       return 'CTA-kaart'
    case 'warm-handoff':   return 'Warm-handoff'
    case 'service-card':   return 'Service-kaart'
    default:               return kind
  }
}

export function buildBubbleExposure(sessions) {
  const stats = new Map()
  for (const kind of BUBBLE_KINDS) {
    stats.set(kind, { kind, exposureCount: 0, uniqueSessions: 0, completedWith: 0, completedWithout: 0, totalWith: 0, totalWithout: 0 })
  }
  for (const s of sessions) {
    const kindsInSession = new Set(s.events.filter((e) => e.type === 'bubble:rendered').map((e) => e.payload?.kind).filter(Boolean))
    const completed = !!s.completed
    for (const kind of BUBBLE_KINDS) {
      const stat = stats.get(kind)
      const seen = kindsInSession.has(kind)
      if (seen) {
        stat.uniqueSessions += 1
        stat.exposureCount += s.events.filter((e) => e.type === 'bubble:rendered' && e.payload?.kind === kind).length
        stat.totalWith += 1
        if (completed) stat.completedWith += 1
      } else {
        stat.totalWithout += 1
        if (completed) stat.completedWithout += 1
      }
    }
  }
  // Bereken conversion-lift = conversion-rate-met-bubble - conversion-rate-zonder-bubble
  // En sparkline-data over de laatste 14 dagen.
  const days = 14
  const todayStart = startOfDay(Date.now())
  return [...stats.values()].map((s) => {
    const convWith    = s.totalWith    > 0 ? s.completedWith    / s.totalWith    : 0
    const convWithout = s.totalWithout > 0 ? s.completedWithout / s.totalWithout : 0
    const lift = convWith - convWithout
    // Sparkline: per dag aantal sessies waarin deze bubble werd vertoond
    const sparkline = new Array(days).fill(0)
    for (const sess of sessions) {
      if (!sess.events.some((e) => e.type === 'bubble:rendered' && e.payload?.kind === s.kind)) continue
      const dayIdx = days - 1 - Math.floor((todayStart - startOfDay(sess.startedAt)) / 86400000)
      if (dayIdx >= 0 && dayIdx < days) sparkline[dayIdx] += 1
    }
    return {
      kind: s.kind,
      label: humanizeBubble(s.kind),
      exposureCount: s.exposureCount,
      uniqueSessions: s.uniqueSessions,
      convWith,
      convWithout,
      lift,
      sparkline,
    }
  }).sort((a, b) => b.uniqueSessions - a.uniqueSessions)
}

// ============================================================================
// Sankey flow diagram
// ============================================================================

// Welke event-types meedoen in de Sankey (rest is ruis voor pad-analyse).
const SANKEY_EVENT_TYPES = new Set([
  'session:start',
  'intro:cta-clicked',
  'intent:answered',
  'brochure-trigger:answered',
  'lead-email:submitted',
  'lead-name:submitted',
  'lead-phone-ask:answered',
  'lead-phone:submitted',
  'size:answered',
  'timeline:answered',
  'followup:answered',
  'flow:complete',
  'afhaak-reason:answered',
  'direct-contact:requested',
  'warm-handoff:shown',
  'warm-handoff:callback',
  'warm-handoff:whatsapp',
  'warm-handoff:phone',
  'warm-handoff:dismissed',
])

// Bouwt een Sankey-graaf {nodes, links}. Branched op persona+keuze waar
// dat zinvol is, zodat je niet alleen "stap A → stap B" ziet maar ook
// "belegger → ja → mail" tegenover "eigen → nee → afhaak".
export function buildSankey(sessions, { branchOnPersona = true } = {}) {
  const links = new Map()  // key = `${from}>${to}` → count
  const nodes = new Set()

  function addNode(id) { nodes.add(id) }
  function addLink(from, to) {
    addNode(from); addNode(to)
    if (from === to) return
    const key = `${from}>${to}`
    links.set(key, (links.get(key) || 0) + 1)
  }

  for (const s of sessions) {
    const personaTag = branchOnPersona && s.persona && s.persona !== 'onbekend'
      ? `[${humanizePersona(s.persona)}] `
      : ''
    let prev = `Start${branchOnPersona ? '' : ''}`
    addNode(prev)
    for (const ev of s.events) {
      if (!SANKEY_EVENT_TYPES.has(ev.type)) continue
      // Label per stap: voor intent → vertakking op persona;
      // voor brochure-trigger → vertakking ja/nee; default = stap-naam.
      let label = humanizeEventType(ev.type)
      if (ev.type === 'intent:answered') {
        label = `Persona: ${humanizePersona(ev.payload?.persona ?? s.persona ?? 'onbekend')}`
      } else if (ev.type === 'brochure-trigger:answered') {
        label = `Brochure: ${ev.payload?.id === 'ja' ? 'ja' : 'nee'}`
      } else if (ev.type === 'lead-phone-ask:answered') {
        label = `WhatsApp: ${ev.payload?.id ?? 'onbekend'}`
      } else if (ev.type === 'flow:complete') {
        const stage = ev.payload?.stage ?? 'voltooid'
        label = `Voltooid (${stage})`
      } else if (ev.type === 'afhaak-reason:answered') {
        label = `Afhaak: ${ev.payload?.label ?? ev.payload?.id ?? 'reden'}`
      }
      const to = personaTag + label
      addLink(prev, to)
      prev = to
    }
    if (!s.completed) {
      addLink(prev, '⚠ Verlaten')
    }
  }

  // Filter trivially small links (1 of minder) zodat de Sankey leesbaar blijft
  // bij weinig data. Gebruiker kan dit later evt. aanpassen via prop.
  return {
    nodes: [...nodes].map((id) => ({ id, nodeColor: nodeColorFor(id) })),
    links: [...links.entries()].map(([key, value]) => {
      const [source, target] = key.split('>')
      return { source, target, value }
    }),
  }
}

function nodeColorFor(id) {
  if (id.includes('Voltooid')) return '#1a8c4a'
  if (id.includes('Verlaten') || id.includes('Afhaak')) return '#b91c1c'
  if (id.includes('Brochure: nee')) return '#b91c1c'
  if (id.includes('Persona:')) return '#0f0f70'
  return '#1b1b8a'
}

// ============================================================================
// Time to conversion histogram
// ============================================================================

const TTC_BUCKETS = [
  { id: 'instant', label: '< 30s',  max: 30000 },
  { id: 'fast',    label: '30s-1m', max: 60000 },
  { id: 'medium',  label: '1-2m',   max: 120000 },
  { id: 'normal',  label: '2-5m',   max: 300000 },
  { id: 'slow',    label: '5-10m',  max: 600000 },
  { id: 'very_slow', label: '10m+', max: Infinity },
]

export function buildTimeToConversion(sessions) {
  const completed = sessions.filter((s) => s.completed)
  const abandoned = sessions.filter((s) => !s.completed)
  const completedBuckets = TTC_BUCKETS.map((b) => ({ ...b, count: 0 }))
  const abandonedBuckets = TTC_BUCKETS.map((b) => ({ ...b, count: 0 }))
  for (const s of completed) {
    const idx = TTC_BUCKETS.findIndex((b) => s.duration < b.max)
    if (idx >= 0) completedBuckets[idx].count += 1
  }
  for (const s of abandoned) {
    const idx = TTC_BUCKETS.findIndex((b) => s.duration < b.max)
    if (idx >= 0) abandonedBuckets[idx].count += 1
  }
  const completedDurations = completed.map((s) => s.duration).sort((a, b) => a - b)
  const median = completedDurations.length > 0
    ? completedDurations[Math.floor(completedDurations.length / 2)]
    : 0
  const mean = completedDurations.length > 0
    ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length
    : 0
  return { completed: completedBuckets, abandoned: abandonedBuckets, median, mean, completedCount: completed.length, abandonedCount: abandoned.length }
}

// ============================================================================
// Drop-off intent matrix (persona × last-step before leaving)
// ============================================================================

export function buildDropoffMatrix(sessions) {
  const matrix = new Map()
  const personasSet = new Set()
  const stepsSet = new Set()
  for (const s of sessions) {
    if (s.completed) continue
    const persona = s.persona || 'onbekend'
    const step = s.lastStep || 'unknown'
    personasSet.add(persona)
    stepsSet.add(step)
    const key = `${persona}|${step}`
    matrix.set(key, (matrix.get(key) || 0) + 1)
  }
  const personas = [...personasSet]
  const steps = [...stepsSet]
  const cells = []
  for (const persona of personas) {
    for (const step of steps) {
      const count = matrix.get(`${persona}|${step}`) || 0
      cells.push({ persona, step, count })
    }
  }
  // Per persona: percentages
  const personaTotals = new Map()
  for (const cell of cells) {
    personaTotals.set(cell.persona, (personaTotals.get(cell.persona) || 0) + cell.count)
  }
  for (const cell of cells) {
    const total = personaTotals.get(cell.persona) || 1
    cell.percentage = total > 0 ? cell.count / total : 0
  }
  return {
    personas: personas.map((p) => ({ id: p, label: humanizePersona(p), total: personaTotals.get(p) || 0 })),
    steps:    steps.map((s) => ({ id: s, label: humanizeEventType(s) })),
    cells,
  }
}

// ============================================================================
// Hot leads leaderboard (composite score)
// ============================================================================

const PERSONA_WEIGHT  = { belegger: 2.0, eigen_gebruiker: 1.8, beide: 1.5, huurder: 0.5, onbekend: 0.5 }
const TIMELINE_WEIGHT = { zsm: 2.0, '3mnd': 1.5, '6mnd': 1.0, '12mnd': 0.5, weet_niet: 0.2 }

export function computeLeadScore(session) {
  let score = 0
  const personaW  = PERSONA_WEIGHT[session.persona] ?? 0.5
  const evs = session.events
  const timelineEv = evs.find((e) => e.type === 'timeline:answered')
  const sizeEv     = evs.find((e) => e.type === 'size:answered')
  const timelineW  = timelineEv ? (TIMELINE_WEIGHT[timelineEv.payload?.id] ?? 0.5) : 0
  const sizeW      = sizeEv ? (sizeEv.payload?.id === 'weet_niet' ? 0.3 : 1.0) : 0
  score += personaW + timelineW + sizeW
  // Engagement caps
  const unitDetails = evs.filter((e) => e.type === 'unit:detail-opened').length
  score += Math.min(3, unitDetails) * 0.6
  const calcs = evs.filter((e) => e.type.startsWith('calc:')).length
  score += Math.min(2, calcs) * 0.5
  // Lead presence
  if (session.lead?.email)     score += 1.0
  if (session.lead?.firstName) score += 0.4
  if (session.lead?.phone)     score += 1.6
  // Completion
  if (session.completed) score += 1.5
  // Handoff outcome
  if (['callback', 'whatsapp', 'phone'].includes(session.handoffOutcome)) score += 2.5
  if (session.handoffOutcome === 'dismissed') score -= 0.5
  // Direct contact
  if (evs.some((e) => e.type === 'direct-contact:requested')) score += 2.0
  // Time-on-page sweet spot 30s-5min
  const dur = session.duration ?? 0
  if (dur >= 30000 && dur <= 300000) score += 0.5
  if (dur > 600000) score -= 0.3
  // Cap & normalize 0-100
  const max = 14
  return Math.max(0, Math.min(100, Math.round((score / max) * 100)))
}

export function buildHotLeads(sessions, limit = 20) {
  return sessions
    .map((s) => ({ session: s, score: computeLeadScore(s) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// ============================================================================
// Real-time tile (recent sessions)
// ============================================================================

export function buildRealtime(sessions, windowMs = 5 * 60 * 1000) {
  const cutoff = Date.now() - windowMs
  return sessions.filter((s) => s.lastEventAt >= cutoff)
}

// ============================================================================
// A/B significance calculator
// ============================================================================

// Two-proportion z-test. Returns z, p (two-sided), confidence-pct, winner.
// pA/pB: completion-rate (0-1). nA/nB: sample-sizes.
export function abSignificance(pA, nA, pB, nB) {
  if (nA === 0 || nB === 0) return { z: 0, p: 1, confidence: 0, winner: null, sampleOk: false }
  const pPool = (pA * nA + pB * nB) / (nA + nB)
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB))
  if (se === 0) return { z: 0, p: 1, confidence: 0, winner: null, sampleOk: false }
  const z = (pA - pB) / se
  const p = 2 * (1 - normalCdf(Math.abs(z)))
  const confidence = (1 - p) * 100
  const winner = pA === pB ? null : (pA > pB ? 'A' : 'B')
  const sampleOk = nA >= 30 && nB >= 30
  return { z, p, confidence, winner, sampleOk }
}

// Approximation of standard normal CDF (Abramowitz & Stegun 26.2.17, error <7.5e-8).
function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * z)
  const d = 0.3989422804014327 * Math.exp(-z * z / 2)
  return 1 - d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
}

export function buildABStats(sessions) {
  // Group by ctaVariant; conversion = completed flow.
  const byVariant = new Map()
  for (const s of sessions) {
    const v = s.ctaVariant || 'unknown'
    if (!byVariant.has(v)) byVariant.set(v, { variant: v, total: 0, completed: 0 })
    const stat = byVariant.get(v)
    stat.total += 1
    if (s.completed) stat.completed += 1
  }
  const stats = [...byVariant.values()].map((s) => ({ ...s, rate: s.total > 0 ? s.completed / s.total : 0 }))
  stats.sort((a, b) => a.variant.localeCompare(b.variant))
  // If at least 2 variants → compute pairwise significance vs first one
  let comparison = null
  if (stats.length >= 2) {
    const a = stats[0]
    const b = stats[1]
    comparison = {
      a: a.variant, b: b.variant,
      pA: a.rate, nA: a.total, pB: b.rate, nB: b.total,
      ...abSignificance(a.rate, a.total, b.rate, b.total),
    }
  }
  return { variants: stats, comparison }
}

// ============================================================================
// Cohort heatmap (day-of-week × hour-of-day)
// ============================================================================

const DAY_LABELS_NL = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

export function buildCohortHeatmap(sessions) {
  // 7 dagen × 24 uur. JS getDay(): 0=zo. Map naar 0=ma.
  const grid = []
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) grid.push({ day: d, hour: h, count: 0 })
  for (const s of sessions) {
    const dt = new Date(s.startedAt)
    const jsDay = dt.getDay()         // 0=zo..6=za
    const day = (jsDay + 6) % 7       // 0=ma..6=zo
    const hour = dt.getHours()
    grid.find((c) => c.day === day && c.hour === hour).count += 1
  }
  return { grid, dayLabels: DAY_LABELS_NL }
}

// ============================================================================
// Step times — time spent between events within a session
// ============================================================================

export function computeStepTimes(events) {
  if (!events || events.length < 2) return []
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  const out = []
  for (let i = 1; i < sorted.length; i++) {
    out.push({
      from: sorted[i - 1].type,
      to:   sorted[i].type,
      durationMs: sorted[i].timestamp - sorted[i - 1].timestamp,
      atTimestamp: sorted[i - 1].timestamp,
    })
  }
  return out
}

// Aggregate gemiddelde tijd-per-stap over alle sessies. Handig voor
// SessionReplay heatmap én systeem-brede "bottleneck-detection".
export function buildStepDurationStats(sessions) {
  const totals = new Map() // type → { totalMs, count }
  for (const s of sessions) {
    const steps = computeStepTimes(s.events)
    for (const step of steps) {
      // We accrediteren 'tijd doorgebracht IN stap X' aan de FROM-event.
      if (!totals.has(step.from)) totals.set(step.from, { type: step.from, totalMs: 0, count: 0 })
      const t = totals.get(step.from)
      t.totalMs += step.durationMs
      t.count += 1
    }
  }
  return [...totals.values()]
    .map((t) => ({ ...t, avgMs: t.count > 0 ? t.totalMs / t.count : 0, label: humanizeEventType(t.type) }))
    .sort((a, b) => b.avgMs - a.avgMs)
}

// ============================================================================
// Helpers
// ============================================================================

function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function formatRelativeTime(ts) {
  const diff = Date.now() - ts
  if (diff < 60000) return `${Math.round(diff / 1000)}s geleden`
  if (diff < 3600000) return `${Math.round(diff / 60000)}m geleden`
  if (diff < 86400000) return `${Math.round(diff / 3600000)}u geleden`
  return formatTimestamp(ts)
}

