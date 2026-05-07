// Vastlegging van toestemming. AVG-art 7 vereist dat we kunnen aantonen
// wanneer en waarvoor de bezoeker toestemming heeft gegeven. Deze module
// is de centrale plek voor consent-logging.
//
// Per consent-moment bewaren we: scope, granted-status, timestamp, sessieId,
// en welke versie van het privacystatement van toepassing was. Dat laatste
// is belangrijk omdat de tekst kan wijzigen; we willen kunnen reproduceren
// onder welke voorwaarden iemand "ja" zei.
//
// Persistence-strategie:
//  1. localStorage onder `clp-consent-log-v1` als front-line opslag, zodat
//     de bezoeker ook bij refresh ziet dat we het hebben vastgelegd
//  2. Event via trackEvent() naar analytics-stream voor cross-session zicht
//  3. (toekomstig) een POST naar de backend zodra die er is; de hook
//     `sendToBackend()` is voorbereid maar nog uitgeschakeld
//
// We gebruiken bewust geen IP-opslag of fingerprint; alleen sessieId en
// een grove user-agent string voor verificatie bij audit. Sessie-id rouleert
// per bezoeker zoals analytics.js dat al doet.

import { trackEvent } from './analytics.js'

const STORAGE_KEY = 'clp-consent-log-v1'

// Versienummer van het privacystatement. Bump bij elke substantiele wijziging
// van public/privacy.html zodat we kunnen aantonen onder welke voorwaarden
// een bezoeker zijn toestemming heeft gegeven.
//
// Wijzigingsgeschiedenis:
//   2026-05-06   initial — privacystatement live met 60mnd retentie
//   2026-05-06b  Plausible Analytics toegevoegd in sectie 4 + 9
//   2026-05-07   lichter herschreven, info@repp.nl ipv jann@repp.nl, service-
//                mails als doel toegevoegd (gerechtvaardigd belang met opt-out),
//                Supabase als verwerker toegevoegd, harde tijdsbeloftes
//                vervangen door "binnen wettelijke termijn", retentie omschreven
//                als "zolang we je nog relevant kunnen helpen" ipv 60 mnd hard.
//   2026-05-07b  Brevo toegevoegd als verwerker (e-mail platform voor brochure-
//                versturen + opt-out service-mails).
export const PRIVACY_STATEMENT_VERSION = '2026-05-07b'

function readLog() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeLog(entries) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {}
}

// Toestemming vastleggen. Scope is een korte machine-leesbare string; granted
// is true (toegestemd) of false (geweigerd). Beide bewaren we — een geweigerde
// consent is ook een feit dat we moeten kunnen aantonen. Detail is optioneel
// maar handig om bv. de geleverde data-categorieen vast te leggen.
export function logConsent(scope, granted, detail = {}) {
  const entry = {
    scope,
    granted: !!granted,
    timestamp: new Date().toISOString(),
    privacyStatementVersion: PRIVACY_STATEMENT_VERSION,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
    detail,
  }
  const log = readLog()
  log.push(entry)
  writeLog(log)
  trackEvent('consent:logged', {
    scope,
    granted: !!granted,
    privacyStatementVersion: PRIVACY_STATEMENT_VERSION,
    ...detail,
  })
  // Server-side audit-trail. App.jsx::pushSnapshot bevat al de standaard
  // consents in zijn payload; deze achtergrond-push is een extra vangnet
  // voor consent-momenten die niet samenvallen met een lead-snapshot
  // (bv. logErasureRequest na flow-completion). Achter feature-flag,
  // best-effort, geen impact op de chat-flow bij failure.
  sendConsentToBackend(entry).catch((err) => {
    console.warn('[consent] backend push failed', err?.message || err)
  })
  return entry
}

// Email-gate: alleen pushen als er een lead-rij met email bestaat. Voorkomt
// dat sessiestart-consent of brochure-consent (vóór lead-capture) een lege
// orphan-rij in Supabase aanmaken. Ook deze module hanteert "alleen leads
// met email landen in Supabase" — consistent met App.jsx::pushSnapshot.
function visitorHasEmail() {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem('clp-state-v5')
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return !!parsed?.answers?.lead?.email
  } catch {
    return false
  }
}

