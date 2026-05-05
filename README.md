# REPP · Conversational Landing Page (CLP)

Mobile-first conversational landing page voor REPP-projecten. Eerste pilot: **De Hofman**, 14 bedrijfsunits in Haarlem Waarderpolder.

> Voelt als chat, werkt als een gestructureerde verkoopassistent. Niet één centraal lead-formulier maar een doorlopende thread met chips en vrije-tekst input. Bouwt persona, aankoopfase en leadscore op uit gedrag — sales krijgt een compleet profiel terug.

## Template-modus

Deze repo is óók een **GitHub-template**: gebruik de _Use this template_ knop op GitHub om een nieuwe CLP voor een ander project op te starten. Het hele copy-traject (microIntro, recommendCopy, persoonlijke handoff, WhatsApp-zinnen) is data-gestuurd via `src/data/project.js` — geen forks van componenten nodig.

Twee setup-paden:
- **Met Claude Code**: open de gekloonde repo, zeg `nieuw project setup`. De wizard in [CLAUDE.md](CLAUDE.md) loopt 9 stappen door en vult alles in.
- **Handmatig**: zie [SETUP.md](SETUP.md) voor stap-voor-stap instructies.

## Voor wie

- **REPP intern** — om te beoordelen of een conversational-mobile-first flow beter werkt dan een klassieke landingspagina voor social-ad traffic
- **Pilotproject De Hofman** — werkelijke prijzen + actuele beschikbaarheid van de 14 units uit `kopen.repp.nl`
- **Andere REPP-projecten** — Project R en alle vervolgprojecten gebruiken deze template als startpunt

## Live demo

Vercel deploy van `main`. URL volgt na eerste import in Vercel-org.

URL-tip: append `?debug=1` om het interne demo-paneel direct te openen — zichtbaar voor REPP, onzichtbaar voor consument in productie.

## Run lokaal

```bash
npm install
npm run dev
```

Open `http://localhost:5174` (poort vanwege parallelle dev-servers in deze workspace).

```bash
npm run build      # production bundle in dist/
npm run preview    # preview de build lokaal
```

## Voor Claude Code sessies

Lees [CLAUDE.md](CLAUDE.md) — conventies, valkuilen, REPP huisstijl tokens, en een task-recipe voor copy aanpassen, nieuwe bubbles toevoegen of een ander project in de demo zetten.

## Wat de demo doet

```
intro
  ↓ ┌──────────────────────── fast-track ────────────────────────┐
  ↓ │                                                              │
intent (5 chips)                                                    │
  ↓                                                                 │
focus (persona-variant)                                             │
  ↓                                                                 │
micro-value (gallery + 1 zin context)                               │
  ↓                                                                 │
lead capture (vrije-tekst → regex parser)                          ←┘
  ↓
phone-ask (chips ja/nee)
  ↓
timeline (5 chips)
  ↓
size (5 chips)
  ↓
recommendation (unit-card + content)
  ↓
moreInfo branch (5-6 chips, optional rich content drilldowns)
  ↓
followup (5 chips)
  ↓
thankyou (cta-card met WhatsApp deeplink + brochure)
```

**Aankoopfase** wordt afgeleid uit gedrag (niet gevraagd):
- nieuwsgierig · oriënterend · vergelijkend · koopintentie · sales-ready

## Belangrijkste features

| Feature | Wat het doet |
|---|---|
| **Chat-thread layout** | Cumulative bubbles met REPP-avatar, chips of input sticky onder |
| **Vrije-tekst lead capture** | Geen 3-velden formulier — user typt vrij, regex parser haalt naam/mail/06 eruit. 1Password-vriendelijk |
| **Persona-fork** | Eigen-gebruiker / belegger / onbekend bepaalt focus-vraag, content cards, copy en sales-actie |
| **Site-plan met live status** | 14 units gekleurd (beschikbaar / verkocht / verkocht ov / coming soon) — tap voor m² + prijs detail |
| **Maandlast-calculator** | Sliders voor eigen vermogen + rente, live update van geschatte maandlast (20 jaar annuïtair) |
| **Rich content bubbles** | Gallery (snap-carousel), locatie (drone + reistijd-pills), prijslijst, aankoopproces, planning, highlights, belegger-voordelen, brochure |
| **MoreInfo branch** | Tussen recommendation en followup kan user zelf onderwerpen kiezen om uit te diepen — past bij elke aankoopfase |
| **WhatsApp escape** | Permanent icoon in header voor ultra-hot leads |
| **FastTrack** | "Meteen contact met sales"-chip skipt de hele flow naar sales-ready |
| **Persistent state** | localStorage — refresh herstelt de hele thread |
| **Demo-paneel** | Aankoopfase + temperatuur + score + persona + alle antwoorden + risico-afhaak voor sales-evaluatie |

## Tech keuzes

| Keuze | Waarom |
|---|---|
| Vite + React + Tailwind v4 | Snel scaffolden, geen TS overhead voor demo, v4 met `@theme` tokens past bij REPP design system |
| Geen TS | Demo-snelheid; product-stadium is moment om TS te introduceren |
| useReducer + localStorage | Eenvoudig + persistent zonder Redux of Zustand voor deze scope |
| Regex parser voor lead-input | Demo werkt zonder LLM; later vervang `parseLeadInput()` door Anthropic API call met dezelfde return-shape |
| Geen `<form>` of `autocomplete=` | 1Password / LastPass / Chrome Autofill triggeren niet — voelt echt als chat |
| Tailwind v4 `@theme` in CSS | REPP brand tokens centraal in `src/index.css`, zonder aparte config file |

## Documentatie

- [SETUP.md](SETUP.md) — nieuw project opzetten vanuit deze template
- [CLAUDE.md](CLAUDE.md) — wizard voor template-modus + project-conventies + valkuilen voor Claude Code sessies
- [src/data/project.js](src/data/project.js) — alle De Hofman content op één plek (de enige bron-van-waarheid die per project wijzigt)
- [src/data/flow.js](src/data/flow.js) — vragen, chip-opties, scores
- [src/lib/scoring.js](src/lib/scoring.js) — persona, stage, temperatuur, leadscore-logica
- [src/lib/recommendation.js](src/lib/recommendation.js) — unit-advies, copy-keuzes, salesactie
- [src/lib/handoffCopy.js](src/lib/handoffCopy.js) — persona-aware copy-resolver voor service-card en warm-handoff
- [scripts/check-content.mjs](scripts/check-content.mjs) — validator die `project.js` en assets controleert; loopt automatisch in `prebuild`

## Roadmap

Zie [CLAUDE.md](CLAUDE.md#roadmap) voor de volgorde. Top-3 productie-stappen:

1. **AI-mode na lead-capture** — vervang scripted vragen door Claude API met function-calling. Architectuur is klaar.
2. **CRM-koppeling op `finishLead()`** — single point van capture, drop-in `POST /api/lead`.
3. **Live unit-status uit `kopen.repp.nl`** — voorkom drift met de werkelijke verkoop.

## Stack

- Vite 5 · React 18 · Tailwind v4 (`@tailwindcss/vite`)
- Vercel zero-config deploy
- Bundle: ~200KB JS · ~37KB CSS · 11MB brochure-PDF static
