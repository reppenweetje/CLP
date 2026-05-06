# CLAUDE.md

Project-specifieke instructies voor Claude Code sessies. Lees dit eerst bij het openen van deze repo.

## Template-modus: nieuw project opzetten

Deze repo is óók een GitHub-template. Als je deze repo net gekloond hebt voor een nieuw project, of als de gebruiker zegt **"nieuw project"**, **"setup nieuwe CLP"**, **"start nieuwe template"** of iets in die richting, doorloop dan de wizard hieronder. Ga pas verder met development als de wizard klaar is.

**Detecteer of dit een verse template is**: kijk of `src/data/project.js` nog `id: 'de-hofman'` bevat én of de gebruiker actief om een setup vraagt. Anders niets doen — de gebruiker werkt waarschijnlijk gewoon door op De Hofman.

### Stap 0 — Welk type project?

**Allereerste vraag aan de gebruiker** (vóór alle andere wizard-stappen):

> "Voor we beginnen, even checken: dit project is **vergelijkbaar met De Hofman** — dus vastgoed-koop, units met m², persona belegger of eigen-gebruiker, NL-context? Of is dit iets anders, bijvoorbeeld woningen, garageboxen, kavels of bedrijfsruimte-huur?"

Op basis van het antwoord:
- **Antwoord: vergelijkbaar met De Hofman** → ga naar **Pad A: standaard content-fill** (Stap 1-9 hieronder)
- **Antwoord: iets anders** → ga naar **Pad B: co-design mode** (Stap A-E hieronder)

### Pad B — Co-design mode (alleen bij afwijkend project-type)

De huidige flow.js, recommendation.js en buyingSignals.js gaan uit van bedrijfsunit-koop. Bij een afwijkend project-type pas je deze samen met de gebruiker aan. **Bouw geen pre-built archetypes** — Claude Code ontwerpt de aangepaste flow op het moment zelf, samen met de gebruiker.

De Hofman blijft de referentie-implementatie. Lees `src/data/flow.js`, `src/data/project.js` (met name `personaCopy` en `units`), `src/lib/recommendation.js` (met name `recommendUnit` + `recommendCopy`), en `src/lib/buyingSignals.js` om te begrijpen welke patronen er zijn voordat je gaat aanpassen.

**Stap A — Begrijp het project**
Stel deze vragen één voor één:
1. Wat verkoop je precies? (woningen / garageboxen / kavels / ligplaatsen / bedrijfsruimte-huur / iets anders)
2. Wat is de typische koper? Beschrijf 1-3 personas in eigen woorden
3. Wat zijn de top-3 factoren waarop een koper zijn keuze baseert? (voorbeelden: locatie, prijs, oppervlakte, opbrengst, omgeving, indeling, opleverdatum)
4. Wat zijn typische dealbreakers? (afhaak-redenen)
5. Welk gedrag verraadt sterke koop-intentie? (bv. meerdere units bekijken, een prijs-tool gebruiken, terugkomen op de site)

Schrijf de antwoorden kort op in een notitie zodat ze door de volgende stappen heen consistent blijven.

**Stap B — Ontwerp de vragen-flow**
Kijk naar `src/data/flow.js` als referentie. De Hofman heeft: `intent → availabilityCheck → brochureTrigger → lead-capture → size → timeline → moreInfo → followup`. Voor jouw project:
1. Wat is de natuurlijke openings-vraag (de "intent" equivalent)? Welke 3-5 antwoord-chips passen daarbij? Welke persona koppelt aan welk antwoord?
2. Welke 1-3 kwalificerende vragen heb je nodig vóór je een aanbeveling kunt doen? (voor De Hofman: size + timeline)
3. Op welk moment vraag je e-mail/naam/06? Hetzelfde als De Hofman (na brochure-trigger) of eerder/later?
4. Welke afhaak-redenen passen bij dit type project? Vervang de huidige `afhaakReasons.options`.
5. Wil je een rentRange-pad zoals De Hofman (huur-match queue) of niet?