// Asynchrone push van een single consent-entry naar het lead-upsert
// endpoint. Idempotency: de Edge Function append't elke consent-rij, dus
// dubbele aanroepen kunnen dubbele rijen geven. Acceptabel AVG-wise (wij
// over-recorden liever dan dat we missen).
//
// Dynamische import voorkomt een circulaire dep met api.js (api.js
// importeert uit consent.js voor PRIVACY_STATEMENT_VERSION).
async function sendConsentToBackend(entry) {
  // Lazy import om module-graph clean te houden en SSR-veilig te zijn.
  const { pushLead, isApiConfigured } = await import('./api.js')
  const { getSessionId } = await import('./analytics.js')
  if (!isApiConfigured()) return

  // Email-gate consistent met App.jsx::pushSnapshot.
  if (!visitorHasEmail()) return

  const sessionId = getSessionId()
  if (!sessionId) return

  // Minimale payload: alleen session_id + source + één consent. De Edge
  // Function upsert't de leads-rij (geen overwrite van bestaande velden
  // omdat ze allemaal undefined zijn) en append't de consent_log-rij.
  const source = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLP_SOURCE) || 'clp_dehofman'
  await pushLead({
    session_id: sessionId,
    source,
    privacy_statement_version: entry.privacyStatementVersion,
    last_event_at: entry.timestamp,
    consents: [{
      scope:   entry.scope,
      granted: entry.granted,
      privacy_statement_version: entry.privacyStatementVersion,
      user_agent: entry.userAgent,
      detail:  entry.detail || {},
    }],
  })
}

// Sessie-start consent voor sessie-state-opslag in localStorage. Strikt
// genomen onder grondslag "uitvoering van het verzoek" maar we leggen het
// vast voor volledigheid. Roep eenmaal aan bij start van de chat.
export function logSessionStartConsent() {
  return logConsent('chat-sessie-state', true, {
    basis: 'uitvoering verzoek',
    purpose: 'chat-state in localStorage zodat sessie hervat kan worden',
  })
}

// Brochure-vraag = ja: bezoeker geeft contactgegevens om de brochure te
// ontvangen plus voor verdere opvolging. Grondslag: uitvoering verzoek
// (brochure mailen) plus gerechtvaardigd belang (sales-opvolging).
export function logBrochureConsent() {
  return logConsent('brochure-en-opvolging', true, {
    basis: 'uitvoering verzoek + gerechtvaardigd belang',
    dataCategories: ['firstName', 'email', 'phone-optional', 'voorkeuren'],
  })
}

// Credion-doorgifte: expliciete consent. Apart loggen omdat dit een derde
// partij betreft. Granted boolean op basis van bezoekers keuze.
export function logCredionConsent(granted) {
  return logConsent('credion-doorgifte', granted, {
    basis: 'expliciete toestemming AVG art 6 lid 1a',
    recipient: 'Credion',
    dataCategories: ['firstName', 'email', 'phone', 'project-context'],
  })
}

// Optionele helpers voor toekomstige uitbreiding: marketing-opt-in,
// nieuwsbrief, retargeting. Voorbereid om consistent shape te hebben.
export function logMarketingConsent(granted) {
  return logConsent('marketing-opvolging', granted, {
    basis: 'expliciete toestemming AVG art 6 lid 1a',
    purpose: 'periodieke updates over nieuwe REPP-projecten',
  })
}

// Voor de antwoorden-sheet "alles vergeten": logt het verzoek voordat we
// daadwerkelijk wissen. Achterhaalbaarheid voor audit.
export function logErasureRequest() {
  return logConsent('verwijdering-uitgevoerd', true, {
    basis: 'AVG art 17 recht op verwijdering',
    method: 'in-app via antwoorden-sheet',
  })
}

// Lees-functie voor admin/debug-paneel.
export function getConsentLog() {
  return readLog()
}

// Optionele clear, alleen voor debug. Wis NIET bij normaal gebruik;
// consent-log is bewijsmateriaal.
export function clearConsentLog() {
  writeLog([])
}
