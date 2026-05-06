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
export const PRIVACY_STATEMENT_VERSION = '2026-05-06b'

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
  // sendToBackend(entry) — geactiveerd zodra backend live is
  return entry
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
