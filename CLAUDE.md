# CLAUDE.md

Project-specifieke instructies voor Claude Code sessies. Lees dit eerst bij het openen van deze repo.

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

## Tone of voice — STRICT

> Alle chat-copy: **lowercase + geen leestekens**. Geen punten, komma's, vraagtekens, bullet-points, em-dashes of interpuncten.

Wel toegestaan:
- ALL-CAPS labels met letter-spacing (`tracking-[0.18em]`) — REPP brandbook subheader stijl
- Cijfers, `€`, `m²`, percent-tekens
- Brand display "De Hofman" mag titlecase blijven (bv. in IntroScreen hero)

Voorbeelden:
- ✅ `"hoi ik ben jesse van repp"`
- ✅ `"wat is je voornaam en je mailadres"`
- ✅ `"helder de l units zijn nu het meest concreet beschikbaar xl is uit en xxl volgt later"`
- ❌ `"Hoi, ik ben Jesse van REPP."`
- ❌ `"Begin · 60 seconden"` (`·` is een leesteken)

Voor placeholder/fallback tekst gebruik `'nog niet'` ipv `'—'`.

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