Pas `src/data/flow.js` aan met de nieuwe vragen en chip-opties. Houd de keys consistent met de App.jsx-state-machine: bestaande currentQuestion-namen (`intent`, `size`, `timeline`, `moreInfo`, etc.) blijven werken. Als je een nieuwe stap toevoegt, voeg 'm ook toe aan `ANSWER_ORDER` in `src/App.jsx`.

**Stap C — Ontwerp de aanbeveling**
Kijk naar `src/lib/recommendation.js::recommendUnit` als referentie. De Hofman doet "L of XXL" op basis van size-id. Voor jouw project:
1. Welke eenheden/objecten kan een bezoeker uit kiezen? (units, kavels, ligplaatsen, modellen)
2. Welk veld(en) in `project.units` (of een vervanger) bepaalt welke wordt aanbevolen?
3. Op basis van welke antwoorden kies je welke aanbeveling? Schrijf de logica uit in `recommendUnit(answers, project)` voor dit project.
4. Past `project.units` shape (type, size, levels, priceFrom, image, pitch, uses, stateLabel) of moet 'ie aangepast? Als 'ie aangepast moet, doe dat consistent — `UnitBubble.jsx` en `ServiceCardBubble.jsx` gebruiken deze velden.

**Stap D — Koop-signalen**
Kijk naar `src/lib/buyingSignals.js::SIGNAL_DEFS` als referentie. Belangrijke signalen voor De Hofman: `unit_detail_multi`, `rentability_calc`, `mortgage_calc`, `timeline_zsm`, `lead_phone`. Voor jouw project:
1. Welke 3-5 sterke koop-signalen passen bij jouw archetype? Voorbeelden voor woningen: bezichtiging-aanvraag bekeken, hypotheek-tool gebruikt, zoekprofiel ingeschoten. Voor garageboxen: meerdere units bekeken, prijs-vergelijking gedaan.
2. Welke 1-2 negatieve signalen? (afhaak, onduidelijke timeline, niet bereid 06 te delen)
3. Pas `SIGNAL_DEFS`-gewichten aan zodat de drempels (hot ≥ 50, warm ≥ 25) realistisch zijn voor jouw flow. Test met `?debug=1` op de live demo.
4. Verwijder calc-signalen die niet relevant zijn (bv. `rentability_calc` als er geen BAR-tool is) en de bijbehorende calc-component uit `SitePlanBubble.jsx` als die er niet meer toe doet.

**Stap E — Personas + content**
Daarna ga je verder met de standaard content-fill, maar met de **nieuwe personas** uit Stap A in plaats van eigen-gebruiker/belegger/beide/onbekend. Pas `personaCopy` in `project.js` aan: rename de keys, herschrijf alle copy in jouw tone-of-voice. Update ook `derivePersona()` in `src/lib/scoring.js` als de persona-namen anders zijn.

Daarna terug naar **Pad A vanaf Stap 3** (contact + assets + units + content) — die stappen zijn project-type-onafhankelijk.

### Pad A — Standaard content-fill (voor De Hofman-achtige projecten)

Stel de vragen één voor één. Geef bij elke vraag een voorbeeld uit De Hofman als referentie. Schrijf de antwoorden samen op naar `src/data/project.js`. Run aan het einde `npm run check-content` om te valideren.

**Stap 1 — projectbasis**
- `id` (slug, lowercase met streepjes): bv. `de-hofman`, `het-anker`
- `name` (lowercase): bv. `de hofman`
- `displayName` (titlecase): bv. `De Hofman`, `Het Anker`
- `tagline`: 1 regel, sentence case, vaak met locatie. bv. `Omdat Haarlem werkt.`
- `shortDescription`: 1 zin met aantal units en locatie. bv. `14 hoogwaardige bedrijfsunits in Haarlem Waarderpolder.`

