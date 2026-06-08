// Hostname-loader voor de hybride CLP-template.
//
// Hoe het werkt:
//   1. Per project één module in src/data/projects/<slug>.js die `project`
//      en `uspCardOrder` named-exports heeft.
//   2. Map hieronder koppelt hostname → project-module.
//   3. resolveProjectModule() kiest op basis van window.location.hostname.
//   4. Fallback = De Hofman (huidige productie-default), zodat onbekende
//      preview-URLs (*.vercel.app, etc.) altijd een werkende CLP tonen.
//
// Voor preview-deploys of lokaal testen:
//   VITE_PROJECT_OVERRIDE=paveri.clp.repp.nl npm run dev
//
// Hoe een nieuw project toevoegen:
//   - Maak src/data/projects/<slug>.js (kopie van dehofman.js als startpunt)
//   - Importeer hier als module
//   - Voeg toe aan PROJECTS-map met de productie-hostname als key
//   - Vercel custom-domain + DNS via EXTERNAL_SETUP_RUNBOOK
//
// Zie TEMPLATE_DUPLICATION_PLAN.md voor de architectuur-toelichting.

import * as dehofman from './projects/dehofman.js'
import * as paveri   from './projects/paveri.js'
import * as elster11 from './projects/elster11.js'
import * as pier14   from './projects/pier14.js'

// Map van hostname (zonder protocol of path) → module met { project, uspCardOrder }.
// Productie-pattern: <slug>.clp.repp.nl.
// Lokaal: localhost + 127.0.0.1 defaulteren naar De Hofman voor de meest
// voorkomende dev-flow. Voor andere projecten gebruik je VITE_PROJECT_OVERRIDE.
const PROJECTS = {
  'dehofman.clp.repp.nl': dehofman,
  'depaveri.clp.repp.nl': paveri,
  'elster11.clp.repp.nl': elster11,
  'pier14.clp.repp.nl':   pier14,
  'localhost':            dehofman,
  '127.0.0.1':            dehofman,
}

// Bewust De Hofman als default-module zodat onbekende hostnames
// (preview-URLs, typo's, oudere Vercel-aliases) niet crashen maar gewoon
// de huidige productie-CLP tonen.
const DEFAULT_MODULE = dehofman

function getOverride() {
  // Vite injecteert import.meta.env op build-time. Try/catch voor SSR-
  // contexten waar import.meta.env niet bestaat.
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_PROJECT_OVERRIDE || null
    }
  } catch {
    /* ignore — environments without import.meta.env */
  }
  return null
}

function getUrlOverride() {
  // Runtime URL-param override: ?project=pier14.clp.repp.nl op een
  // Vercel preview-URL forceert het juiste project zonder DNS. Bewust
  // alleen actief als de hostname zelf niet al in PROJECTS staat,
  // zodat productie-domeinen (dehofman.clp.repp.nl etc.) niet
  // bestuurbaar zijn via een query-param.
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const p = params.get('project')
    if (p && PROJECTS[p]) return p
  } catch {
    /* ignore */
  }
  return null
}

function resolveProjectModule() {
  // SSR / build-time: geen window, val terug op default.
  if (typeof window === 'undefined') return DEFAULT_MODULE

  // Dev/preview override via env-var (handig bij testen van nieuwe projecten
  // zonder dat je een DNS-entry of custom-domain hoeft op te zetten).
  const envOverride = getOverride()
  if (envOverride && PROJECTS[envOverride]) return PROJECTS[envOverride]

  // Hostname-based lookup heeft voorrang voor live subdomeinen.
  const host = window.location.hostname
  if (PROJECTS[host]) return PROJECTS[host]

  // Geen hostname-match (= Vercel preview-URL of localhost):
  // probeer URL-param ?project=<hostname> voor handmatig testen.
  const urlOverride = getUrlOverride()
  if (urlOverride) return PROJECTS[urlOverride]

  return DEFAULT_MODULE
}

const resolved = resolveProjectModule()

export const project = resolved.project
export const uspCardOrder = resolved.uspCardOrder
