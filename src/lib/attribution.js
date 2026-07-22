// Marketing-attributie — vastleggen waar een bezoeker vandaan komt, zodat de
// herkomst mee de leadrij op gaat en sales bij het bellen weet via welk
// platform iemand binnenkwam.
//
// Bewust hetzelfde contract als lib/attribution.ts in de projectportal-repo:
// dezelfde veldnamen, dezelfde bron-sets, dezelfde "last paid click wins"-regel.
// Het CRM krijgt daardoor één shape te zien, ongeacht of een lead via de CLP of
// via de portal binnenkwam. Wijzig je hier iets, wijzig het daar dan mee.
//
// Verschil met de portal: die gebruikt een cookie omdat de server-kant moet
// kunnen meelezen. De CLP heeft geen server, dus localStorage volstaat.
//
// Faalt nooit hard. Een dichte of volle localStorage betekent alleen dat deze
// ene lead zonder herkomst wordt weggeschreven, niet dat de flow breekt.

const STORAGE_KEY = 'clp-attribution-v1'
const TTL_DAYS = 90

// Welke utm_source-waarden tellen als Meta resp. Google. Bewust ruim zodat een
// variant ("facebook" ipv "meta") niet stilletjes buiten de boot valt.
const META_SOURCES = new Set([
  'meta', 'facebook', 'fb', 'instagram', 'ig', 'messenger', 'audience_network',
])
const GOOGLE_SOURCES = new Set([
  'google', 'google_ads', 'googleads', 'adwords', 'youtube', 'gdn', 'google-display',
])

function read() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    // Verlopen herkomst niet meer meesturen — buiten het attributie-window van
    // Meta en Google is 'ie toch niet meer waar.
    if (parsed.capturedAt) {
      const age = Date.now() - new Date(parsed.capturedAt).getTime()
      if (age > TTL_DAYS * 24 * 60 * 60 * 1000) return null
    }
    return parsed
  } catch {
    return null
  }
}

function write(attr) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attr))
  } catch {
    // localStorage kan dicht of vol staan — dan leeft de herkomst alleen deze
    // pageload, wat voor een single-page CLP-flow meestal genoeg is.
  }
}

// Heeft de huidige URL daadwerkelijk een herkomst-signaal? Zonder zo'n signaal
// laten we bestaande attributie met rust, zodat een directe vervolgsessie de
// eerder vastgelegde ad-herkomst niet wist.
function hasSignal(params) {
  return (
    params.has('utm_source') ||
    params.has('fbclid') ||
    params.has('gclid') ||
    params.has('wbraid') ||
    params.has('gbraid')
  )
}

// Lees herkomst uit de huidige URL en sla 'm op. Aanroepen bij de eerste render.
export function captureAttribution() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const existing = read()
  if (!hasSignal(params)) return existing

  const lower = (k) => {
    const v = params.get(k)
    return v ? v.toLowerCase() : undefined
  }
  const raw = (k) => params.get(k) || undefined

  const next = {
    source:       lower('utm_source'),
    medium:       lower('utm_medium'),
    campaign:     raw('utm_campaign'),
    content:      raw('utm_content'),
    term:         raw('utm_term'),
    fbclid:       raw('fbclid'),
    gclid:        raw('gclid'),
    wbraid:       raw('wbraid'),
    gbraid:       raw('gbraid'),
    landingPath:  window.location.pathname,
    capturedAt:   new Date().toISOString(),
  }
  for (const k of Object.keys(next)) {
    if (next[k] === undefined) delete next[k]
  }

  write(next)
  return next
}

// Huidige opgeslagen herkomst, of null als er niets bekend is.
export function getAttribution() {
  return read()
}

export function isMetaOrigin(attr = read()) {
  if (!attr) return false
  if (attr.fbclid) return true
  return !!(attr.source && META_SOURCES.has(attr.source))
}

export function isGoogleOrigin(attr = read()) {
  if (!attr) return false
  if (attr.gclid || attr.wbraid || attr.gbraid) return true
  return !!(attr.source && GOOGLE_SOURCES.has(attr.source))
}