**Stap 2 — sales team**
- `salesTeam.bot.name`: chat-persona, default `Jesse`
- `salesTeam.bot.org`: organisatie, default `REPP`
- `salesTeam.rep.name`: collega die belt, default `Jann`
- `salesTeam.rep.context`: korte marktcontext voor de handoff-copy. bv. `Waarderpolder-markt`, `centrum Utrecht-markt`

**Stap 3 — contact**
- `phoneNumber`: outbound bel-nummer voor header en cta-card
- `whatsappNumber`: WA-nummer (begint met `+`, alleen cijfers en spaties)
- `brochureUrl`: pad naar de brochure-PDF, default `/brochure.pdf` (zorg dat je `public/brochure.pdf` plaatst)

**Stap 4 — assets-checklist**
Vraag de gebruiker om de volgende files in `public/images/` te plaatsen voordat je doorgaat:
- `hero.jpg` — exterieur of representatief beeld
- `exterieur.jpg` — extra exterieur shot
- 4-6 sfeerbeelden voor de gallery (mix exterieur + ingerichte units)
- 1 beeld per unit-type (`unit-l.jpg`, `unit-xl.jpg`, etc.)
Plus `public/brochure.pdf`. Run `npm run check-content` om te zien of alles aanwezig is.

**Stap 5 — units en pricing**
Vraag per unit-type: type-letter (L, XL, XXL), m², aantal lagen, prijs vanaf, beschikbaarheid (available/sold/coming_soon), pitch-zin, gebruiks-tags (`['opslag', 'showroom', ...]`). Bouw `project.units` en `project.sitePlan.rows`.

**Stap 6 — persona-copy** (per persona: eigen_gebruiker, belegger, beide, onbekend)
Voor elke persona vraag je:
- `microIntro`: korte zin direct na de intent-keuze
- `recommendCopy`: 1-2 zinnen na de unit-aanbeveling op het niet-hot-pad
- `handoff.observations.calc / .multiUnit / .default`: korte erken-zinnen
- `handoff.shortTimelineHeadline`: zin als bezoeker korte timeline koos
- `handoff.body`: 2-3 zinnen die normaliseren ("een bedrijfsunit koop je niet zomaar") en de collega introduceren
- `handoff.valueBullets`: 3 bullets met wat de call concreet oplevert
- `waPhrase`: zin in de eerste persoon voor het prefilled WhatsApp-bericht (bv. `Ik kijk als belegger`)

Bied de De Hofman versie aan als startpunt en pas aan op suggestie van de gebruiker. Voor `onbekend` mag `waPhrase` leeg zijn.

**Stap 7 — overige content**
- `highlights`: 6-8 USPs (title + body per stuk)
- `uspCards`: 6 cards (zie shape in De Hofman)
- `process`: 6 stappen van oriëntatie tot oplevering
- `planning`: 4 fases met dates
- `priceComparison`: rows met vergelijkbare projecten in dezelfde markt (peildatum + name + tag + price + isOurs flag)
- `investor`: alleen als belegger-doelgroep (BAR-bandbreedte, kernfactoren, fiscale punten); anders leeg laten
- `location`: bereikbaarheid + omgeving + kaart-coords
- `contentCards`: 6-7 generieke content-cards

**Stap 8 — bouw + check**
1. `npm install` als nog niet gedaan
2. `npm run check-content` — moet groen zijn voordat je verder kan
3. `npm run check-copy` — Nederlandse interpunctie-check
4. `npm run build` — full build verificatie
5. `npm run dev` en doorloop de chat zelf om te zien of alle copy klopt
6. Update `package.json` `name` en `description` naar het nieuwe project
7. Update deze `CLAUDE.md` zodat de "Wat is dit" sectie het nieuwe project beschrijft
8. Pas `public/architectuur.html` en `public/privacy.html` aan op het nieuwe project (zoek-en-vervang `De Hofman` / `Waarderpolder` / `Jann`)

**Stap 9 — deploy**
- Push naar een nieuwe Vercel-project (één per CLP)
- Test header-WA, brochure-flow, hot-pad en cta-card eindes

### Voorbeelden van afwijkende archetypes (referentie voor co-design mode)

