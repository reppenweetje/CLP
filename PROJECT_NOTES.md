# REPP CLP — Projectnotes

> Laatste update: 4 mei 2026
> Bedoeld om vanuit GitHub later perfect te kunnen oppakken zonder context-verlies.

## 1. Wat is dit project

REPP **Conversational Landing Page** demo — pilot **De Hofman**, 14 bedrijfsunits in Haarlem Waarderpolder. Mobile-first chat-thread waar bezoekers vanaf een Meta of Insta ad in een gestructureerde maar conversational flow door de project-info worden geleid en gecapteerd. Demo, dus geen echte CRM of mail-API maar wel een werkende WhatsApp-deeplink en een lokale state-machine die persona, aankoopfase, leadscore en koopsignalen afleidt voor sales.

- **Repo**: `reppenweetje/CLP` (private)
- **Deploy**: Vercel auto-deploy op `main`
- **Eindbestemming productie**: `repp.ai` of subdomein zoals `kopen.repp.nl/dehofman`
- **WhatsApp nummer**: `+31616079428`
- **Telefoonnummer (REPP)**: `020-2610080`

## 2. Stack en architectuur

### Stack
- **Vite 5** + **React 18** + **Tailwind v4** (`@tailwindcss/vite` plugin, tokens in `src/index.css` via `@theme`)
- **JavaScript** (geen TypeScript, bewust voor demo-snelheid)
- **Geen test-suite** (klein scope, bij refactor: vitest toevoegen)
- **localStorage** voor state-persistence (`clp-state-v5`) en events (`clp-events-v1`)

### State management
- `useReducer` in `src/App.jsx`
- Persisted naar `localStorage` op key `clp-state-v5`
- Sessie-ID gegenereerd via `startNewSession()` in `src/lib/analytics.js`
- Events gelogd in `clp-events-v1` met sessionId, timestamp, type, payload

### Architectuur kort
```
src/
  data/
    project.js          alle De Hofman content (units, prijzen, sitePlan, gallery, contentCards, location, ...)
    flow.js             vragen, chip-opties, scores, persona-fork
  lib/
    scoring.js          derivePersona / deriveStage / deriveTemperature / computeScore
    recommendation.js   recommendUnit / recommendCopy / thankYouCopy / whatsAppDeeplink
    parseLead.js        regex parser vrije-tekst → {firstName, email, phone}
    buyingSignals.js    NIEUW: hot/warm/cold engine + persona-leaning + time-of-day
    analytics.js        event store + funnel + handoff stats
    credion.js          Zapier webhook voor financierings-leads
  components/
    AppShell.jsx              header (logo + progress + WA-icon + DEMO-toggle)
    IntroScreen.jsx           pre-chat fullscreen met hero + neon CTA
    ChatThread.jsx            scrollable bubble renderer + auto-scroll
    SuggestedChips.jsx        sticky bottom chip-row
    ChatInput.jsx             sticky bottom input (1Password-resistant)
    DebugPanel.jsx            interne sales-view (stage, score, persona, antwoorden)
    AnswersSheet.jsx          bottom-sheet met alle gegeven antwoorden, per-veld editable
    BotMessage / UserMessage / Avatar / TypingIndicator   chat primitives
    LocationBubble.jsx        NIEUW: segment-control met Bereikbaarheid / Omgeving / Maps embed
    SitePlanBubble / UnitBubble / HighlightsBubble        rich bubble types
    PriceBubble / ProcessBubble / PlanningBubble          rich bubble types
    InvestorBubble / BrochureBubble / CtaBubble           rich bubble types
    UspCardsBubble / ContentBubble / GalleryBubble        rich bubble types
    PriceCompareBubble.jsx    prijsvergelijking
    WarmHandoffBubble.jsx     NIEUW: persona-aware handoff met 3-tier ladder
    MortgageCalc.jsx          maandlast slider (eigen_gebruiker)
    RentabilityCalc.jsx       BAR slider (belegger)
  screens/
    AdminScreen.jsx           /admin dashboard met funnel, handoff stats, sessions
  App.jsx                     orchestrator, useReducer, localStorage persist
  index.css                   @theme tokens, range-slider, fade-up animations
public/
  images/                     project visuals (hero, exterior, units)
  brochure.pdf                De Hofman brochure 11MB direct gehost
  repp-mark.svg               REPP 3-ruiten logo
```

