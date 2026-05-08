#!/usr/bin/env node
// Wizard-status checker voor de CLP-template.
// Detecteert per fase wat al gedaan is en wat nog open staat zodat
// Claude (of een handmatige nieuwe collega) snel weet waar de wizard
// gebleven is. Niet-blokkerend: faalt nooit, retourneert altijd 0.
// Run: npm run wizard:status

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function readFile(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf-8') } catch { return '' }
}
function fileExists(rel) {
  try { return fs.statSync(path.join(ROOT, rel)).isFile() } catch { return false }
}

const projectJs = readFile('src/data/project.js')
const pkgJson = readFile('package.json')
const readmeMd = readFile('README.md')
const privacyHtml = readFile('public/privacy.html')
const architectuurHtml = readFile('public/architectuur.html')
const claudeMd = readFile('CLAUDE.md')

const phases = []

// ── FASE 1: Project-basis ──────────────────────────────────────────────────
phases.push({
  id: 1,
  name: 'Project-basis',
  hint: 'Identiteit, sales team, contact-kanalen',
  checks: [
    {
      name: "project.id is aangepast (niet meer 'de-hofman')",
      pass: !/id:\s*['"]de-hofman['"]/.test(projectJs),
      hint: "Bewerk src/data/project.js: id: 'jouw-project-slug'",
    },
    {
      name: "project.displayName is aangepast (niet meer 'De Hofman')",
      pass: !/displayName:\s*['"]De Hofman['"]/.test(projectJs),
      hint: "Bewerk src/data/project.js: displayName: 'Jouw Project'",
    },
    {
      name: 'project.tagline is ingevuld',
      pass: /tagline:\s*['"][^'"]{3,}['"]/.test(projectJs),
      hint: "Bewerk src/data/project.js: tagline: 'Korte zin met locatie of waarde'",
    },
    {
      name: 'phoneNumber is ingevuld',
      pass: /phoneNumber:\s*['"][^'"]{6,}['"]/.test(projectJs),
      hint: 'Bewerk src/data/project.js: phoneNumber',
    },
    {
      name: 'whatsappNumber is ingevuld',
      pass: /whatsappNumber:\s*['"]\+?\d[\d\s]{6,}['"]/.test(projectJs),
      hint: 'Bewerk src/data/project.js: whatsappNumber (begint met +)',
    },
    {
      name: 'salesTeam.bot.name is gezet',
      pass: /bot:\s*\{[^}]*name:\s*['"][^'"]+['"]/m.test(projectJs),
      hint: "Bewerk src/data/project.js: salesTeam.bot.name = 'Naam van chat-persona'",
    },
    {
      name: 'package.json name is aangepast',
      pass: !/"name":\s*"repp-clp-demo"/.test(pkgJson),
      hint: 'Bewerk package.json: name veld naar jouw project-slug',
    },
  ],
})

// ── FASE 2: Inhoud + assets ────────────────────────────────────────────────
phases.push({
  id: 2,
  name: 'Inhoud + assets',
  hint: 'Beelden, brochure, units, persona-copy, marketing-content',
  checks: [
    {
      name: 'public/images/hero.jpg bestaat',
      pass: fileExists('public/images/hero.jpg'),
      hint: 'Plaats hero.jpg in public/images/ (representatief openingsbeeld)',
    },
    {
      name: 'public/images/exterieur.jpg bestaat',
      pass: fileExists('public/images/exterieur.jpg'),
      hint: 'Plaats exterieur.jpg in public/images/',
    },
    {
      name: 'public/brochure.pdf bestaat',
      pass: fileExists('public/brochure.pdf'),
      hint: 'Plaats brochure.pdf in public/ (max ~15MB voor Vercel)',
    },
    {
      name: 'project.units bevat tenminste 1 unit',
      pass: /units:\s*\[\s*\{/.test(projectJs),
      hint: "Bewerk src/data/project.js: units array met type, size, priceFrom, image, pitch",
    },
    {
      name: 'personaCopy.eigen_gebruiker.microIntro is aangepast',
      pass: !/microIntro:\s*['"]Helemaal goed\. Dan ga ik je wat meer laten zien over De Hofman/.test(projectJs),
      hint: 'Herschrijf de personaCopy buckets in src/data/project.js naar jouw eigen tone-of-voice',
    },
    {
      name: 'highlights array is gevuld',
      pass: /highlights:\s*\[\s*\{/.test(projectJs),
      hint: 'Vul project.highlights met 6-8 USPs',
    },
    {
      name: 'check-content groen draait',
      pass: tryRunCheckContent(),
      hint: 'npm run check-content moet groen zijn voor je verder kunt',
    },
  ],
})

// ── FASE 3: Stijl + tone ───────────────────────────────────────────────────
phases.push({
  id: 3,
  name: 'Stijl + tone',
  hint: 'Brand tokens, copy-validatie',
  checks: [
    {
      name: 'check-copy is groen (geen leesstreepjes)',
      pass: tryRunCheckCopy(),
      hint: 'npm run check-copy moet 0 violations geven (em-dashes, interpuncts, en-dashes)',
    },
  ],
})

// ── FASE 4: Build + lokaal valideren ──────────────────────────────────────
phases.push({
  id: 4,
  name: 'Build + lokaal valideren',
  hint: 'Production-build moet groen zijn',
  checks: [
    {
      name: 'dist/ map bestaat (laatste build is gedraaid)',
      pass: fileExists('dist/index.html'),
      hint: 'Run npm run build om een productie-bundle te maken',
    },
  ],
})

// ── FASE 5: Hosting + analytics ───────────────────────────────────────────
phases.push({
  id: 5,
  name: 'Hosting + analytics',
  hint: 'Vercel deploy, domein, Plausible',
  checks: [
    {
      name: 'README mentioned niet meer alleen De Hofman als pilot',
      pass: !/Eerste pilot:\s*\*\*De Hofman\*\*/.test(readmeMd) || /\[NIEUW PROJECT\]|jouw-project/.test(readmeMd),
      hint: 'Werk README.md bij naar de huidige live-status van jouw project',
    },
    {
      name: 'public/privacy.html is aangepast (niet meer alleen De Hofman)',
      pass: privacyHtml.length > 0 && (privacyHtml.match(/De Hofman/g) || []).length < 3,
      hint: 'Vervang "De Hofman" referenties in public/privacy.html naar jouw project + verkopend makelaar',
    },
    {
      name: 'public/architectuur.html is aangepast',
      pass: architectuurHtml.length > 0 && (architectuurHtml.match(/De Hofman/g) || []).length < 3,
      hint: 'Vervang "De Hofman" referenties in public/architectuur.html',
    },
  ],
})

// ── FASE 6: Optionele integraties ─────────────────────────────────────────
// Deze checks zijn informatief: ze geven aan welke integraties wel/niet
// geconfigureerd zijn, niet of dat goed of fout is. De wizard vraagt eerst
// welke je wil gebruiken.
phases.push({
  id: 6,
  name: 'Optionele integraties (informatief)',
  hint: 'Status van Slack, Supabase, admin-panel',
  optional: true,
  checks: [
    {
      name: 'api/slack-hot.js bestaat (Slack hot-lead pipeline aanwezig)',
      pass: fileExists('api/slack-hot.js'),
      hint: 'Slack-pipeline wordt automatisch meegeleverd in de template; SLACK_WEBHOOK_URL in Vercel env voor activatie',
      optional: true,
    },
    {
      name: 'src/lib/api.js bestaat (Supabase wiring aanwezig)',
      pass: fileExists('src/lib/api.js'),
      hint: 'Supabase wiring zit in de template; activeer met VITE_SUPABASE_ENABLED=true',
      optional: true,
    },
    {
      name: 'supabase/ folder met migrations + Edge Function aanwezig',
      pass: fileExists('supabase/README.md'),
      hint: 'Volg supabase/README.md briefing voor backend-dev hand-off',
      optional: true,
    },
    {
      name: 'Admin password gate component aanwezig',
      pass: fileExists('src/components/admin/AdminPasswordGate.jsx'),
      hint: 'Admin panel zit in de template, configureer password in src/components/admin/AdminPasswordGate.jsx',
      optional: true,
    },
  ],
})

// ── FASE 7: Hand-off ──────────────────────────────────────────────────────
phases.push({
  id: 7,
  name: 'Hand-off klaar',
  hint: 'Sales-team weet wat ze moeten doen',
  checks: [
    {
      name: 'HANDOFF.md is aangepast aan jouw project',
      pass: fileExists('HANDOFF.md') && !/\{\{PROJECT_NAAM\}\}/.test(readFile('HANDOFF.md')),
      hint: 'Vul de placeholders in HANDOFF.md (projectnaam, channel-namen, contactpersonen)',
    },
  ],
})

// ── Helpers ───────────────────────────────────────────────────────────────
function tryRunCheckContent() {
  try {
    execSync('node scripts/check-content.mjs', { cwd: ROOT, stdio: 'pipe' })
    return true
  } catch { return false }
}

function tryRunCheckCopy() {
  try {
    execSync('node scripts/check-copy.mjs', { cwd: ROOT, stdio: 'pipe' })
    return true
  } catch { return false }
}

// ── Print ─────────────────────────────────────────────────────────────────
const lines = []
let totalChecks = 0
let totalPassed = 0
let firstIncomplete = null

for (const p of phases) {
  const total = p.checks.length
  const passed = p.checks.filter((c) => c.pass).length
  totalChecks += total
  totalPassed += passed

  let icon
  if (p.optional) icon = passed === total ? 'i ' : 'i '
  else if (passed === total) icon = '+ '
  else if (passed === 0) icon = 'x '
  else icon = '~ '

  lines.push('')
  lines.push(`${icon}Fase ${p.id}: ${p.name}  (${passed}/${total})`)
  lines.push(`   ${p.hint}`)
  for (const c of p.checks) {
    const sub = c.pass ? '   ok ' : c.optional ? '   .. ' : '   .. '
    lines.push(`${sub}${c.pass ? '+' : c.optional ? 'i' : '-'} ${c.name}`)
    if (!c.pass && c.hint) lines.push(`        > ${c.hint}`)
  }
  if (!firstIncomplete && passed < total && !p.optional) firstIncomplete = p
}

const required = phases.filter((p) => !p.optional)
const requiredPassed = required.reduce((a, p) => a + p.checks.filter((c) => c.pass).length, 0)
const requiredTotal = required.reduce((a, p) => a + p.checks.length, 0)
const pct = requiredTotal > 0 ? Math.round((requiredPassed / requiredTotal) * 100) : 0

console.log('\nCLP wizard status\n' + '='.repeat(60))
console.log(`Verplichte stappen: ${requiredPassed}/${requiredTotal} (${pct}%)`)
if (firstIncomplete) {
  console.log(`Volgende fase met openstaande punten: Fase ${firstIncomplete.id} (${firstIncomplete.name})`)
} else {
  console.log('Alle verplichte stappen voltooid. Tijd voor smoke-test op productie.')
}
console.log(lines.join('\n'))
console.log('')
console.log('Legenda:  +  klaar   -  open   ~  deels klaar   i  optioneel')
console.log('')

// Exit 0 altijd: status-tool, geen gate. CI/build-gates zijn check-content + check-copy + build.
process.exit(0)