Niet als preset bedoeld, wel als illustratie van hoe de wizard er voor andere project-types uit zou zien:

**Garageboxen-koop** (klein, persoonlijk, opslag-/hobby-driven)
- Personas: eigen-gebruik (opslag/hobby) / belegger (verhuur aan particulier)
- Kwalificerende vragen: gewenste oppervlakte (10-30 m²), gebruik (auto/opslag/atelier), gewenste locatie-radius
- Aanbeveling: type box (single/double/oversized) op basis van gebruik
- Signalen: meerdere boxen bekeken, locatie-info opgevraagd, prijs-vergelijking gedaan
- Vervalt: BAR-rendementscalc (opbrengsten te klein/anders), hypotheek-tool (vaak cash betaald)

**Woningen-koop** (groot, emotie-gedreven, financiering-zwaar)
- Personas: starter / doorgrooier / belegger
- Kwalificerende vragen: aantal slaapkamers, tuin-wens, opleveringstijd, prijsklasse
- Aanbeveling: woningtype/etage/oppervlakte
- Signalen: bezichtiging-aanvraag bekeken, hypotheek-tool gebruikt, plattegrond meerdere keren bekeken
- Vervalt: m²-prijs-vergelijking is anders dan bedrijfsunit, BAR niet relevant voor starters

**Kavels** (lang traject, locatie-eerst, bouwregels-zwaar)
- Personas: zelfbouw / projectontwikkelaar
- Kwalificerende vragen: bouwdoel, gewenste oppervlakte, budget, opleveringstijd
- Aanbeveling: welke kavel(s) op basis van bouwdoel + budget
- Signalen: bestemmingsplan opgevraagd, meerdere kavels vergeleken, contact met gemeente-info gevraagd
- Vervalt: m²-prijs-vergelijking met buurprojecten heeft minder zin (per kavel uniek)

## Wat is dit

REPP **Conversational Landing Page** demo — pilot **De Hofman** (14 bedrijfsunits in Haarlem Waarderpolder). Mobile-first chat-thread waar bezoekers vanaf een Meta of Insta ad in een gestructureerde maar conversational flow door de project-info worden geleid en gecapteerd. Demo, dus geen echte CRM of mail-API maar wel een werkende WhatsApp-deeplink en een lokale state-machine die persona, aankoopfase en leadscore afleidt voor sales.

Eindbestemming productie: `repp.ai` of een subdomein zoals `kopen.repp.nl/dehofman`. Demo nu op Vercel: PR-builds + main op `*.vercel.app`.

## Stack en run

```bash
npm install
npm run dev         # vite op poort 5174 (zie .claude/launch.json bovenliggend)
npm run build       # production bundle in dist/
```

- **Vite 5** + **React 18** + **Tailwind v4** met `@tailwindcss/vite` (geen aparte tailwind.config.js — tokens in `src/index.css` via `@theme`).
- Geen TypeScript — bewust JS voor demo-snelheid.
- Geen test-suite — door de kleine scope nog niet de moeite. Bij refactor: voeg vitest toe.
- Geen ESLint config — als de demo doorgroeit naar product wel doen.

## Architectuur in één plaatje