### Flow state-machine
```
view: intro → chat
currentQuestion route:
  intent → availabilityCheck → brochureTrigger
    ja  → lead-email → lead-name → lead-phoneAsk → (lead-phone) → size → timeline → moreInfo
    nee → afhaakReasons
            huur  → rentRange → afsluiten
            ander → afsluiten met cta-card

moreInfo loop met chips voor diepte-info (locatie, prijs, financiering, etc.)
moreInfo __contact → cta-card afsluiting
moreInfo __callback (alleen bij hot) → terugbel-flow
```

**Persona** komt uit `intent.persona` of `focus.persona` (afgeleid door `derivePersona()` in `scoring.js`). Stuurt welke focus-variant je krijgt: `focus_eigen_gebruiker` / `focus_belegger` / `focus_default`.

**Stage** afgeleid uit gedrag (niet gevraagd). Volgorde: `sales_ready > koopintentie > vergelijkend > orienterend > nieuwsgierig`. Logica in `deriveStage()`.

## 3. Recente toevoegingen (mei 2026 sessie)

### Buying-signal engine (`src/lib/buyingSignals.js`)
Pure functie die antwoorden + behaviors omzet in een snapshot van `temperature` (cold/warm/hot), `score`, `signals[]`, `declaredPersona`, `inferredPersona`, `leaning`.

- **Drempels**: hot ≥ 50, warm ≥ 25, cold < 25
- **Universele signalen**: unit-detail-multi (25), unit-detail-single (8), more-info-multi (12), brochure (6), availability (5)
- **Persona-onthullend**: rentability_calc (30, leans belegger), mortgage_calc (30, leans eigen_gebruiker), priceCompare (8, belegger), investor (6, belegger), location (5, eigen_gebruiker)
- **Stated intent**: timeline_zsm (28), timeline_3mnd (18), timeline_6mnd (8), size_xxl (8), size_specific (6)
- **Commitment**: lead_phone (15), lead_complete (8)
- **Negatief**: afhaak (-25), timeline_unknown (-8), phone_declined (-10)

### WarmHandoffBubble (`src/components/WarmHandoffBubble.jsx`)
Persoonlijke nudge richting telefonisch contact bij hot signaal. Volgt **4-stappen copy-formule**:
1. Erken (`tag` + `headline`)
2. Normaliseer ("een bedrijfsunit koop je niet zomaar")
3. Bied waarde (3 bullets `value`)
4. Geef control (3-tier ladder: Bel mij / WhatsApp / Bel zelf, plus "Liever later")

**Persona-aware copy**: belegger = rendement/BAR/scenario's; eigen_gebruiker = bezichtiging/indeling/financiering; beide = combinatie; onbekend = neutraal met inferred-leaning.

**Time-of-day-aware** belofte:
- Office hours (ma-vr 9-17): "vandaag vóór 17:00"
- Avond (17-21): "morgenochtend rond 10:00"
- Weekend: "maandag rond 10:00"

### Behaviors in state (App.jsx reducer)
```js
behaviors: {
  unitDetailOpens: 0,           // aantal keer unit-detail geopend
  uniqueUnitsViewed: [],        // unieke unit-nummers
  lastUnitViewed: null,         // voor unit-focus in handoff copy
  rentabilityCalcInteracts: 0,  // belegger-signaal
  mortgageCalcInteracts: 0,     // eigen_gebruiker-signaal
  moreInfoViewCount: 0,
  moreInfoIds: [],              // voor specifieke moreInfo-signalen
  brochureClicked: false,
  warmHandoffShown: false,      // anti-spam: max 1x per sessie
  warmHandoffOutcome: null,     // 'callback' | 'whatsapp' | 'phone' | 'dismissed'
  phoneAskedDeclined: false,    // voor adaptive ladder
}
```

Reducer-acties: `BEHAVIOR_UNIT_VIEWED`, `BEHAVIOR_CALC_INTERACTED`, `BEHAVIOR_MORE_INFO_VIEWED`, `BEHAVIOR_BROCHURE_CLICKED`, `BEHAVIOR_PHONE_DECLINED`, `WARM_HANDOFF_SHOWN`, `WARM_HANDOFF_OUTCOME`, `SET_MESSAGES`.

