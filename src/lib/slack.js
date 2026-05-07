// Slack-notificatie helper voor hot leads. POST'st naar /api/slack-hot
// (Vercel serverless function) die de webhook-URL uit env afhandelt.
//
// Best-effort: failures worden silent gelogd en blokkeren de chat-flow niet.
// In dev-mode (geen Vercel function actief) krijgt console een melding zodat
// het meteen duidelijk is dat de notificatie niet daadwerkelijk gestuurd is.

import { trackEvent } from './analytics.js'

const ENDPOINT = '/api/slack-hot'
const DEDUPE_KEY = 'clp-slack-notified-v1'
const DEDUPE_MAX = 200

// localStorage-backed dedupe-set. Slack krijgt per session-id maximaal 1
// callback-notificatie, ook als de bezoeker de pagina reload of opnieuw
// op de callback-chip klikt. Voorheen was de Set in-memory en werd 'ie
// leeggemaakt bij elke reload, waardoor dezelfde sessionId opnieuw pingde.
function loadSentIds() {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(DEDUPE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function persistSentIds(set) {
  if (typeof window === 'undefined') return
  try {
    // Cap op DEDUPE_MAX zodat localStorage niet vol loopt op browsers
    // waarop de CLP veel sessies heeft (bv. test-devices).
    const ids = [...set].slice(-DEDUPE_MAX)
    window.localStorage.setItem(DEDUPE_KEY, JSON.stringify(ids))
  } catch {}
}

const sentSessionIds = loadSentIds()

export function notifyHotLead(payload) {
  if (!payload || typeof payload !== 'object') return

  const sessionId = payload.sessionId
  if (sessionId) {
    if (sentSessionIds.has(sessionId)) return
    sentSessionIds.add(sessionId)
    persistSentIds(sentSessionIds)
  }

  // Telemetry voor admin-dashboard zodat we kunnen zien hoe vaak Slack
  // getriggerd wordt zonder dat we de Slack-API hoeven te raadplegen.
  trackEvent('slack:hot-lead-attempt', {
    persona: payload.persona,
    score: payload.score,
    temperature: payload.temperature,
  })

  // fetch + ignore-failure pattern. In de Vercel preview/prod is dit een
  // echte call; in dev (vite zonder Vercel functions) faalt de fetch met
  // 404. Dat is verwacht en geen probleem.
  try {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).then((res) => {
      if (!res.ok) {
        if (res.status === 404 && import.meta.env?.DEV) {
          console.info('[slack] /api/slack-hot 404, Vercel function pas live na deploy. Lokaal is dit verwacht.')
          return
        }
        trackEvent('slack:hot-lead-failed', { status: res.status })
      } else {
        trackEvent('slack:hot-lead-sent', { persona: payload.persona })
      }
    }).catch((err) => {
      trackEvent('slack:hot-lead-error', { message: String(err?.message || err).slice(0, 100) })
    })
  } catch (err) {
    // synchronous throw alleen bij CSP/fetch-disabled, log niet escaleren.
    console.warn('[slack] notify failed', err)
  }
}

// Reset dedupe, nuttig bij sessie-reset zodat een nieuwe bezoeker op
// dezelfde browser ook nog een notificatie kan krijgen. Wist ook de
// localStorage-cache zodat de reset persistent is.
export function clearHotLeadDedupe() {
  sentSessionIds.clear()
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(DEDUPE_KEY) } catch {}
  }
}
