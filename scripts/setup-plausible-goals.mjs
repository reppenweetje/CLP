#!/usr/bin/env node
// scripts/setup-plausible-goals.mjs
//
// Maakt Plausible custom-event Goals aan voor de CLP analytics-funnel.
// Idempotent — Plausible upsert op duplicate PUT, dus opnieuw draaien is safe.
//
// Gebruik (drie opties):
//
//  1. via env-vars inline:
//     PLAUSIBLE_API_KEY=xxx PLAUSIBLE_SITE_ID=clp.repp.nl npm run setup:plausible
//
//  2. via lokaal env-file (.env.plausible.local in de CLP-root, gitignored):
//     PLAUSIBLE_API_KEY=xxx
//     PLAUSIBLE_SITE_ID=clp.repp.nl
//     daarna: npm run setup:plausible
//
//  3. dry-run zonder API key:
//     PLAUSIBLE_SITE_ID=clp.repp.nl npm run setup:plausible -- --dry-run
//
// Extra flags:
//   --list      lees alleen de bestaande goals, geen wijzigingen
//   --dry-run   geen API-calls, toon alleen wat zou gebeuren
//
// API key aanmaken:
//   https://plausible.io/settings/api-keys (Pro plan vereist)
//   Scopes: sites:provision:goals:write + sites:provision:goals:read
//
// Site ID = je domein in Plausible (zonder protocol). Voorbeelden:
//   clp.repp.nl       (umbrella voor alle CLPs, aanbevolen)
//   dehofman.clp.repp.nl
//   repp.nl

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Auto-load .env.plausible.local zodat de user de key niet inline hoeft mee te geven.
function loadDotEnv(path) {
  if (!existsSync(path)) return false
  const content = readFileSync(path, 'utf-8')
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    const [, key, rawVal] = m
    const val = rawVal.replace(/^["']|["']$/g, '')
    if (process.env[key] === undefined) process.env[key] = val
  }
  return true
}
const envFile = resolve(process.cwd(), '.env.plausible.local')
const envLoaded = loadDotEnv(envFile)

const API_KEY = process.env.PLAUSIBLE_API_KEY
const SITE_ID = process.env.PLAUSIBLE_SITE_ID
const API_BASE = process.env.PLAUSIBLE_API_BASE || 'https://plausible.io'
const DRY_RUN  = process.argv.includes('--dry-run')
const LIST     = process.argv.includes('--list')

if (!SITE_ID) {
  console.error('✗ PLAUSIBLE_SITE_ID env var is verplicht (bijv. clp.repp.nl)')
  process.exit(1)
}
if (!API_KEY && !DRY_RUN) {
  console.error('✗ PLAUSIBLE_API_KEY env var is verplicht (of gebruik --dry-run)')
  console.error('  Genereer een key op https://plausible.io/settings/api-keys')
  process.exit(1)
}

// Lijst van alle custom events die we als Goal willen tracken.
// Volgorde komt overeen met de FUNNEL_STEPS uit src/lib/analytics.js.
// Groepering puur ter informatie — Plausible kent geen "tiers".
const GOALS = [
  // ── Tier 1 — main conversion funnel ────────────────────────────────
  { event: 'intro:cta-clicked',           note: 'Entry CTA aangeklikt op intro-screen' },
  { event: 'intent:answered',             note: 'Persona-keuze gemaakt (eigen_gebruiker / belegger / etc.)' },
  { event: 'brochure-trigger:answered',   note: 'Wel/niet brochure-interesse aangegeven' },
  { event: 'lead-email:submitted',        note: 'E-mail ingevuld' },
  { event: 'lead-name:submitted',         note: 'Voornaam ingevuld' },
  { event: 'lead-phone-ask:answered',     note: 'WhatsApp ja/nee gekozen' },
  { event: 'lead-phone:submitted',        note: '06-nummer ingevuld' },
  { event: 'size:answered',               note: 'Gewenste oppervlakte gekozen' },
  { event: 'timeline:answered',           note: 'Termijn gekozen (zsm / 3mnd / etc.)' },
  { event: 'followup:answered',           note: 'Vervolg-keuze gemaakt' },
  { event: 'flow:complete',               note: 'Hele flow voltooid (eind-conversie)' },

  // ── Tier 2 — drop-off + alternatieve paden ──────────────────────────
  { event: 'afhaak-reason:answered',      note: 'Afhaak-reden gegeven (markonderzoek-data)' },
  { event: 'direct-contact:requested',    note: 'Direct contact gevraagd zonder hele flow' },

  // ── Tier 3 — engagement signalen ────────────────────────────────────
  { event: 'unit:detail-opened',          note: 'Unit-detail bekeken (koop-signaal)' },
  { event: 'calc:rentability-interaction', note: 'Rendement-calculator gebruikt' },
  { event: 'calc:mortgage-interaction',   note: 'Maandlasten-calculator gebruikt' },

  // ── Tier 4 — warm handoff outcomes ──────────────────────────────────
  { event: 'warm-handoff:shown',          note: 'Warm-handoff bubble getoond' },
  { event: 'warm-handoff:callback',       note: 'Terugbel-verzoek geaccepteerd' },
  { event: 'warm-handoff:whatsapp',       note: 'WhatsApp gekozen vanuit handoff' },
  { event: 'warm-handoff:phone',          note: 'Zelf gebeld vanuit handoff' },
  { event: 'warm-handoff:dismissed',      note: 'Handoff-bubble afgewezen' },

  // ── Tier 5 — CTA varianten + zijpaden ───────────────────────────────
  { event: 'cta:brochure-clicked',        note: 'Brochure expliciet geopend' },
  { event: 'cta:whatsapp-clicked',        note: 'Algemene WhatsApp-knop aangeklikt' },
  { event: 'cta:phone-clicked',           note: 'Algemene bel-knop aangeklikt' },
  { event: 'financing:credion-shared',    note: 'Naar Credion doorgegeven (na consent)' },
  { event: 'rent-match:registered',       note: 'Huur-interesse vastgelegd' },
]

// ── Plausible API helpers ─────────────────────────────────────────────

async function plausibleRequest(method, path, body) {
  const url = `${API_BASE}${path}`
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  }
  if (body) {
    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    opts.body = body
  }
  const res = await fetch(url, opts)
  const text = await res.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch {}
  return { ok: res.ok, status: res.status, body: parsed ?? text }
}