### Wiring (App.jsx)
- `useEffect` watcht antwoorden + behaviors → bij hot + safe moment + `!warmHandoffShown` → injecteert `warm-handoff` bubble
- Safe moments: `currentQuestion ∈ ['moreInfo', 'followup', null]`. Tijdens lead-capture/financingAsk niet onderbreken.
- `handleHandoffAction(msgId, outcome)` muteert het bestaande bericht met `outcome` voor visuele feedback (groen vinkje), tracked event, en bij callback zonder phone → vraagt 06.

### Adaptive moreInfo chips
`moreInfoChips(persona, seen, temperature)`:
- **Hot**: `[__callback, __contact, ...rest]` — Jann-callback chip eerst
- **Warm**: `[__contact, ...rest]` — direct contact eerst
- **Cold**: `[...rest, __contact]` — standaard volgorde

### Rich LocationBubble v2 (`src/components/LocationBubble.jsx`)
Vervangt de oude single-view location-bubble. Drie perspectieven via segment-control:
1. **Bereikbaarheid** — 6-pill grid met reistijden (A9, Haarlem CS, Schalkwijk, Schiphol, Amsterdam, Alkmaar) per modaliteit
2. **Omgeving** — 5 highlights met SVG-iconen (business, water, home, parking, lunch)
3. **Op de kaart** — live Google Maps embed iframe (satelliet view, geen API key nodig) + "Open in Google Maps" externe link

Plus footer met `scarcityNote`: "Schaarste in Haarlem. Binnen de stadsgrenzen is dit een van de laatste nieuwbouw-locaties voor bedrijfsunits."

Tracking: `location:tab-switched` en `location:maps-opened` events.

### Naam-conventie (belangrijk!)
- **Jesse** = chat-bot persona ("Hoi, ik ben Jesse van REPP")
- **Jann** = echte collega (vrouw) voor bellen + WhatsApp
- In de warm-handoff body wordt Jann expliciet geïntroduceerd: "Mijn collega Jann kent de Waarderpolder-markt..."
- CTA-knoppen: "Laat Jann mij bellen", "WhatsApp Jann"
- Confirmation: "Genoteerd. Jann belt je vandaag vóór 17:00."

### Admin dashboard upgrade
Nieuw blok in `/admin`: **Warm-handoff stats**
- KPI's: getoond / geaccepteerd / afgewezen / geen actie
- Accept-rate per persona
- Helper-funcs in `analytics.js`: `buildHandoffStats()`, `buildHandoffByPersona()`

### Sequential bot-bubble reveal (UX fix)
**Probleem**: bij multi-bubble dispatches kwamen alle berichten tegelijk. Auto-scroll hield de laatste user-bubble bovenaan, waardoor de NIEUWE bot-vraag onder het scherm viel achter rich cards. Bezoeker zag chips zonder de vraag te kunnen lezen.

**Oplossing**: bot-bubbles in een `messageQueue` (state). Een useEffect releasde één per tick (450-900ms delay op basis van inhoud). User-bubbles direct, bot-bubbles in de queue.
- `TypingIndicator` aan onderkant van ChatThread zolang queue items heeft
- Chip-bar + ChatInput **alleen zichtbaar** als queue leeg is — dwingt sequentie af
- Auto-scroll naar onderkant op elke release
- Helper `sendSequence(userText, botMessages)` overal in App.jsx
- `START_CHAT` reducer-actie: eerste bubble direct, rest in queue
- WarmHandoff dispatch ook via queue

`computeReleaseDelay(message)` in `App.jsx`: bot-text 450-900ms gebaseerd op tekstlengte, rich cards 700ms.

### AnswersSheet per-veld editing
Eerder deze sessie: in de "Jouw gegevens" sectie van AnswersSheet kun je per veld (Naam / E-mail / 06) een **Aanpassen** knop tappen. Stuurt user naar `lead-edit-{field}` met chat-input. Andere lead-velden blijven bewaard. "Vergeten" hernoemd naar "Alles vergeten".

