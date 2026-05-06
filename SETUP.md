# Nieuw CLP-project opzetten

Deze repo is een GitHub-template. Eén keer klonen en je hebt een werkende CLP — daarna vervang je de De Hofman content door je eigen project.

## Snelle versie (met Claude Code)

Aanbevolen: open de gekloonde repo in Claude Code en zeg `nieuw project setup`. De wizard in `CLAUDE.md` start met één basisvraag — *"is dit een bedrijfsunit-koop project zoals De Hofman, of iets anders?"* — en kiest op basis daarvan het juiste pad:

- **Pad A — content-fill** voor projecten die qua structuur op De Hofman lijken: 9 stappen, gegidste vragen, alleen content invullen
- **Pad B — co-design** voor afwijkende project-types (woningen / garageboxen / kavels / huur / iets anders): Claude Code ontwerpt samen met jou de aangepaste vragen, aanbeveling-logica en koop-signalen voor jouw archetype, en pas dáárna ga je over naar content-fill

Beide paden eindigen op een werkende deploybare CLP. Pad B kost meer tijd (1.5-2u in plaats van 30-45 min) maar het resultaat is een volledig op jouw project afgestemde flow.

## Handmatige versie

Liever zelf invullen? Volg deze stappen.

### 1. Repo klonen

```bash
gh repo create reppenweetje/clp-jouwproject --template reppenweetje/CLP --private --clone
cd clp-jouwproject
npm install
```

### 2. Project content invullen

Open `src/data/project.js`. Dit is de enige bron-van-waarheid voor projectspecifieke content. Vervang alle De Hofman-velden door jouw eigen project.

Vereiste secties:
- **Identiteit**: `id`, `name`, `displayName`, `tagline`, `shortDescription`
- **Sales team**: `salesTeam.bot` (chat-persona) en `salesTeam.rep` (collega die belt)
- **Contact**: `phoneNumber`, `whatsappNumber`, `brochureUrl`
- **Units**: lijst met type, m², prijs, status, pitch
- **SitePlan**: visuele plattegrond-grid van units
- **Persona-copy**: 4 personas × 4 buckets (microIntro, recommendCopy, handoff, waPhrase)
- **Highlights, USPs, planning, process, prijsvergelijking**

Zie `src/data/project.js` zelf — De Hofman versie is de meest complete referentie.

### 3. Assets plaatsen

In `public/images/`:
- `hero.jpg` — representatief openingsbeeld
- `exterieur.jpg` — straataanzicht of buitenkant
- 4-6 sfeerbeelden voor de gallery
- 1 beeld per unit-type (`unit-l.jpg`, etc.)

Plus `public/brochure.pdf`.

### 4. Validatie

```bash
npm run check-content   # vereist project.js plus assets compleet
npm run check-copy      # Nederlandse interpunctie-regels
npm run build           # production bundle, includes check-content
```

Falen ze? Lees de error en fix tot alles groen is.

### 5. Update afhankelijke documentatie

- `CLAUDE.md` — vervang "Wat is dit" sectie met jouw project-omschrijving
- `package.json` — `name` en `description` veld
- `public/architectuur.html` — vervang projectnaam en sales-team-naam (zoek-en-vervang)
- `public/privacy.html` — idem; controleer bedrijfsgegevens en contactopties

### 6. Lokaal testen

```bash
npm run dev
```

Open de URL en doorloop de hele flow. Let op:
- **Bot intro**: klopt de begroeting?
- **Persona-pad**: kies elke persona één keer en check microIntro
- **Hot-moment**: ga naar timeline=zsm of 3mnd; service-card moet je projectspecifieke handoff-copy tonen
- **Header-WA zonder naam**: moet de naam-vraag triggeren en daarna correct prefilled bericht openen
- **CTA-cards**: in afhaak-pad en followup-pad — controleer de "Jouw interesse" tekst

### 7. Deploy

```bash
gh repo edit --homepage https://jouwdomein.vercel.app
git add -A && git commit -m "eerste setup voor jouwproject"
git push
```

Maak een nieuw Vercel-project, koppel aan de repo, deploy. Vercel detecteert Vite automatisch.

## Wat NIET aanpassen

Tenzij je echt een feature toevoegt:

- `src/components/*` — alle bubble-types zijn al project-agnostisch
- `src/lib/*` — buying-signals, scoring, parsing, deeplinks — generieke logica
- `src/App.jsx` — orchestrator, leest alles uit `src/data/project.js`
- `src/index.css` — REPP-brand tokens, blijven hetzelfde tenzij client-branding gewenst is

## Hulp nodig

- Architectuur-overzicht: open `/architectuur.html` op de live demo
- Privacy-aanpak: zie `/privacy.html` op de live demo en sectie b in `PROJECT_NOTES.md`
- Vragen: spreek Jann aan
