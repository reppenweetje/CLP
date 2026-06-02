# CLP Template Duplication — Master Plan (HYBRIDE)

> **Doel**: in één Claude Code sessie + één ingevuld intake-formulier moet een nieuwe CLP voor een ander bedrijfsunits-project (Paveri, Animo, Elst BUnit, etc.) op `<slug>.clp.repp.nl` staan. Code, content, backend, deploy.
>
> **Audience**: deze file is een briefing voor een nieuwe Claude Code chat. Lees 'm volledig voor je begint. Stem af met Flip bij elke fase-overgang.
>
> **Status**: pre-flight beantwoord (zie sectie hieronder). Klaar om Fase 1 te starten.

---

## Architectuur-keuze: HYBRIDE

**Eén CLP-repo + één Vercel-project + N subdomeinen.** Niet fork-per-project.

```
GitHub:         reppenweetje/CLP (bestaand, gemarkeerd als canoniek)
Vercel:         clp project (bestaand)
Custom domains: dehofman.clp.repp.nl
                paveri.clp.repp.nl
                animo.clp.repp.nl
                ...
DNS:            per subdomein een CNAME → cname.vercel-dns.com
```

**Waarom hybride:**

| Aspect | Hybride wint |
|---|---|
| Update-rollout | 1 push → alle CLPs live tegelijk (ipv N pushes onderhouden) |
| Code-drift | Onmogelijk: alle CLPs draaien dezelfde versie |
| Brand-perceptie | klantnaam.clp.repp.nl — net zo schoon als forks |
| LocalStorage isolatie | Automatisch via subdomein-origin (gratis) |
| Cookies isolatie | Automatisch via subdomein |
| Plausible | Schoon segmenteerbaar per subdomein |
| Beheer-overhead | Laag bij 1-5 CLPs én bij 10+ |

**Wanneer NIET hybride (alarmsignalen voor fork in nieuwe archetype-repo):**
- Andere data-model (kavels ipv units, garageboxen, woningen-huur)
- Andere conversie-mechanic (direct iDeal ipv brochure-eerst)
- 60%+ ander code-pad door if/else's in components

Voor nu: focus op **archetype "bedrijfsunits-koop"** (Paveri / Animo / Elst BUnit / etc.). Hybride binnen dit archetype. Toekomstige archetypes (kavels, huur) krijgen hun eigen archetype-repo (óók hybride, maar apart van deze).

---

## Pre-flight afstemming (BEANTWOORD)

| Vraag | Antwoord |
|---|---|
| 1. Eén template-repo of aparte clp-template? | Eén hybride repo (`reppenweetje/CLP`). Geen forks per project. |
| 2. Forks divergeren / NPM-package? | Nvt — geen forks in hybride model. Code blijft monolithisch in 1 repo. |
| 3. Per-project Supabase / gedeeld? | Gedeeld blijven (`vgdwgjthvltucabqfysd` reppbot). Tenant-isolatie via `clp_<slug>` source + project-veld. |
| 4. Niet-vastgoed archetypes prioriteit? | Nee. Focus op bedrijfsunits-koop. Kavels/huur via aparte archetype-fork als ze komen. |
| 5. Portal-site (zoals dehofman.nl) per project? | Aparte repo per project — niet in CLP-repo opgenomen. |
| 6. Tijd-target per nieuwe CLP-setup? | 2-3u in 1 sessie als INTAKE compleet is + 30 min externe stappen. |

---

## Achtergrond — wat staat er al

