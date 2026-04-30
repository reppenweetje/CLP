# REPP · Conversational Landing Page (CLP)

Mobile-first conversational landing page demo voor REPP — pilot **De Hofman**
(14 hoogwaardige bedrijfsunits in Haarlem Waarderpolder).

Doel van de demo: bewijzen dat een gestructureerde conversational flow op mobiel
beter werkt dan een klassieke landingspagina, door:

- aankoopfase herkennen uit gedrag (i.p.v. expliciet vragen),
- vroeg maar logisch lead-gegevens verzamelen,
- snackable content op het juiste moment,
- en sales een duidelijk profiel + actieadvies geven.

## Run lokaal

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Voeg `?debug=1` toe om het demo-paneel direct
geopend te zien (zichtbaar voor REPP, onzichtbaar voor consumenten).

## Build

```bash
npm run build
```

Output staat in `dist/`. Vercel deployt automatisch met deze setup (Vite
zero-config).

## Architectuur

```
src/
  data/
    project.js           — alle De Hofman content (vervangbaar per project)
    flow.js              — vragen, keuzes, scores
  lib/
    scoring.js           — score, persona, aankoopfase, temperatuur
    recommendation.js    — content-cards, unitadvies, salesactie, copy
  components/
    AppShell.jsx         — sticky header, progress, debug-toggle
    IntroScreen.jsx
    QuestionStep.jsx     — generiek voor alle keuze-vragen
    MicroValue.jsx       — eerste waarde voor de leadform
    LeadForm.jsx         — voornaam + e-mail + optioneel 06
    Recommendation.jsx   — unit + content advies
    ThankYou.jsx         — afsluitscherm + WhatsApp deeplink
    DebugPanel.jsx       — interne demo-view
    ChoiceButton.jsx
    BotBubble.jsx
    ContentCard.jsx
    ProgressIndicator.jsx
  App.jsx                — orchestratie + state (useReducer)
```

## Flow

```
intro → intent → focus(persona-variant) → microValue
      → leadForm → timeline → size → recommendation
      → followup → thankyou
```

- **intent**: één keuze, signaleert (impliciet) intentie + persona.
- **focus**: variant op basis van persona — eigen-gebruiker krijgt gebruiksvraag,
  belegger krijgt prioriteit-vraag, onbekend krijgt eigenaar/belegger-vraag.
- **microValue**: 1 zin context + 1 contentcard die past bij gegeven antwoorden.
  Pas hier vragen we naam/e-mail/06 — gegevens als verdiende ruil.
- **timeline + size**: na lead, om persona te verrijken voor unit-advies en
  aankoopfase.
- **recommendation**: aanbevolen unit (L of XXL) + 4 content-cards op maat.
- **followup**: hoe wil je verder — bepaalt sales-ready stage.
- **thankyou**: WhatsApp deeplink met geprefilled bericht + brochure-CTA.

## Aankoopfase

Afgeleid uit antwoorden (niet expliciet gevraagd):

| Fase           | Signaal                                                |
|----------------|--------------------------------------------------------|
| Nieuwsgierig   | "Ik kijk gewoon even rond" + geen termijn              |
| Oriënterend    | Focus ingevuld, termijn 6mnd+/onbekend                 |
| Vergelijkend   | Prijzen/plattegronden gekozen, termijn 3-12mnd         |
| Koopintentie   | Termijn ≤3mnd + concrete grootte/intentie              |
| Sales-ready    | Vervolg = WhatsApp nu, bel mij, of plan afspraak       |

## Leadscore

Optelsom van alle keuzes + lead-gegevens. Zie `src/lib/scoring.js`.
Indicatief: 0-30 cold, 30-60 warm, 60-100 hot, 100+ sales-ready.

## Re-use voor andere REPP-projecten

`src/data/project.js` en (delen van) `src/data/flow.js` vervangen volstaat
voor een ander project. UI en scoring blijven gelijk. Voor projectspecifieke
focus-varianten kunnen extra `focus_*`-vragen in `flow.js` toegevoegd worden.

## Demo-mode

Debug-paneel toont:
- aankoopfase + temperatuur
- score + persona
- alle antwoorden + lead-gegevens
- aanbevolen content-cards, unit en salesactie
- afhaak-risico

Open via "DEMO"-knop rechtsboven, of `?debug=1` in URL.

## Wat de demo bewust **niet** is

- geen echte CRM-koppeling
- geen echte mail
- geen echte WhatsApp API (deeplink wel — `wa.me/...`)
- geen multi-projectkeuze (één project per build)
- geen A/B-tooling

## Tech stack

- Vite 5 · React 18 · Tailwind v4 (`@tailwindcss/vite`)
- Vercel-compatible (zero-config)