async function listExisting() {
  const params = new URLSearchParams({ site_id: SITE_ID })
  const r = await plausibleRequest('GET', `/api/v1/sites/goals?${params}`)
  if (!r.ok) return { ok: false, names: new Set(), raw: r }
  // Plausible response shape: { goals: [{ id, goal_type, event_name, ... }, ...] }
  const goals = Array.isArray(r.body?.goals) ? r.body.goals : []
  const names = new Set(goals.filter(g => g.goal_type === 'event').map(g => g.event_name))
  return { ok: true, names, count: goals.length, raw: r }
}

async function createGoal(eventName) {
  const body = new URLSearchParams({
    site_id: SITE_ID,
    goal_type: 'event',
    event_name: eventName,
  }).toString()
  return plausibleRequest('PUT', '/api/v1/sites/goals', body)
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nPlausible goals setup`)
  console.log(`  site:     ${SITE_ID}`)
  console.log(`  API:      ${API_BASE}`)
  console.log(`  envfile:  ${envLoaded ? envFile : '(niet gevonden, gebruikt process env)'}`)
  console.log(`  mode:     ${DRY_RUN ? 'DRY RUN (geen API-calls)' : LIST ? 'LIST (alleen tonen)' : 'PROVISION'}`)
  console.log(`  goals:    ${GOALS.length} totaal\n`)

  if (DRY_RUN) {
    for (const g of GOALS) console.log(`  [dry-run] zou aanmaken: ${g.event}    (${g.note})`)
    console.log(`\n${GOALS.length} goals zouden worden aangemaakt. Run zonder --dry-run om echt te schrijven.`)
    return
  }

  // List existing first zodat we netjes "nieuw" vs "bestond al" kunnen tonen.
  const existing = await listExisting()
  if (!existing.ok) {
    console.error(`✗ Kon bestaande goals niet ophalen (status ${existing.raw.status}):`, existing.raw.body)
    console.error(`  Check of je API key de scope sites:provision:goals:read heeft`)
    process.exit(1)
  }
  console.log(`  bestaand: ${existing.count} goals al op site\n`)

  if (LIST) {
    for (const name of [...existing.names].sort()) {
      console.log(`  • ${name}`)
    }
    return
  }

  let created = 0, alreadyExisted = 0, failed = 0
  for (const g of GOALS) {
    if (existing.names.has(g.event)) {
      alreadyExisted++
      console.log(`  · ${g.event}  (bestond al)`)
      continue
    }
    const r = await createGoal(g.event)
    if (r.ok) {
      created++
      console.log(`  ✓ ${g.event}`)
    } else {
      failed++
      console.log(`  ✗ ${g.event}  status ${r.status}: ${JSON.stringify(r.body)}`)
    }
  }

  console.log(`\n— Klaar —`)
  console.log(`  ${created} nieuw aangemaakt`)
  console.log(`  ${alreadyExisted} bestond al`)
  console.log(`  ${failed} mislukt`)
  if (failed > 0) process.exit(1)

  console.log(`\nVolgende stap: log in op https://plausible.io/${encodeURIComponent(SITE_ID)} en zet de Funnels op`)
  console.log(`zoals beschreven in scripts/PLAUSIBLE_SETUP.md (Funnels kunnen helaas niet via API).`)
}

main().catch(err => {
  console.error('\n✗ Onverwachte fout:', err)
  process.exit(1)
})