### Rent-match flow
Bij `afhaakReason = 'huur'` (Huur in plaats van koop) → vervolgvraag `rentRange` (huurprijs per m²/jaar). Data wordt opgeslagen voor toekomstige matchmaking met beleggers in De Hofman die hun unit willen verhuren.

### Edit-rollback fix
Bij wijzigen van een eerder antwoord rolt de flow terug naar dat punt en clipt de messages array. Gebruikt `_msgCountBefore` op iedere `answerValue()`. Geen duplicate vraag.

## 4. Tone of voice (samenvatting)

**Sentence case + Nederlandse interpunctie.** Hoofdletter aan begin, punt aan einde, vraagteken bij vragen, komma's voor leesritme. Brand-namen consistent: **REPP** in caps, **De Hofman** titlecase.

**Doel**: menselijk, rustig, professioneel, kort, helder. Geen makelaarstaal, geen overdreven AI-chatbotstijl.

**Wat niet**:
- Tijdsbeloften ("in 60 seconden")
- Populair-jargon ("topper", "lekker bezig", "fixen")
- Emoji's en smileys
- Interpuncten `·` en em-dashes `—` (bewaakt door `npm run check-copy`)
- Single-bubble close-outs ("Bedankt!" alleen) — combineer met volgende vraag

**Wel**:
- ALL-CAPS labels met letter-spacing voor subheaders (`tracking-[0.18em]`)
- Cijfers, `€`, `m²`, percent-tekens
- Lichte warmte ("Dank.", "Helder.")

Volledige regels in [CLAUDE.md](CLAUDE.md).

## 5. Belangrijke conventies en valkuilen

### Lead-capture moet 1Password-vriendelijk blijven
- **NOOIT** een `<form>` element of `autocomplete=email/tel` op chat-input
- ChatInput gebruikt: `autocomplete="off"`, `data-1p-ignore`, `data-lpignore`, random `name`
- Vrije-tekst input + `parseLeadInput()` voor extraction
- Future LLM-mode: vervang regex door Anthropic call met dezelfde return-shape

### Layout
- AppShell is `h-[100dvh] overflow-hidden flex-col`. ChatThread bezit de scroll.
- iOS keyboard: 16px font-size minimaal op inputs

### Versioning
Geen formele versie-bump nodig (klein project, geen CLAUDE.md-regel daarvoor in dit repo). Wel netjes commits met duidelijke titel.

### Check-copy script
`npm run check-copy` voor commit. Verboden: `·`, `—`, `–`. Lint over alle src files.

### Build
`npm run build` voor commit om broken imports te vangen. Output ~280KB JS / 81KB gzipped (na buying-signal additions).

## 6. Open onderwerpen voor volgende sessie

### a) Data-opslag goed en gestructureerd
**Status**: nu alles in localStorage, niet duurzaam.

**Op te lossen**:
- Backend voor lead-capture (HubSpot / Pipedrive / eigen API)
- Backend voor analytics events (PostHog / Plausible / eigen DB)
- Schema-design: lead, sessie, events, behaviors, signal-snapshots, handoff-uitkomsten
- Multi-project schema: tabel `project_id` voor wanneer we meerdere projecten/bots draaien
- Welke data van de bezoeker bewaren we hoe lang (linkt aan AVG punt b)
- Sales-handoff: hoe wordt een hot lead doorgezet naar Jann (Slack / mail / CRM-task)?
- Rent-match queue: beleggers in De Hofman koppelen aan huur-interesse uit `rentRange` data

**Voorlopige aanbevelingen**:
- Supabase of Firebase voor MVP (gratis tier ruim genoeg voor demo→pilot)
- PostHog voor analytics (open source, AVG-vriendelijk indien EU-host)
- Of REPP-eigen API endpoint, koppelen aan REMIND backend (Hetzner)

### b) AVG-compliance
**Status**: basis ingericht (mei 2026), backend-deel staat nog open.