```
src/
  data/
    project.js          ← alle De Hofman content (units, prijzen, sitePlan, gallery, contentCards, ...)
    flow.js             ← vragen, chip-opties, scores, persona-fork
  lib/
    scoring.js          ← derivePersona / deriveStage / deriveTemperature / computeScore
    recommendation.js   ← recommendUnit / recommendCopy / thankYouCopy / whatsAppDeeplink
    parseLead.js        ← regex parser vrije-tekst → {firstName, email, phone}
  components/
    AppShell.jsx              ← header (logo + progress + WA-icon + DEMO-toggle)
    IntroScreen.jsx           ← pre-chat fullscreen met hero + neon CTA
    ChatThread.jsx            ← scrollable bubble renderer + auto-scroll
    SuggestedChips.jsx        ← sticky bottom chip-row
    ChatInput.jsx             ← sticky bottom input (1Password-resistant)
    DebugPanel.jsx            ← interne sales-view (stage, score, persona, antwoorden)
    BotMessage / UserMessage / Avatar / TypingIndicator   ← chat primitives
    ContentBubble / GalleryBubble / LocationBubble        ← rich bubble types
    SitePlanBubble / UnitBubble / HighlightsBubble        ← rich bubble types
    PriceBubble / ProcessBubble / PlanningBubble          ← rich bubble types
    InvestorBubble / BrochureBubble / CtaBubble           ← rich bubble types
    MortgageCalc.jsx          ← maandlast slider in unit-detail
  App.jsx                     ← orchestrator, useReducer, localStorage persist
  index.css                   ← @theme tokens, range-slider, fade-up animations
public/
  images/                     ← project visuals (hero, exterior, units)
  brochure.pdf                ← De Hofman brochure 11MB direct gehost
  logo.svg
index.html                    ← Montserrat font + viewport-fit cover
```

## Flow state-machine

State live in `useReducer` in `src/App.jsx`. Persisted naar `localStorage` op key `clp-state-v2` (zie `persist()` / `loadPersisted()` in App.jsx).

```
view: intro → chat
currentQuestion route door:
  intent → focus → lead → lead-phoneAsk → (lead-phone) → timeline → size → moreInfo → followup → null (thankyou)

fastTrack (intent="meteen contact met sales") skipt:
  intent → lead → lead-phoneAsk → (lead-phone) → null (thankyou met sales_ready)
```

**Persona** komt uit `intent.persona` of `focus.persona` (afgeleid door `derivePersona()` in scoring.js). Bepaalt welke focus-variant je krijgt: `focus_eigen_gebruiker` / `focus_belegger` / `focus_default`.

**Stage** is afgeleid uit gedrag (niet gevraagd). Volgorde: `sales_ready > koopintentie > vergelijkend > orienterend > nieuwsgierig`. Logica in `deriveStage()`.

## Tone of voice

**Sentence case + Nederlandse interpunctie.** Hoofdletter aan begin van zinnen, punt aan einde, vraagteken bij vragen, komma's voor leesritme. Brand-namen consistent: **REPP** altijd in caps, **De Hofman** in titlecase (D + H caps).

**Doel**: menselijk, rustig, professioneel, kort, helder. Geen makelaarstaal, geen overdreven AI-chatbotstijl.

**Bot-bubbles**: max 1-2 zinnen. Lange uitleg in losse bubbles knippen. Stem is "we" (organisatie), niet "ik".

### Wat niet

- ❌ Tijdsbeloften: "in 60 seconden", "binnen 1 minuut", "nu direct"
- ❌ Populair-jargon: "no stress", "topper", "lekker bezig", "fixen we dit", "een fluitje"
- ❌ Oude lowercase-only stijl zonder hoofdletters of punten
- ❌ Interpuncten `·` en em-dashes `—` (zie `npm run check-copy`)
- ❌ Emoji's en smileys `:)` — niet in deze flow
- ❌ "Alles is opgeslagen", "Bedankt!", "Klaar!" als single-bubble close-out — gebruiker denkt dan dat hij klaar is. Combineer altijd met de volgende vraag in dezelfde of meteen volgende bubble.

### Wel

- ALL-CAPS labels met letter-spacing (`tracking-[0.18em]`) voor subheaders — REPP brandbook stijl
- Cijfers, `€`, `m²`, percent-tekens
- Lichte warmte zoals "Dank." of "Helder." in bevestigingen — kort en zonder uitroepteken

### Voorbeelden — mee

- ✅ `"Hoi, ik ben Jesse van REPP."`
- ✅ `"Helder. Dan zorgen we dat je de juiste informatie krijgt."`
- ✅ `"Waar kijk je vooral naar?"`
- ✅ `"Mag ik je e-mailadres, zodat we je de brochure alvast kunnen mailen?"`
- ✅ `"Goed. Dan kunnen we je straks de juiste info sturen. Nog één vraag zodat we weten welke plattegrond en prijsinformatie het meest relevant is."`