- **WIZARD.md** (667 regels, 9 fases) — onboarding-handboek (loopt achter op recente features, moet update in Fase 5)
- **SETUP.md** — snelle start guide
- **ENV.md** — alle env vars
- **HANDOFF.md** — sales-team briefing
- **PROJECT_NOTES.md** + **STATUS.md** — work-in-progress notes
- **scripts/PLAUSIBLE_SETUP.md** — Plausible per project
- Template-mode trigger in **CLAUDE.md**
- **`npm run wizard:status`** validatie-script
- **`src/data/project.js`** als bedoeling-was-single-source-of-truth (maar code lekt nog om 'm heen)

---

## TL;DR — wat ontbreekt nog voor "klaar in 1 sessie"

1. **Code-decoupling** — 25+ hardcoded "De Hofman" / "Waarderpolder" / "€2.250" referenties in components + App.jsx → moeten in `project.js` / hostname-loader
2. **Hostname-loader bouwen** — `src/data/project.js` wordt een loader die `window.location.hostname` checkt en de juiste project-file uit `src/data/projects/<slug>.js` haalt
3. **API-routes hostname-aware** — Slack-webhooks, Brevo-list-IDs, etc. moeten per request afgeleid uit hostname (of server-side env-var per-domain)
4. **Gemini-prompt parameterisatie** — `project_meta` Supabase-tabel + dispatcher stuurt project-specifieke velden mee
5. **PROJECT_INTAKE.md** — gestructureerd klantformulier
6. **EXTERNAL_SETUP_RUNBOOK.md** — exacte commands voor Vercel custom-domain + DNS + Brevo + Slack + Supabase + n8n + Plausible
7. **WIZARD.md updaten** met intro-A/B, typing-first, walk-in support, Gemini v15, hybride model
8. **Vercel multi-domain config** — Vercel project-instellingen + env-vars per project (of prefixed shared)
9. **Dry-run** door fictief 2e project (Paveri) om alle gaten te vinden

Totaal: **14-22 uur**, opgesplitst in 7 fases hieronder.

---

## Audit: hardcoded waardes die uit code moeten

### `src/App.jsx`
| Lijn | Hardcoded | Naar |
|---|---|---|
| 316 | `highlights: { label: 'Waarom De Hofman' }` | `project.name` |
| 463 | `intro: 'Wat De Hofman onderscheidt.'` | `project.name` |
| 482 | `intro: 'Wat De Hofman voor beleggers interessant maakt.'` | `project.name` |
| 769 | `source: 'clp-de-hofman'` | `project.source` (afgeleid uit hostname) |
| 1019, 1027 | "De Hofman is een koop-project..." bot-text | `project.salesType` + `project.name` |
| 1101 | "beleggen op de Waarderpolder" | `project.cityArea` |
| 1107 | "rendement op De Hofman" | `project.name` |
| 1158 | "Bij De Hofman zijn er ook beleggers..." | `project.name` |
| 1484, 1548 | "Je hebt nu alles van De Hofman gezien." | `project.name` |
| 2049 | "in De Hofman" comment + bot-text | `project.name` |
| 2281 | `'Graag info over De Hofman'` WhatsApp prefill | `project.handoffPhrase` |

### `src/components/`
| File | Hardcoded | Naar |
|---|---|---|
| `LocationBubble.jsx:40` | "Haarlem, in de Metropoolregio Amsterdam" | `project.locationStory` |
| `LocationBubble.jsx:110` | "Amsterdam Zuidoost / Haarlem Spaarnwoude" | `project.locationBenchmarks[]` |
| `LocationBubble.jsx:205` | "Kaart van A. Hofmanweg, Haarlem" | `project.address` |
| `PriceCompareBubble.jsx:31` | "Prijsvergelijking Waarderpolder" | `project.cityArea` |
| `PriceCompareBubble.jsx:96` | "duurder dan De Hofman" | `project.name` |
| `RentabilityCalc.jsx:63` | "Waarderpolder €150-€200 per m²/jaar" | `project.rentBenchmark` |
| `IntroScreen.jsx:52` | "Geen spam, alleen relevante info over De Hofman" | `project.name` |
| `SuggestedChips.jsx:191` | "REPP, verkopend makelaar van De Hofman" | `project.name` |
| `CtaBubble.jsx:69` | "REPP is verkopend makelaar van De Hofman" | `project.name` |
| `AdminScreen.jsx:336` | "De Hofman dashboard" | `project.name` |
| `AdminScreen.jsx:403` | "Open de De Hofman CLP" | `project.name` |

### `supabase/functions/gemini-followup/prompt.ts`
Hardcoded in SYSTEM_PROMPT:
- "De Hofman in Haarlem"
- "Waarderpolder" (benchmark)
- "€2.250 per m²"
- "2-laags nieuwbouw bedrijfsunits"
- size_mapping (tot_50 → 100 m² (50 m² BG), etc.)

Allemaal naar `snapshot.project_name` / `project_city` / `benchmark_area` / `price_per_m2` / `unit_typology` / `size_mapping` velden die de dispatcher meestuurt vanuit `project_meta` Supabase-tabel.

### `package.json`
- `name: "clp-dehofman"` → `"clp"` (generic, want één repo voor alle projecten)

---

## De fases

Workflow: per fase een branch + PR. Geen direct push naar main.

### Fase 1: Hostname-loader + code-decoupling (5-7 uur)

**Doel**: één bundle die op basis van `window.location.hostname` automatisch de juiste project-data laadt. Zero hardcoded "De Hofman" buiten `src/data/projects/`.

**Stap 1.1 — Restructuur:**
```bash
mkdir src/data/projects
mv src/data/project.js src/data/projects/dehofman.js
```

**Stap 1.2 — Nieuwe loader:**
Maak `src/data/project.js` met:
```js
import dehofman from './projects/dehofman.js'

const PROJECTS = {
  'dehofman.clp.repp.nl': dehofman,
  'localhost':            dehofman,  // dev-fallback
}

function resolveProject() {
  if (typeof window === 'undefined') return dehofman
  const override = import.meta.env.VITE_PROJECT_OVERRIDE
  if (override && PROJECTS[override]) return PROJECTS[override]
  return PROJECTS[window.location.hostname] || dehofman
}

export const project = resolveProject()
```

**Stap 1.3 — Project.js schema uitbreiden:**

In `dehofman.js` toevoegen (allemaal uit huidige hardcoded waardes):
```js
{
  // existing fields blijven
  source:               'clp_dehofman',
  hostname:             'dehofman.clp.repp.nl',
  address:              'A. Hofmanweg, Haarlem',
  cityArea:             'Waarderpolder',
  locationStory:        'Een gevestigde bedrijvenlocatie in Haarlem, in de Metropoolregio Amsterdam.',
  locationBenchmarks: [
    { city: 'Amsterdam Zuidoost', distance: '12 min' },
    { city: 'Haarlem Spaarnwoude', distance: '8 min' },
  ],
  salesType:            'koop',
  unitTypology:         '2-laags nieuwbouw bedrijfsunits',
  pricePerM2:           2250,
  rentBenchmark:        { min: 150, max: 200, area: 'Waarderpolder', unit: '€/m²/jaar' },
  personaSet:           ['eigen_gebruiker', 'belegger', 'beide', 'huurder'],
  handoffPhrase:        'Graag info over De Hofman',
}
```

**Stap 1.4 — Code-decoupling:**
Search-and-replace in `App.jsx` + alle component-files. Vervang elke hardcoded string door `project.<field>` template-literal.

**Stap 1.5 — Verificatie:**
```bash
grep -r "De Hofman" src/ --include="*.{js,jsx}" | grep -v "comments\|projects/dehofman.js"
# Verwacht: 0 hits
```

**Definition of done:**
- `grep -r "De Hofman" src/` levert alleen comments of `projects/dehofman.js` op
- Build groen
- App draait nog correct met De Hofman op localhost en op preview-URL
- `VITE_PROJECT_OVERRIDE=test.clp.repp.nl npm run dev` werkt nog (al is er nog geen test-project)

### Fase 2: Gemini-prompt parameterisatie + project_meta tabel (3-4 uur)

**Doel**: gemini-followup edge function leest project-specifieke info uit Supabase, niet meer hardcoded.

**Stap 2.1 — Supabase migratie:**
```sql
CREATE TABLE project_meta (
  source            text PRIMARY KEY,    -- 'clp_dehofman', 'clp_paveri', etc.
  display_name      text NOT NULL,       -- 'De Hofman'
  city              text NOT NULL,       -- 'Haarlem'
  benchmark_area    text,                -- 'Waarderpolder'
  price_per_m2      int,                 -- 2250
  unit_typology     text,                -- '2-laags nieuwbouw bedrijfsunits'
  size_mapping      jsonb,               -- {"tot_50": "100 m² (50 m² BG)", ...}
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

INSERT INTO project_meta (source, display_name, city, benchmark_area, price_per_m2, unit_typology, size_mapping)
VALUES (
  'clp_dehofman', 'De Hofman', 'Haarlem', 'Waarderpolder', 2250,
  '2-laags nieuwbouw bedrijfsunits',
  '{"tot_50":"100 m² (50 m² BG)","rond_100":"200 m² (100 m² BG)","meer_dan_100":"meer dan 200 m² (meer dan 100 m² BG)"}'::jsonb
);
```

**Stap 2.2 — outbound-dispatcher uitbreiden:**
`processLead` haalt project_meta-rij op voor `lead.source` en voegt velden toe aan snapshot:
```js
const meta = await fetchProjectMeta(supa, lead.source)
const snapshot = {
  ...existing,
  project_name:   meta.display_name,
  project_city:   meta.city,
  benchmark_area: meta.benchmark_area,
  price_per_m2:   meta.price_per_m2,
  unit_typology:  meta.unit_typology,
  size_mapping:   meta.size_mapping,
}
```

**Stap 2.3 — prompt.ts herschrijven:**
Alle hardcoded "De Hofman in Haarlem" / "€2.250" / "Waarderpolder" / "2-laags" / size-mapping vervangen door template-literals die `{project_name}` / `{project_city}` / `{benchmark_area}` / `{price_per_m2}` / `{unit_typology}` placeholders gebruiken die door `buildPrompt(snapshot)` worden ingevuld.

**Stap 2.4 — Deploy + test:**
- Deploy v16 via MCP
- Test met De Hofman snapshot → output identiek aan v15
- Test met fictief Paveri snapshot (handmatig project_meta-rij toevoegen) → output gebruikt Paveri-waardes

**Definition of done:**
- `prompt.ts` heeft 0 hardcoded project-strings
- `project_meta` tabel gemigreerd en gevuld voor `clp_dehofman`
- Test met fictief project = aangepaste output

### Fase 3: PROJECT_INTAKE.md (1-2 uur)

**Doel**: één Markdown formulier dat klant invult vóór de Claude-sessie. Vult letterlijk de placeholder-velden van `src/data/projects/<slug>.js`.

**Structuur:**
```markdown
# Project Intake — CLP voor [PROJECTNAAM]

## A. Project-identiteit
- Project naam
- Slug (URL-vriendelijk)
- Adres + plaats
- Buurt / bedrijventerrein
- Tagline
- Sales-type (koop/huur/mixed)
- Unit-typologie

## B. Units + plattegrond
- Totaal aantal units
- Unit-types (L/XL/XXL of anders)
- Per type: m² BG + m² totaal + lagen
- Plattegrond-grid (rijen × kolommen + welke unit waar)
- Status per unit (available / sold_ov / sold / coming_soon)

## C. Pricing
- Vanaf-prijs
- Prijs per m²
- VVE per maand
- Btw-handling

## D. Persona-set (vink aan)
- [ ] Eigen gebruiker
- [ ] Belegger
- [ ] Beide
- [ ] Huurder

## E. Marketing-content
- 3-5 USPs
- 8-15 FAQ
- Locatie-story (2-3 zinnen)
- Locatie-benchmarks (3-4 nabije gebieden + reistijd)
- Process / planning

## F. Documenten + assets
- [ ] Hero image (3840×2160 jpg)
- [ ] Gallery (6+ impressies)
- [ ] Logo
- [ ] Video (optional)
- [ ] Brochure PDF
- [ ] Prijslijst PDF

## G. Mensen
- Sales contact (naam, foto, telefoon, WA, email)
- Reservation contact
- Beleggings-specialist (optioneel)

## H. Externe accounts (klant levert toegang)
- [ ] Brevo account
- [ ] Meta Business Manager (Pixel)
- [ ] Plausible (kan REPP-account herbruiken)
- [ ] Slack workspace

## I. Backend routing (REPP intern)
- CLP source key: clp_<slug>
- n8n project label (Tharwat)
- Brevo PORTAL list ID
- Slack hot-leads channel + webhook
- Evolution WhatsApp instance
- CRM project label

## J. Optioneel
- [ ] Mortgage calculator (alleen koop)
- [ ] Rentability calculator
- [ ] Walk-in portal site (aparte repo)
```

**Definition of done:**
- `PROJECT_INTAKE.md` bestaat met alle relevante velden
- Mapping-tabel achterin: intake-veld → projectfile-veld of externe stap
- De Hofman gevulde intake als referentie-voorbeeld in `examples/intake-dehofman.md`

### Fase 4: EXTERNAL_SETUP_RUNBOOK.md (1-2 uur)

**Doel**: één Markdown file met EXACTE commands per externe stap.

**Inhoud (skeleton):**
```markdown
# Externe Setup Runbook (HYBRIDE)

Per nieuw CLP-project. Pak PROJECT_INTAKE.md erbij voor de waardes.
Standaard 5 stappen, 30-45 min totaal.

## 1. Vercel custom domain
Vercel dashboard → CLP project → Settings → Domains → Add Domain
- Voer in: <slug>.clp.repp.nl
- Verify

## 2. DNS CNAME
Bij registrar (Cloudflare/registrar van klant):
- Type: CNAME
- Naam: <slug>.clp.repp.nl
- Waarde: cname.vercel-dns.com
- TTL: 3600

Wacht 1-5 min op propagatie.

## 3. Supabase config
### 3a. project_meta tabel
```sql
INSERT INTO project_meta (source, display_name, city, ...)
VALUES ('clp_<slug>', '...', '...', ...);
```

### 3b. outbound_settings stage 1
```sql
INSERT INTO outbound_settings (project, stage, delay_days, delay_minutes, message_template)
VALUES ('clp_<slug>', 1, 0, 1, '{ai_summary}');
```

## 4. n8n project routing (Tharwat)
Stuur ticket:
- Source key: clp_<slug>
- Stage 1 template: {ai_summary}
- Evolution instance: repp
- Test-payload meegestuurd

## 5. Brevo PORTAL list
Brevo dashboard → Contacts → Lists → Create List
- Name: PORTAL_<SLUG>
- Note list_id, voeg toe aan Vercel env-vars als BREVO_LIST_<SLUG>

## 6. Slack hot-leads channel
- Maak #hot-leads-<slug> kanaal in REPP workspace
- Install Incoming Webhook app op kanaal
- Note webhook-URL, voeg toe aan Vercel env-vars als SLACK_WEBHOOK_<SLUG>

## 7. Plausible
Plausible dashboard → Sites → bestaande clp.repp.nl site → properties
- Custom Property: project (sturen we al via track('event', { props: { project: '<slug>' }}))
- Of: aparte site aanmaken voor <slug>.clp.repp.nl als de klant aparte rapportage wil

## 8. Meta Pixel
Optie A: bestaande REPP Pixel hergebruiken (events tags met project-prop)
Optie B: nieuwe Pixel voor klant — moet Meta Business Manager toegang van klant

## 9. Smoke-test op live URL
- Open <slug>.clp.repp.nl
- Doorloop chat-flow
- Verifieer: lead komt in Supabase met source=clp_<slug>
- Verifieer: WhatsApp-bericht arriveert na ~1 min (Gemini-followup met juiste project-data)
- Verifieer: Slack-notify in juist kanaal
- Verifieer: Brevo-contact in juiste lijst
```

**Definition of done:**
- Runbook compleet
- Tijds-indicatie per stap
- Troubleshooting-hint per stap
- Test door 'm zelf te volgen voor De Hofman als sanity-check

### Fase 5: WIZARD.md updaten + dry-run (4-5 uur)

**Doel**: bestaande WIZARD bijwerken met recente features + hybride model. Dan hypothetische 2e project doorlopen om gaten te vinden.

**Updates:**
- Intro-A/B variant (skip-vs-show) — uitleggen waar 't aan/uit kan
- Typing-first bubble — default
- Walk-in portal-support (aparte repo, niet in CLP)
- Gemini v15 prompt — uitleggen wat 't doet, hoe te tweaken
- outbound_settings template format
- Carousel mouse-support (klikbare dots + drag)
- **Belangrijkste: alle wijzigingen die fork-flow assumed → vervangen door hybride workflow**

**Dry-run:**
- Kies hypothetisch project "Paveri BUnit"
- Loop WIZARD + INTAKE + RUNBOOK door tot we klaar zijn
- Noteer elk moment waar Claude een vraag stelt die niet door INTAKE wordt afgevangen → INTAKE aanvullen
- Noteer elke "stuk vast" moment → process verbeteren

**Definition of done:**
- WIZARD current
- Dry-run completed
- Gaten geadresseerd in INTAKE / RUNBOOK / WIZARD

### Fase 6: API-routes hostname-aware (2-3 uur)

**Doel**: server-side routing (Slack, Brevo, etc.) per request afgeleid uit hostname.

**Acties:**
1. Helper `src/lib/serverProject.ts`:
```ts
export function getProjectFromRequest(req: Request) {
  const host = req.headers.get('host') || ''
  // Lookup in project-config (server-side mirror van loader)
  return PROJECT_CONFIG[host] || PROJECT_CONFIG.default
}
```

2. Per-project secrets via Vercel env-vars met prefix:
   - `SLACK_WEBHOOK_DEHOFMAN`, `SLACK_WEBHOOK_PAVERI`
   - `BREVO_LIST_DEHOFMAN`, `BREVO_LIST_PAVERI`
   - Helper resolvet via hostname → suffix

3. Update routes die nu hardcoded webhooks/lists hebben:
   - `api/slack-notify.ts`
   - `api/callback-request.ts` (al via Supabase, OK)
   - Brevo-trigger in `lead-upsert` edge function — moet ook project-aware

**Definition of done:**
- Alle API-routes/edge-functions kiezen externe destinations via hostname/source
- Test met fictief project via VITE_PROJECT_OVERRIDE

### Fase 7: Handoff doc + final polish (1 uur)

**Doel**: nieuwe Claude-sessies + nieuwe REPP-medewerkers kunnen zelfstandig nieuwe CLPs starten.

**Acties:**
1. README.md updaten: bovenaan duidelijk "Dit is een HYBRIDE CLP-template (1 repo, N subdomeinen)"
2. `README_NEW_PROJECT.md` korte 5-stappen handoff:
   1. Klant levert PROJECT_INTAKE.md
   2. Claude Code: "Setup nieuwe CLP voor <slug>"
   3. Claude maakt `src/data/projects/<slug>.js` + assets + loader-entry + PR
   4. Jij merget PR → Vercel deployt
   5. Volg EXTERNAL_SETUP_RUNBOOK voor de 5 externe stappen (~30 min)
3. CLAUDE.md update: template-mode trigger → wijst nu naar hybride-flow ipv fork

---

## Tijdslijn-inschatting (totaal: 14-22 uur)

| Fase | Werk | Tijd |
|---|---|---|
| 1 | Hostname-loader + code-decoupling | 5-7 uur |
| 2 | Gemini-prompt parameterisatie + project_meta | 3-4 uur |
| 3 | PROJECT_INTAKE.md | 1-2 uur |
| 4 | EXTERNAL_SETUP_RUNBOOK.md | 1-2 uur |
| 5 | WIZARD.md update + dry-run | 4-5 uur |
| 6 | API-routes hostname-aware | 2-3 uur |
| 7 | Handoff doc + polish | 1 uur |

Verspreid over 3-4 werkdagen redelijk. Of 7 PRs van 1-3 uur elk.

---

## Hoe deze plan-file gebruiken in een nieuwe Claude Code chat

1. Open nieuwe Claude Code chat in CLP-repo (`cd /Users/flip/CLP`).
2. Eerste prompt aan de nieuwe Claude:

   > "Lees `/Users/flip/CLP/TEMPLATE_DUPLICATION_PLAN.md` volledig. Dat is je briefing. Pre-flight is al beantwoord — we doen hybride. Begin met Fase 1: hostname-loader bouwen + code-decoupling. Werk in een branch, open PR per fase."

3. Per fase: branch + PR + jij merged → Vercel deployt.

4. Na Fase 7: nieuwe sessie voor echt klant-project (bv Paveri) doet end-to-end test.

---

## Belangrijke "weet je nogs"

- **Workflow**: PRs naar main, geen direct push. Branch-naming: `template/<fase>-<kort>`.
- **CLP repo deployt via Vercel** (auto bij merge). Coolify is Tharwat's WA-bot, niet relevant voor CLP.
- **Supabase MCP** beschikbaar voor SQL + edge function deploys op `vgdwgjthvltucabqfysd`.
- **n8n V3 wijzigingen** doet Tharwat. Wij leveren specs in tekst.
- **Tone of voice**: sentence case, NL interpunctie, `npm run check-copy` bewaakt.
- **Geen "De Hofman" in nieuwe code** — gebruik `project.name`, `project.cityArea`, etc.
- **Test elke fase met `npm run build`** voor merge.
- **Architectuur is HYBRIDE**: 1 repo, 1 Vercel project, N subdomeinen. Geen forks per project (alleen voor andere archetypes).
- **Per-project content** in `src/data/projects/<slug>.js`, **gedeelde code** in `src/components/` + `src/lib/` + `src/App.jsx`.

---

## Vragen voor Flip tijdens uitvoering (Claude moet stellen waar nodig)

Per fase als er twijfel is, deze openhouden:

1. **Hostname-format voor subdomeinen**: `<slug>.clp.repp.nl` — bevestig dat dit het patroon wordt. Of liever `<slug>.repp.nl` of `clp.repp.nl/<slug>` (path-based, niet aanbevolen) of klant-eigen-domein (bv `clp.paveri.nl`)?
2. **Vercel env-vars strategie**: prefixed per project (`SLACK_PAVERI`, `SLACK_DEHOFMAN`) of één JSON-blob (`PROJECTS_CONFIG`)?
3. **Bundle-size threshold**: vanaf hoeveel CLPs (5? 10?) gaan we dynamic imports per project doen om bundle-grootte te beperken? Voor nu niet kritiek.
4. **Archetype-naam**: gaan we ooit een tweede archetype (kavels/huur) doen, en zo ja wanneer? Bepaalt of we nu al een `clp-kavels` repo voorbereiden of pas later.

---

*Geschreven door Claude Opus 4 (1M context) op 2026-06-02 als briefing voor de volgende Claude-sessie. Hybride architectuur bevestigd door Flip. Update vrij als scope wijzigt.*