**Wat al geregeld is**:
- `public/privacy.html` — privacystatement in klant-stem, bereikbaar via permanente link onder elk chat-input/chip-veld plus voet van AnswersSheet
- `BotMessage` ondersteunt inline `[tekst](url)` markdown-stijl links zodat bot in-context naar de privacystatement kan verwijzen
- Bij `brochureTrigger=ja` (mailadres-vraag) verschijnt een bot-bubble met zin + privacystatement-link → just-in-time transparantie zonder cookie-banner
- Financing-chip is herschreven naar expliciete consent met data + doel: "Mag ik je naam, e-mailadres en 06 met Credion delen voor een vrijblijvende financieringsscan?"
- "Alles vergeten"-knop in AnswersSheet wist alle lokale data — eerste stap richting recht-op-vergetelheid
- Geen tracking-cookies, geen IP-opslag, geen browser-fingerprinting; alleen `localStorage` op apparaat van bezoeker voor sessie-continuïteit

**Wat nog open staat (voor wanneer er een backend komt)**:
- Server-side data-retentie: hard-delete na 24 mnd zonder contact (in privacystatement al beloofd)
- API-endpoint voor recht op inzage / verwijdering (nu alleen via mail naar jann@repp.nl)
- Verwerkersovereenkomsten formaliseren: Vercel (host), Zapier (Credion-route), Meta (WhatsApp-handoff)
- Zapier-US data-residency: check of we EU-data-residency contract hebben of bouw eigen webhook-relay
- Logging van consent (timestamp + scope) — alleen relevant zodra er backend is
- Pseudonimisering van events waar mogelijk (geen PII in event-payload)
- Cookieless analytics indien toegevoegd (PostHog EU-host of Plausible — beide AVG-vriendelijk)

**Verwerkers/data-flow** (voor in DPA-administratie):
| Partij | Wat ziet 'ie | Wanneer |
|---|---|---|
| Vercel | hosting van app, geen PII-opslag aan onze kant | altijd (technisch noodzakelijk) |
| REPP zelf | naam, mail, 06 (optioneel), antwoorden, gedrag | bij brochure-keuze |
| Credion via Zapier | naam, mail, 06 + project-context | alleen na expliciete chat-consent |
| Meta WhatsApp | bericht-inhoud + bezoekers-06 | alleen als bezoeker zelf op WA-knop tikt |

### c) Template voor nieuwe bots
**Status**: nu hardcoded voor De Hofman.

**Op te lossen — splitsing tussen project-specifiek en bot-set-up**:

Project-afhankelijk (vervangbaar per bot):
- `src/data/project.js` — alle content (units, prijzen, sitePlan, contentCards, location, gallery, hero, brochureUrl, telefoonnummer, whatsappNumber, projectNaam)
- `src/data/flow.js` — vragen, chip-opties, persona-fork (eventueel)
- `public/images/` — hero, exterieur, units, brochure-PDF
- Tone-of-voice scope-vervangbaar (behoort bij branding)

Basis-set-up (herbruikbaar):
- `src/components/*` — alle bubble-types, AppShell, ChatThread, ChatInput, AnswersSheet, WarmHandoffBubble, etc.
- `src/lib/scoring.js`, `recommendation.js`, `parseLead.js`, `analytics.js`, `buyingSignals.js`
- `src/App.jsx` — orchestrator
- Tailwind/CSS tokens
- Reducer-acties + state-shape
- Adaptive chips logica

**Set-up tool concept**:
- CLI of webform: "Nieuw bot voor project X aanmaken"
  - Project-naam, displayName, branding-tokens, content (units, prijzen, location), brochure-PDF
  - Output: een nieuwe `src/data/project-{slug}.js` + git-branch / repo
  - Of: één codebase met multi-project route (`/dehofman`, `/anderproject`)
- Set-up tool zelf kan ook een chat-flow zijn (REPP-intern)
- Branding: Tailwind `@theme` tokens overschrijfbaar per project

**Strategische vraag**: één codebase met multi-project of fork-per-project? Eerste schaalt beter, tweede sneller voor één-off pilots.

### d) Instagram-stijl bubble upgrade
**Status**: huidige bubbles zijn "rich card" stijl met afbeeldingen, knoppen, calc-sliders.