### Voorbeelden — tegen

- ❌ `"hoi ik ben jesse van repp"` (oude lowercase stijl)
- ❌ `"In 60 seconden ontdek je..."` (tijdsbelofte)
- ❌ `"Top jesse, ik mail je nu de brochure :)"` (populair + smiley)
- ❌ `"Begin · 60 seconden"` (tijdsbelofte + interpunct)
- ❌ `"Bedankt!"` op zichzelf (close-out moment)

### Chip-labels

Sentence case eerste woord, geen punten of vraagtekens.

- ✅ `"Voor mijn bedrijf"` `"Beschikbare units"` `"Liever niet"`
- ❌ `"Voor mijn bedrijf?"` (vraagteken op chip)
- ❌ `"voor mijn bedrijf"` (lowercase oude stijl)

User-input in user-bubble blijft verbatim — geen hercase van wat de bezoeker typte.

Voor placeholder/fallback tekst gebruik `'Nog niet'` ipv `'—'`.

## REPP huisstijl tokens (`src/index.css`)

| Token | Hex | Gebruik |
|---|---|---|
| `paper` | `#ffffff` | bot bubble bg, primary surfaces |
| `canvas` | `#f7f6f1` | app background warm-wit |
| `canvas-2` | `#efeee8` | subtle inset surfaces |
| `mist` | `#d8d6d6` | borders |
| `mist-light` | `#ebeae5` | subtle borders + dividers |
| `ink` | `#1d1d1f` | body text |
| `ink-soft` | `#6b6a66` | secondary text |
| `ink-mute` | `#9a9893` | tertiary text + placeholders |
| `midnite` | `#0f0f70` | primary brand, user-bubble bg, CTAs |
| `midnite-soft` | `#1b1b8a` | hover state midnite |
| `klein` | `#1b23aa` | secundair (zelden gebruikt) |
| `neon` | `#edff00` | accent CTA — **max 1 per scherm** |
| `gold` | `#c9a45c` | dunne 1px lijnen + ◆ accents |

Pill-buttons standaard `rounded-full`. Form-inputs onderstreping-only (`.repp-underline-input` in CSS). Slider thumbs midnite met paper border.

## Belangrijke conventies en valkuilen

### Lead-capture moet 1Password-vriendelijk blijven

- **NOOIT** een `<form>`-element met `<input name=email>` of `autocomplete=email/tel/given-name`. PWMs detecteren dat patroon.
- ChatInput in `src/components/ChatInput.jsx` gebruikt: `autocomplete="off"` + `data-1p-ignore` + `data-lpignore` + `data-form-type="other"` + random `name="chat-..."` + `inputMode="email"` of `inputMode="tel"` (alleen voor mobile keyboard hint, triggert geen PWM).
- Gebruik een vrije-tekst input met `parseLeadInput()` voor flexibele extraction. Bij future LLM-mode: vervang regex door Anthropic call met dezelfde return-shape.

### Layout

- AppShell is `h-[100dvh] overflow-hidden flex-col`. ChatThread bezit de scroll. NIET `min-h-screen` gebruiken — dan scrollt de hele pagina en glipt content onder de chip-bar.
- iOS keyboard tip: 16px font-size minimaal op inputs (al gedaan in `body` rule), anders zoomt iOS in.

### Iedere chat-message moet een kind krijgen

ChatThread switch-cased over `m.kind`. Nieuwe bubble-types toevoegen:
1. Nieuwe component `XxxBubble.jsx` die `<Avatar />` aan de linker kant rendert
2. Import in ChatThread.jsx + add case in switch
3. Dispatch met `{ kind: 'xxx', payload: {...} }` vanuit App.jsx

### Unit data update

