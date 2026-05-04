// Event-store voor de CLP demo. Alle events worden in localStorage opgeslagen
// onder clp-events-v1. Een sessie krijgt een uuid bij start van een chat
// en wordt geclearet als de demo opnieuw begint.
//
// Voor productie vervang trackEvent door een POST naar een serverless function
// of een third-party service zoals PostHog. Aggregatie-functies blijven gelijk.

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

export function trackEvent(type, payload = {}) {
  const events = loadEvents()
  const event = {
    id: uuid(),
    sessionId: getSessionId(),
    timestamp: Date.now(),
    type,
    payload,
  }
  events.push(event)
  // cap op 5000 events om localStorage niet vol te laten lopen
  const capped = events.length > 5000 ? events.slice(-5000) : events
  safeWrite(EVENTS_KEY, JSON.stringify(capped))
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