**Op te lossen — wat zou Instagram-stijl betekenen**:
- Story-achtig: full-bleed image bubbles met text-overlay
- Tap-to-advance navigation binnen een bubble (carousel)
- Verticale video clips als bubble (autoplay, muted)
- Reels-achtige hero in plaats van statische foto
- Polls/sliders inline (bestaande RentabilityCalc heeft al slider-energie)
- Reactie-emoji's (😍 over een unit) als signaal — past bij buying-signals engine
- Sticker-achtige overlays (NIEUW, schaarste, etc.)

**Test-plan**:
- A/B variant: huidige rich-cards versus Instagram-stijl
- Meten: scroll-depth, dwell-time, click-through naar lead
- Begin met één bubble (bv. UspCardsBubble of GalleryBubble) full-bleed maken en toetsen

**Risico**:
- Mobile-first, dus al richting Instagram-format → goed
- Te visueel kan afleiden van conversion-doel
- Zwaardere assets (video) → load-tijd

## 7. Hoe pak je dit project op vanuit GitHub

```bash
git clone git@github.com:reppenweetje/CLP.git
cd CLP
npm install
npm run dev   # vite op poort 5174
```

**Eerste blik op de code**:
1. Lees `CLAUDE.md` voor projectspecifieke regels
2. Lees deze `PROJECT_NOTES.md` voor context
3. Open `src/App.jsx` — orchestrator, geeft je het mentale model
4. Open `src/data/flow.js` + `src/data/project.js` — content
5. `src/lib/buyingSignals.js` — koopsignaal-engine, recente kern-feature
6. `src/components/WarmHandoffBubble.jsx` — persona-aware nudge

**Productie deploy**:
- Vercel auto-deploy op push naar `main`
- Bundle ~280KB JS / 81KB gzipped
- `public/brochure.pdf` (11MB) wordt direct uitgeleverd via Vercel CDN

**Test-flow voor warm-handoff lokaal**:
1. Clear localStorage: `localStorage.removeItem('clp-state-v5'); localStorage.removeItem('clp-events-v1')`
2. Start chat → "Als belegging" (persona belegger)
3. "Ja, laat zien" → site-plan
4. Klik 2+ unit-details
5. Beweeg de RentabilityCalc-slider (lokt hot-detectie)
6. "Ja, stuur maar" → lead invullen "Jan jan@test.nl"
7. "Nee, liever niet" op phone-ask
8. "100 m²" → "Zo snel mogelijk"
9. Bij moreInfo verschijnt warm-handoff bubble + chip "Laat Jann mij bellen"

**Admin dashboard**:
- `/admin` toont funnel + handoff-stats + sessie-lijst
- Export JSON of clear all events via header

## 8. Recente commits (mei 2026)

- Antwoorden-sheet per veld aanpasbaar plus rent match plus svg ruiten logo plus whatsapp nummer
- Buying-signals engine plus warm-handoff bubble plus location-bubble v2
- (volgende commit zou deze PROJECT_NOTES.md zijn)

## 9. Memory-aid: belangrijke beslissingen

- **WhatsApp nummer**: `+31616079428` (gewijzigd in deze sessie)
- **Warm-handoff trigger**: alleen op hot, alleen 1x per sessie, alleen op safe moments (moreInfo/followup/null)
- **Adaptive chips**: callback-chip alleen bij hot, direct-contact bij hot/warm prominent
- **Persona-leaning**: bij onbekend persona → afgeleid uit RentabilityCalc (belegger) of MortgageCalc (eigen_gebruiker)
- **Time-of-day**: in callback-promise + handoff-belofte (kantooruren / avond / weekend)
- **Naming**: Jesse=bot, Jann=mens (geintroduceerd in deze sessie)
- **Storage version**: `clp-state-v5` (huidige). Bij brekende state-shape → bump naar `v6`.
- **No autoflashing leestekens**: `npm run check-copy` blokkeert `·`, `—`, `–`

## 10. Open vragen die ik eerlijk-gezegd niet heb beantwoord

- Echte sales-handoff naar Jann: hoe wil je dat werken (Slack-message, CRM-task, mail)?
- Wanneer (en hoe) reset state v5 → v6: bij volgende grote feature of nu?
- Multi-project route plan: één bundle met routing, of fork-per-project?
- Hosting backend: REMIND piggybacken (Hetzner Nuremberg) of aparte stack?