Bron van waarheid voor de echte beschikbaarheid: `https://kopen.repp.nl/de-hofman/plattegrond` (interactieve plattegrond loadt JS). Update `project.sitePlan.rows` in `src/data/project.js` als dat verandert. Stats line in SitePlanBubble berekent zelf hoeveel beschikbaar/verkocht/etc.

### Geen tests draaien

Er is geen test-suite. `npm test` doet niets. Wel altijd `npm run build` doen voor commit om type-fouten of broken imports te vangen.

### Commit-discipline

- **NIET** auto-committen. User pusht zelf of vraagt expliciet om commit.
- Commit-messages: lowercase, geen leestekens, in dezelfde tone-of-voice als de chat. Co-author Claude.
- Geen `git add -A`. Liever `git add` per bestand.

### Vercel

- Vercel auto-detecteert Vite. Geen vercel.json nodig voor de basis.
- `public/brochure.pdf` (11MB) wordt direct uitgeleverd. Vercel CDN cacht statics 1 jaar default.
- Build-output `dist/`. Bundle nu ~200KB JS, ~37KB CSS. Acceptabel voor een chat-demo met 6 sfeerbeelden.

## Veelvoorkomende taken

### Copy aanpassen
1. Bot intro / vragen → `src/data/flow.js`
2. Project-content (units, content cards, highlights, etc) → `src/data/project.js`
3. Bot-text inline in App.jsx (micro-value intros, finishLead, fast-track) → grep op `kind: 'bot-text'`

### Een nieuw REPP-project erbij

Vervang `src/data/project.js` met de nieuwe data. Behoudt dezelfde shape (units, sitePlan, contentCards, etc.). De rest van de app blijft werken.

Voor projectspecifieke focus-vragen: voeg `focus_xxx` variant toe aan `flow.questions` en breid `flow.focusVariant()` uit.

### Statussen op situatietekening updaten

Edit `project.sitePlan.rows[].units[].state`. Mogelijke states:
- `available` — groen
- `sold_ov` — oranje (verkocht onder voorbehoud)
- `reserved` — amber (gereserveerd, niet actief gebruikt nu)
- `sold` — grijs strikethrough
- `coming_soon` — paper met dashed border

### Persistente state debuggen

Console: `localStorage.getItem('clp-state-v2')` toont raw state. `localStorage.removeItem('clp-state-v2')` reset.

URL `?debug=1` opent het demo-paneel direct met aankoopfase, score, persona, alle antwoorden + risico-afhaak.

## Wat NIET te doen

- ❌ `<form>` element rond lead-input
- ❌ `autocomplete="email"` of `autocomplete="tel"` op chat-inputs
- ❌ Headers, ondertitels of UI-labels in normale zinscase ("Wat is je voornaam?") — gebruik chat-tone
- ❌ `·` of `—` in tekst — gebruik spaties of "en"
- ❌ Auto-commit zonder user-bevestiging
- ❌ Een tweede CTA in dezelfde view (max 1 primary per screen)
- ❌ Neon op meerdere plekken tegelijk (max 1 per scherm)

## Roadmap

In volgorde van impact als deze demo richting productie gaat:

1. **AI-mode na lead-capture** — vervang scripted timeline/size/recommendation door een vrije Claude-API conversatie met function-calling voor unit-info en bezichtiging-plannen. Architectuur is er klaar voor (chat-thread + ChatInput).
2. **Echte CRM-koppeling** — `finishLead()` in App.jsx is single point van capture. Voeg een `POST /api/lead` toe naar HubSpot/Pipedrive.
3. **Live unit-status uit kopen.repp.nl** — vervang gehardcoded `project.sitePlan` door fetch. Voorkomt drift.
4. **A/B variant config** — toggle copy varianten via URL `?v=B` voor REPP intern testen.
5. **Analytics** — PostHog of Plausible event-tracking op chip-tap, lead-submit, brochure-open.
6. **Echte mail-API** — koppel aan Resend / Postmark voor de "ik mail je de brochure" belofte.
7. **Configurator hand-off** — link `/dehofman/configurator/` na recommendation voor wie deeper wil.
