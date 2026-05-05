// Valideert dat src/data/project.js alle vereiste velden bevat en dat
// alle assets waar 'ie naar wijst daadwerkelijk in public/ bestaan. Faalt
// de check, faalt de build. Bedoeld als safety-net bij het optuigen van
// een nieuw project vanuit de template.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const errors = []
const warnings = []

function err(msg) { errors.push(msg) }
function warn(msg) { warnings.push(msg) }

const projectModulePath = path.join(ROOT, 'src/data/project.js')
if (!fs.existsSync(projectModulePath)) {
  console.error('check-content: src/data/project.js niet gevonden')
  process.exit(1)
}

const { project } = await import(pathToFileURL(projectModulePath).href)

// Vereiste top-level velden
const REQUIRED = [
  'id', 'name', 'displayName', 'tagline', 'shortDescription',
  'hero', 'gallery', 'units', 'sitePlan', 'process', 'planning',
  'highlights', 'priceComparison', 'phoneNumber', 'whatsappNumber',
  'brochureUrl', 'salesTeam', 'personaCopy',
]
for (const key of REQUIRED) {
  if (project[key] === undefined || project[key] === null) {
    err(`vereist veld ontbreekt: project.${key}`)
  }
}

// salesTeam structuur
if (project.salesTeam) {
  if (!project.salesTeam.bot?.name) err('project.salesTeam.bot.name ontbreekt')
  if (!project.salesTeam.bot?.org) err('project.salesTeam.bot.org ontbreekt')
  if (!project.salesTeam.rep?.name) err('project.salesTeam.rep.name ontbreekt')
}

// personaCopy: 4 personas, elk met 4 buckets
const PERSONAS = ['eigen_gebruiker', 'belegger', 'beide', 'onbekend']
const BUCKETS = ['microIntro', 'recommendCopy', 'handoff', 'waPhrase']
if (project.personaCopy) {
  for (const persona of PERSONAS) {
    const copy = project.personaCopy[persona]
    if (!copy) {
      err(`project.personaCopy.${persona} ontbreekt`)
      continue
    }
    for (const bucket of BUCKETS) {
      if (copy[bucket] === undefined) {
        err(`project.personaCopy.${persona}.${bucket} ontbreekt`)
      }
    }
    if (copy.handoff) {
      const handoff = copy.handoff
      if (!handoff.body) err(`project.personaCopy.${persona}.handoff.body is leeg`)
      if (!Array.isArray(handoff.valueBullets) || handoff.valueBullets.length === 0) {
        err(`project.personaCopy.${persona}.handoff.valueBullets is leeg`)
      }
      if (!handoff.observations?.default) {
        err(`project.personaCopy.${persona}.handoff.observations.default ontbreekt`)
      }
    }
  }
}

// Telefoon/WA-formaten
if (project.phoneNumber && !/^\d[\d\s\-]{6,}$/.test(project.phoneNumber)) {
  warn(`phoneNumber ziet er ongebruikelijk uit: ${project.phoneNumber}`)
}
if (project.whatsappNumber && !/^\+\d{8,}$/.test(project.whatsappNumber.replace(/\s/g, ''))) {
  warn(`whatsappNumber moet starten met + en alleen cijfers bevatten: ${project.whatsappNumber}`)
}

// Asset-bestaan in public/
function assertAsset(p, label) {
  if (!p) return
  if (p.startsWith('http')) return
  const full = path.join(ROOT, 'public', p.replace(/^\//, ''))
  if (!fs.existsSync(full)) err(`asset niet gevonden in public/: ${p} (verwacht: ${full}) [${label}]`)
}

assertAsset(project.hero, 'hero')
assertAsset(project.logo, 'logo')
assertAsset(project.brochureUrl, 'brochureUrl')
if (Array.isArray(project.gallery)) {
  project.gallery.forEach((img, i) => assertAsset(img.src, `gallery[${i}]`))
}
if (Array.isArray(project.units)) {
  project.units.forEach((u, i) => {
    if (u.image) assertAsset(u.image, `units[${i}].image`)
  })
}

// Units: minstens 1 unit met type + size + priceFrom (of beschikbaar=false)
if (Array.isArray(project.units) && project.units.length === 0) {
  err('project.units is een lege array')
}

// SitePlan: rows met units
if (project.sitePlan && (!Array.isArray(project.sitePlan.rows) || project.sitePlan.rows.length === 0)) {
  err('project.sitePlan.rows is leeg')
}

// uspCards: minstens 4
if (Array.isArray(project.uspCards) && project.uspCards.length < 4) {
  warn(`project.uspCards heeft ${project.uspCards.length} cards (minimum 4 aanbevolen voor goede swipe-ervaring)`)
}

// Output
if (warnings.length > 0) {
  console.warn('check-content: waarschuwingen')
  for (const w of warnings) console.warn(`  - ${w}`)
}

if (errors.length > 0) {
  console.error(`check-content: ${errors.length} fout${errors.length > 1 ? 'en' : ''}`)
  for (const e of errors) console.error(`  X ${e}`)
  console.error('\nproject-config niet compleet. Vul src/data/project.js aan en/of zorg dat alle assets in public/ staan.')
  process.exit(1)
}

console.log(`check-content: project "${project.displayName}" is compleet${warnings.length ? ` (${warnings.length} waarschuwing${warnings.length > 1 ? 'en' : ''})` : ''}`)
