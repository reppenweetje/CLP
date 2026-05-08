# CLP Wizard

Onboarding-handboek voor het opstarten van een nieuwe Conversational Landing Page op basis van deze REPP-template. Bedoeld om door **Claude Code** in een verse clone gevolgd te worden, met de gebruiker als beslisser bij elke fase.

> **Status checken**: `npm run wizard:status` rapporteert per fase wat al gedaan is en wat nog open staat.

## Hoe deze wizard werkt

**Triggerwoorden** (in CLAUDE.md ook geregistreerd):
- "nieuw project setup"
- "verder met de basis"
- "setup nieuwe CLP voor [projectnaam]"

Wanneer de gebruiker een van deze zinnen tikt of de repo voor het eerst opent, doorloop je de wizard van Fase 0 tot Fase 8. Elke fase heeft drie onderdelen:

1. **Beslismomenten** (vragen aan gebruiker, één voor één)
2. **Concrete acties** (bestanden bewerken, scripts draaien)
3. **Validatie-gate** (script of check die groen moet zijn voor je verder mag)

Niet alles is verplicht. Fase 7 (optionele integraties) loop je per stuk langs en de gebruiker kiest wat ze willen. Stiltes (geen antwoord) zijn nooit toestemming, vraag altijd door.

> **Belangrijk**: tone-of-voice in de chat is **sentence case + Nederlandse interpunctie + geen leesstreepjes** (geen em-dashes, geen interpuncten). `npm run check-copy` bewaakt dat. Dezelfde regel geldt voor alle copy die je in deze wizard genereert.

---

## Fase 0: Detecteer + scope

Voor je iets gaat doen: weet wat je bouwt en hoe ambitieus.

### Stap 0.1: Bevestig template-modus

Check of dit een verse clone is:
```bash
grep "id: 'de-hofman'" src/data/project.js && echo "TEMPLATE MODE"
```

Als de De Hofman id nog erin staat én de gebruiker zegt iets dat op nieuwe-project-setup duidt: vraag bevestigend:

> "Dit lijkt een verse template-clone. Klopt dat? Gaan we een nieuwe CLP opzetten?"

### Stap 0.2: Vraag het project-archetype

> "Voor we beginnen, even checken: dit project is **vergelijkbaar met De Hofman** (vastgoed-koop, units met m², persona belegger of eigen-gebruiker, NL-context)? Of is dit iets anders, bijvoorbeeld woningen, garageboxen, kavels, bedrijfsruimte-huur, of een propositie van REPP zelf?"

Op basis van het antwoord:

- **Vergelijkbaar met De Hofman** → ga naar Fase 1 (Pad A: standaard content-fill)
- **Iets anders** → ga eerst naar Fase 3 (Pad B: co-design flow + signalen) en kom dan terug naar Fase 1 voor content-fill

Zie de bijlage onderaan dit document voor referentie-archetypes.

### Stap 0.3: Vraag welke integraties ze willen

Vraag dit één keer expliciet en noteer de antwoorden, dan weet je welke fases je later opent of overslaat:

> "Welke integraties wil je activeren? Ik geef per stuk wat je nodig hebt en wat het kost om aan te zetten:"

| Integratie | Wat het doet | Kosten / vereiste |
|---|---|---|
| **Vercel hosting** | Hosting + auto-deploy op git push | Vercel-account, 5 minuten setup |
| **Plausible analytics** | Privacy-vriendelijke analytics + custom events | Plausible-account (€9/mnd), domein toevoegen |
| **WhatsApp deep-link** | Header-knop opent WA met prefilled bericht | WhatsApp-nummer |
| **Admin panel** | Sales-dashboard achter password met live KPI's | 1 password kiezen, niet-publiek hosten |
| **Slack hot-leads** | Real-time pings in eigen channel bij callback-aanvraag | Slack-workspace, Hothothot-app, channel + webhook |
| **Supabase + Brevo** | CRM-persistence + email sync naar Brevo | Backend-dev contact (Tharwat-traject), Supabase-project, Brevo-account |
| **A/B variant testing** | Kopjes-tekst en CTA-labels roteren voor optimalisatie | Niets extra's, gewoon labels invullen |
| **Mortgage / Rentability calculator** | Sliders in unit-detail voor maandlast of rendement | Alleen voor vastgoed-koop relevant |

**Aanbeveling voor MVP**: Vercel + WhatsApp + Plausible + Admin. Voeg Slack + Supabase pas toe als de basis loopt.

Onthoud de antwoorden, je gebruikt ze in Fase 7.

### Stap 0.4: Bevestig scope

Vat samen en vraag bevestiging:

> "Helder. Ik ga je begeleiden door 8 fases:
> 1. Project-basis (naam, sales team, contact)
> 2. Inhoud (assets, units, persona-copy, marketing-content)
> 3. Flow + signalen (alleen als project afwijkt van De Hofman)
> 4. Stijl + tone
> 5. Build + lokaal valideren
> 6. Hosting + analytics
> 7. Optionele integraties: [Slack? ja/nee], [Supabase? ja/nee], etc.
> 8. Smoke-test + go-live + hand-off
>
> Aan het eind kun je de live CLP overdragen aan je sales-team. Klaar om te beginnen?"

---

## Fase 1: Project-basis

> Triggert: alle CLP's. Validatie-gate: `npm run check-content` plus `wizard:status` Fase 1 op groen.

### Stap 1.1: Project-identiteit

Stel deze vragen één voor één en noteer in `src/data/project.js`:

| Veld | Voorbeeld | Toelichting |
|---|---|---|
| `id` | `de-hofman`, `het-anker`, `repp-finance` | Lowercase met streepjes. Gebruikt voor analytics en source-prefix |
| `name` | `de hofman` | Lowercase voor interne referentie |
| `displayName` | `De Hofman`, `REPP Finance` | Titlecase, wat de bezoeker ziet |
| `tagline` | `Omdat Haarlem werkt.` | Eén regel, sentence case, vaak met locatie of unique value |
| `shortDescription` | `14 hoogwaardige bedrijfsunits in Haarlem Waarderpolder.` | Eén zin met aantal of scope plus locatie |

Bewerk `src/data/project.js` regel voor regel. Vraag bij elke entry of de gebruiker akkoord is met jouw voorgestelde tekst.

### Stap 1.2: Sales team

| Veld | Voorbeeld | Toelichting |
|---|---|---|
| `salesTeam.bot.name` | `Jesse` | Chat-persona, aanwezig in de begroetings-bubble |
| `salesTeam.bot.org` | `REPP` | Organisatie, "ik ben Jesse van REPP" |
| `salesTeam.rep.name` | `Jann` | Collega die belt bij hand-off |
| `salesTeam.rep.context` | `Waarderpolder-markt` | Korte marktcontext voor de handoff-copy |

> **Tip**: bot.name en rep.name kunnen dezelfde persoon zijn als 1 makelaar het hele traject doet. Default in De Hofman is dat ze identiek zijn (Jesse).

### Stap 1.3: Contact-kanalen

| Veld | Voorbeeld | Toelichting |
|---|---|---|
| `phoneNumber` | `020-2610080` | Voor bel-knop in header en WarmHandoffBubble |
| `whatsappNumber` | `+31616079428` | Begint met `+`, alleen cijfers en spaties. Gebruikt voor WA-deeplink |
| `brochureUrl` | `/brochure.pdf` | Standaard relatief pad, brochure direct uit `public/` |

### Stap 1.4: Update package.json + README

```bash
# Bewerk package.json: name + description naar het nieuwe project
# Bewerk README.md: vervang "De Hofman" referenties door projectnaam
```

### Validatie-gate

```bash
npm run wizard:status
# Fase 1 moet 7/7 zijn voor je doorgaat
```

---

## Fase 2: Inhoud + assets

> Triggert: alle CLP's. Validatie-gate: `npm run check-content` op groen.

### Stap 2.1: Assets-checklist

Vraag de gebruiker om de volgende files in `public/images/` te plaatsen voordat je doorgaat:

```
public/
├── images/
│   ├── hero.jpg          ← representatief openingsbeeld (16:9 of 4:5)
│   ├── exterieur.jpg     ← straataanzicht of buitenkant
│   ├── unit-l.jpg        ← per unit-type één beeld (kan ingericht of leeg)
│   ├── unit-xl.jpg
│   ├── unit-xxl.jpg
│   └── sfeer-1.jpg t/m sfeer-6.jpg  ← 4 a 6 beelden voor de gallery
└── brochure.pdf          ← max ongeveer 15 MB voor Vercel
```

Andere image-formats (PNG, WEBP) kunnen ook, mits je de paden in `project.js` overeenkomstig aanpast.

### Stap 2.2: Units en pricing

Vraag per unit-type:

- Type-letter (L, XL, XXL, A, B, etc)
- Vierkante meters (m²)
- Aantal lagen / verdiepingen
- Prijs vanaf (in euros)
- Beschikbaarheid (`available`, `sold`, `sold_ov`, `reserved`, `coming_soon`)
- Pitch-zin (1 zin met USP)
- Gebruiks-tags (`['opslag', 'showroom', 'kantoor', ...]`)
- Image-pad

Bouw `project.units` plus `project.sitePlan.rows` (visuele plattegrond-grid).

### Stap 2.3: Persona-copy

Voor elke persona (`eigen_gebruiker`, `belegger`, `beide`, `onbekend`) vraag:

- `microIntro`: korte zin direct na de intent-keuze, zet de toon voor wat volgt
- `recommendCopy`: 1-2 zinnen die de aanbeveling persoonlijk inkleuren
- `handoff.observations`: per signaal (calc, multiUnit, default) een korte observatie zonder oordeel
- `handoff.shortTimelineHeadline`: zin als bezoeker korte timeline koos
- `handoff.body`: 2-3 zinnen die normaliseren ("dit koop je niet zomaar") en de collega introduceren
- `handoff.valueBullets`: 3 bullets met wat de call concreet oplevert
- `waPhrase`: zin in de eerste persoon voor het prefilled WhatsApp-bericht

Bied de De Hofman versie aan als startpunt en pas aan op suggestie van de gebruiker.

> **Tone-of-voice eisen**: max 1-2 zinnen per bubble, sentence case, geen tijdsbeloften, geen populair-jargon, geen leesstreepjes (em-dashes of interpuncten zijn verboden, gebruik komma's of spaties).

### Stap 2.4: Marketing-content

| Veld | Wat | Voorbeeld-aantal |
|---|---|---|
| `highlights` | USP's met title + body | 6 a 8 stuks |
| `uspCards` | USP-cards in de microValue-stap | 6 stuks |
| `process` | Stappen van orientatie tot oplevering | 6 stappen |
| `planning` | Fases met datum-indicaties | 4 fases |
| `priceComparison` | Rijen met vergelijkbare projecten in dezelfde markt | Inclusief peildatum |
| `investor` | BAR-bandbreedte, kernfactoren, fiscale punten | Alleen als belegger-doelgroep |
| `location` | Bereikbaarheid + omgeving + kaart-coords | Inclusief travelTimes en surroundings |
| `contentCards` | Generieke content-cards in moreInfo | 6 a 7 stuks |

### Validatie-gate

```bash
npm run check-content   # moet groen zijn voor verder
npm run wizard:status   # Fase 2 moet 7/7 zijn
```

---

## Fase 3: Flow + signalen

> Triggert: alleen Pad B (afwijkend project-archetype). Sla over voor De Hofman-achtige projecten.

Voor afwijkende project-types (woningen, garageboxen, kavels, propositie, huur) pas je de logica in deze drie bestanden aan vóór je terug gaat naar content-fill.

### Stap 3.1: Begrijp het project

Stel deze vragen één voor één:
1. Wat verkoop of bied je precies?
2. Wat is de typische koper? Beschrijf 1 a 3 personas in eigen woorden
3. Wat zijn de top-3 factoren waarop een koper zijn keuze baseert? (locatie, prijs, oppervlakte, opbrengst, omgeving, indeling, opleverdatum, etc)
4. Wat zijn typische dealbreakers? (afhaak-redenen)
5. Welk gedrag verraadt sterke koop-intentie?

### Stap 3.2: Ontwerp de vragen-flow

Open `src/data/flow.js` als referentie. De Hofman heeft:
```
intent → availabilityCheck → brochureTrigger → lead-capture → size → timeline → moreInfo → followup
```

Voor jouw project:
1. Wat is de natuurlijke openings-vraag? Welke 3 a 5 antwoord-chips? Welke persona koppelt aan welk antwoord?
2. Welke 1 a 3 kwalificerende vragen heb je nodig vóór je een aanbeveling kunt doen?
3. Op welk moment vraag je e-mail / naam / 06?
4. Welke afhaak-redenen passen?
5. Wil je een rentRange-pad zoals De Hofman of niet?

Pas `src/data/flow.js` aan met de nieuwe vragen en chip-opties. Houd de keys consistent met de App.jsx state-machine. Als je een nieuwe stap toevoegt, voeg 'm ook toe aan `ANSWER_ORDER` in `src/App.jsx`.

### Stap 3.3: Ontwerp de aanbeveling

Open `src/lib/recommendation.js` als referentie. De Hofman doet "L of XXL" op basis van size-id. Voor jouw project:
1. Welke eenheden of objecten kan een bezoeker kiezen?
2. Welk veld in `project.units` bepaalt welke wordt aanbevolen?
3. Op basis van welke antwoorden? Schrijf de logica uit in `recommendUnit(answers, project)`.
4. Past `project.units` shape (type, size, levels, priceFrom, image, pitch, uses, stateLabel) of moet 'ie aangepast?

### Stap 3.4: Ontwerp de koop-signalen

Open `src/lib/buyingSignals.js` als referentie. De Hofman gebruikt SIGNAL_DEFS met weights, plus TEMPERATURE_THRESHOLDS (hot 50, warm 25). Voor jouw project:

1. Welke 3 a 5 sterke koop-signalen passen bij dit archetype?
2. Welke 1 a 2 negatieve signalen (afhaak, declined phone, onduidelijk timeline)?
3. Pas SIGNAL_DEFS-gewichten aan zodat de drempels realistisch zijn voor jouw flow.
4. Verwijder calc-signalen die niet relevant zijn (bv. `rentability_calc` als er geen BAR-tool is) plus de bijbehorende calc-component uit `SitePlanBubble.jsx`.

### Stap 3.5: Personas

Update `derivePersona()` in `src/lib/scoring.js` als de persona-namen in jouw project anders zijn dan eigen_gebruiker / belegger / beide / onbekend.

### Validatie-gate

Geen automatische, maar test handmatig met `?debug=1` op de live demo dat:
- Persona-detectie klopt voor elke intent-keuze
- Buying-temperature komt op `hot` zoals verwacht voor jouw 'echt-hot' scenario
- Aanbeveling matcht antwoorden

Daarna terug naar Fase 1 voor de content-fill.

---

## Fase 4: Stijl + tone

> Triggert: alle CLP's, maar de meeste zullen alleen de tone-of-voice check nodig hebben.

### Stap 4.1: Brand tokens (optioneel)

REPP-default tokens staan in `src/index.css` onder `@theme`. Alleen aanpassen als jouw project een ander merk vertegenwoordigt:

| Token | Waar gebruikt | REPP default |
|---|---|---|
| `paper` | Bot bubble bg | `#ffffff` |
| `canvas` | App background | `#f7f6f1` |
| `midnite` | Primary brand, user bubble, CTAs | `#0f0f70` |
| `neon` | Accent CTA (max 1 per scherm) | `#edff00` |
| `gold` | 1px accent lijnen | `#c9a45c` |

Voor non-REPP projecten: vraag de gebruiker om de hex-codes en pas ze aan in `src/index.css`.

### Stap 4.2: Tone of voice

Niet onderhandelbaar:
- Sentence case + Nederlandse interpunctie
- Hoofdletter aan begin van zin, punt aan einde
- Bot-bubbles max 1 a 2 zinnen
- Stem is "we" (organisatie) of "ik" (de chat-persona), nooit door elkaar in dezelfde bubble
- Geen tijdsbeloften ("in 60 seconden")
- Geen populair-jargon ("topper", "fixen we")
- Geen emojis of smileys
- Geen leesstreepjes (em-dash, interpunct, en-dash)

### Validatie-gate

```bash
npm run check-copy   # 0 violations
```

---

## Fase 5: Build + lokaal valideren

> Triggert: alle CLP's.

### Stap 5.1: Install dependencies

```bash
npm install
```

### Stap 5.2: Doorloop lokaal

```bash
npm run dev          # vite op poort 5174 (of een andere poort, zie output)
```

Open in browser en:
- Doorloop de chat van begin tot eind voor elke persona
- Test op mobiele viewport (`Cmd+Option+M` in Chrome devtools)
- Check de WhatsApp-knop opent een geldig WA-bericht
- Check de bel-knop opent de phone-app
- Check brochure-download triggert
- Check `?debug=1` toont het debug-paneel

### Stap 5.3: Build

```bash
npm run build
```

Dit draait `prebuild` (= `check-content`) automatisch. Bundle moet onder 700KB blijven (gzip onder 200KB).

### Validatie-gate

```bash
npm run check-content   # groen
npm run check-copy      # groen
npm run build           # groen
```

---

## Fase 6: Hosting + analytics

> Triggert: alle CLP's. Vraag eerst of de gebruiker met Vercel + Plausible wil werken (zie Stap 0.3 antwoorden).

### Stap 6.1: Vercel project

```bash
# Eenmalig: install Vercel CLI als nog niet aanwezig
npm install -g vercel

# Linkmaak een nieuw Vercel-project aan deze repo
vercel link
# Of via dashboard: vercel.com → Add New → Import Git Repository
```

Vercel auto-detecteert Vite. Geen `vercel.json` nodig voor de basis.

### Stap 6.2: Domein

Voor productie: koppel een eigen subdomein zoals `kopen.<klant>.nl` of `<project>.clp.repp.nl`. Vercel wijst je hoe de DNS-records (A of CNAME) gezet moeten worden bij je DNS-provider.

### Stap 6.3: Plausible analytics

1. Maak account op plausible.io of gebruik bestaande REPP-account
2. Voeg jouw productie-domein toe als site
3. `npm run setup:plausible` koppelt de bestaande custom-events als goals
4. Plausible-script wordt automatisch geladen in `index.html` via een meta-tag

> **IP-exclusie voor team-verkeer**: open admin-panel `/admin` (zie Fase 7), Settings, voeg jouw publieke IP toe aan de exclusie-lijst zodat je eigen test-bezoeken niet meegerekend worden in de stats.

### Stap 6.4: Eerste deploy

```bash
vercel --prod
# Of: git push naar main, Vercel auto-deployt
```

Wacht tot de deploy "Ready" is. Test de live URL meteen op:
- Hero rendert
- Chat-flow loopt door
- WhatsApp-knop werkt
- Brochure download werkt

### Validatie-gate

Live URL is bereikbaar en de chat werkt end-to-end.

---

## Fase 7: Optionele integraties

> Triggert: per stuk op basis van Fase 0.3 antwoorden. Sla over wat de gebruiker niet wil.

### 7A: WhatsApp deep-link verificatie

**Wanneer**: altijd, tenzij expliciet uitgezet.

**Wat**: header-knop opent WhatsApp met een prefilled bericht. Bezoekers met WhatsApp-desktop of -mobiel komen direct in een chat.

**Setup**:
1. Verifieer dat `project.whatsappNumber` in `src/data/project.js` met `+` begint
2. Test op mobiel of de knop daadwerkelijk WhatsApp opent
3. Customisemobile prefilled bericht in `src/lib/recommendation.js::whatsAppDeeplink()`

### 7B: Slack hot-leads

**Wanneer**: gebruiker zei "ja" in 0.3 op Slack-vraag.

**Wat**: Vercel function `/api/slack-hot.js` post in een privé Slack-channel zodra een bezoeker expliciet om callback vraagt. Bevat naam, telefoonnummer (clickable), persona, intent, score plus action-buttons.

**Setup**:
1. Maak een Slack-app in jouw workspace (api.slack.com/apps)
2. Activeer **Incoming Webhooks** in de app-config
3. Voeg een webhook toe voor het kanaal waar de pings moeten landen
4. Kopieer de webhook URL
5. Voeg in Vercel project-settings, Environment Variables (Production + Preview):
   ```
   SLACK_WEBHOOK_URL = https://hooks.slack.com/services/...
   ```
6. Redeploy productie zodat de env-var wordt meegenomen
7. Test door een chat te doorlopen tot je expliciet op "Even contact opnemen" klikt en een 06 invult. Slack-channel moet binnen 5 seconden een ping krijgen

**Volume-tuning**: standaard pingt 'ie alleen bij expliciete callback-aanvraag. Wil je breder triggeren, pas de useEffect-condition in `src/App.jsx` aan rond regel 670 en de `notifyHotLead` payload.

> **Veel volumes ineens?** localStorage-dedupe op `clp-slack-notified-v1` zorgt dat dezelfde sessionId nooit twee keer pingt, ook niet na page-reload.

### 7C: Supabase + Brevo

**Wanneer**: gebruiker zei "ja" in 0.3 op Supabase-vraag, en je hebt een backend-dev voor het Edge Function deployment werk.

**Wat**: lead-data wordt real-time gesynced naar een Supabase-tabel plus geforward naar Brevo voor email-marketing. Achter een feature-flag dus zonder je het aanzet draait de CLP gewoon op localStorage.

**Setup** (samen met backend-dev):
1. Volg de briefing in `supabase/README.md`
2. Backend-dev deployt de migrations + Edge Function `lead-upsert` plus configureert ALLOWED_ORIGINS en Brevo secrets
3. Wij flippen `VITE_SUPABASE_ENABLED=true` in Vercel + redeployen
4. Smoke-test: doorloop een chat tot na e-mail-invoer, controleer dat de rij verschijnt in Supabase

**Admin-tile**: na activatie zie je in `/admin` onder de section "Supabase" een live-tile met queue-status, master-switch, oudste 3 wachtende items.

### 7D: Admin panel toegang

**Wanneer**: gebruiker zei "ja" in 0.3 op Admin-vraag.

**Wat**: dashboard achter een password-gate met live-funnel, hot-leads, A/B significance, sessions list, en de Supabase queue-tile.

**Setup**:
1. Open `src/components/admin/AdminPasswordGate.jsx` en zet een eigen password (gehashed of plain, hashen wordt aangeraden voor productie)
2. Admin is bereikbaar op `/admin`
3. Stel jezelf via Settings, IP-exclusie in zodat je eigen verkeer niet meegerekend wordt in Plausible

### 7E: A/B variant testing

**Wanneer**: gebruiker zei "ja" in 0.3 op A/B-vraag.

**Wat**: copy-varianten op intent / brochureTrigger / timeline en CTA-labels. Plausible logt de variant per event zodat je per variant conversie kunt zien.

**Setup**:
1. Open `src/data/flow.js`, kijk naar `labelVariants` op intent / brochureTrigger / timeline. Pas de B-variant aan
2. Open `src/lib/cta.js`, alle vier varianten staan op `START CHAT`. Verschillende labels invullen activeert weer de A/B test
3. Plausible toont per event automatisch een `copyVariant` en `ctaVariant` property zodat je vanuit het dashboard kunt segmenteren

### 7F: Mortgage / Rentability calculator

**Wanneer**: alleen voor vastgoed-koop projecten waar bezoekers maandlast of rendement willen begrijpen.

**Setup**: standaard meegeleverd. Open `src/components/MortgageCalc.jsx` en `src/components/RentabilityCalc.jsx` om defaults te tunen (rente, looptijd, BAR-bandbreedte).

### Validatie-gate

Per integratie eigen rookproef. Geen blokkerende global gate.

---

## Fase 8: Smoke test + go-live + hand-off

> Triggert: alle CLP's. Laatste fase.

### Stap 8.1: End-to-end smoke-test

Op productie URL, in een verse incognito-tab:

- [ ] IntroScreen rendert met juiste hero plus CTA
- [ ] START CHAT triggert de chat met de juiste begroetings-bubble
- [ ] Doorloop een eigen-gebruiker pad tot na e-mail
- [ ] Doorloop een belegger pad tot moreInfo
- [ ] Klik "Even contact opnemen" en check dat WarmHandoffBubble direct contact-opties toont
- [ ] Submit een 06-nummer en check Slack-pings (als integratie aan)
- [ ] Check Supabase-tabel voor de lead-rij (als integratie aan)
- [ ] Check brochure-download
- [ ] Refresh de pagina, check SmartResumeBanner
- [ ] Klik logo in chat, check terug naar intro met chat-resume
- [ ] Mobile-test op echt apparaat (iPhone + Android)

### Stap 8.2: Eerste echte lead doorlopen

Vraag iemand uit het sales-team om de chat zelf te doorlopen alsof ze een geinteresseerde zijn. Check dat:
- Ze de UI begrijpen zonder uitleg
- De copy in elke persona-flow goed leest
- De callback-aanvraag een ping geeft in Slack
- De response-tijd binnen verwachting is

### Stap 8.3: Hand-off aan sales-team

Vul `HANDOFF.md` in met de project-specifieke gegevens (placeholders staan in het bestand) en stuur 'em naar de sales-makelaar plus eventueel marketing.

### Klaar

```bash
npm run wizard:status
# Alle verplichte fases moeten op groen
```

---

## Onderhoud (na de wizard)

### Unit-status updaten

```bash
# Bewerk src/data/project.js: project.sitePlan.rows[].units[].state
# Mogelijke states: available, sold, sold_ov, reserved, coming_soon
git commit -m "unit beschikbaarheid bijgewerkt"
git push origin main
# Vercel auto-deployt
```

### Copy-ronde

1. Bewerk `src/data/project.js` (persona-copy + content-cards) of `src/data/flow.js` (vragen)
2. `npm run check-copy` moet groen blijven
3. `npm run dev` om lokaal door te lopen
4. Commit + push, Vercel auto-deployt

### CTA A/B testen

Bewerk `src/lib/cta.js`, geef varianten verschillende labels. Plausible toont per variant conversie.

### Scoring tunen

Bewerk `src/lib/buyingSignals.js`:
- `SIGNAL_DEFS` voor signaal-gewichten
- `TEMPERATURE_THRESHOLDS` voor warm/hot grenzen
- Test met `?debug=1` op de live demo

### Slack-volume bijsturen

Open `src/App.jsx`, zoek `notifyHotLead`. Pas de useEffect-conditie aan:
- Strikter: vereis een minimum-score boven de huidige callback-trigger
- Soepeler: trigger ook bij hot-temperature zonder callback-aanvraag

### Supabase queue monitoren

Open `/admin` en ga naar de Supabase-section. Achterstand boven de 10 items? Check Vercel function logs of Supabase Edge Function logs voor errors. Handmatig flushen kan via de "Flush nu" knop in de tile.

---

## Bijlage A: Archetypes (referentie voor Pad B)

### Vastgoed-koop (referentie-implementatie: De Hofman)
- Personas: eigen-gebruiker, belegger, beide
- Kwalificerende vragen: gewenste m², timeline
- Aanbeveling: unit-type op basis van m² en gebruik
- Signalen: rendement-calc, maandlast-calc, multi-unit views, timeline-zsm

### Vastgoed-huur
- Personas: huurder (privaat, zakelijk)
- Kwalificerende vragen: gewenste m², gewenst budget per maand, timeline
- Aanbeveling: unit-match op basis van budget + m²
- Signalen: budget-calc, locatie-info-views, multi-bezichtiging-aanvragen
- Vervalt: BAR-rendementscalc, hypotheek-tool

### Garageboxen-koop
- Personas: eigen-gebruik (opslag, hobby), belegger
- Kwalificerende vragen: oppervlakte (10-30 m²), gebruik (auto, opslag, atelier), locatie-radius
- Aanbeveling: type box (single, double, oversized) op basis van gebruik
- Signalen: meerdere boxen bekeken, locatie-info opgevraagd, prijs-vergelijking
- Vervalt: BAR-rendementscalc, hypotheek-tool

### Woningen-koop
- Personas: starter, doorgrooier, belegger
- Kwalificerende vragen: aantal slaapkamers, tuin-wens, opleveringstijd, prijsklasse
- Aanbeveling: woningtype, etage, oppervlakte
- Signalen: bezichtiging-aanvraag, hypotheek-tool, plattegrond meerdere keren bekeken
- Vervalt: m²-prijs-vergelijking is anders dan bedrijfsunit, BAR niet relevant voor starters

### Kavels
- Personas: zelfbouw, projectontwikkelaar
- Kwalificerende vragen: bouwdoel, oppervlakte, budget, opleveringstijd
- Aanbeveling: welke kavel(s) op basis van bouwdoel + budget
- Signalen: bestemmingsplan opgevraagd, meerdere kavels vergeleken, contact gemeente-info
- Vervalt: m²-prijs-vergelijking met buurprojecten heeft minder zin, elke kavel uniek

### REPP-propositie (bv. Octopus, Finance)
- Personas: ondernemer (klein, middelgroot), corporate
- Kwalificerende vragen: bedrijfsgrootte, sector, hulp-behoefte
- Aanbeveling: welke REPP-tool of -dienst past
- Signalen: meerdere tools bekeken, demo-aanvraag, prijs-pagina bezocht
- Vervalt: vastgoed-specifieke calcs, situatietekening

---

## Bijlage B: Component-inventaris (referentie)

Wat is er allemaal beschikbaar in deze template, voor het geval je later iets wil hergebruiken of aanpassen.

### Bubble-types (in `src/components/`)
- `BotMessage`, `UserMessage`, `Avatar`, `TypingIndicator` (chat primitives)
- `ContentBubble`, `GalleryBubble`, `LocationBubble` (rich content)
- `SitePlanBubble`, `UnitBubble`, `HighlightsBubble` (vastgoed-specifiek)
- `PriceBubble`, `PriceCompareBubble`, `ProcessBubble`, `PlanningBubble`
- `InvestorBubble`, `BrochureBubble`, `CtaBubble`
- `WarmHandoffBubble` (callback-flow met directContact mode)
- `ServiceCardBubble` (legacy, optioneel)
- `MortgageCalc`, `RentabilityCalc` (calculators in unit-detail)

### Engagement-helpers
- `RescueNudge` (stalled-session detection)
- `ExitIntentPrompt` (afhaak-reden capture)
- `SmartResumeBanner` (terugkerende bezoekers)
- `OptionsSheet` (uitklapbaar onderwerpen-overzicht)
- `CredionConfirmDialog` (misclick-guard voor financierings-aanvraag)

### Admin-widgets (in `src/components/admin/`)
- `AdminPasswordGate`, `AdminSidebar`, `AdminSettings`
- `KpiCard`, `FunnelChart`, `RealTimeTile`
- `PersonaBreakdown`, `VariantBreakdown`, `AfhaakBreakdown`
- `SankeyFlow`, `BubbleExposure`, `CohortHeatmap`
- `DropoffMatrix`, `TimeToConversion`, `HotLeads`
- `ABSignificance`, `AIWeeklySummary`
- `SessionsList`, `SessionReplay`, `DateRangePicker`
- `SupabaseQueueTile`

### Lib-modules (in `src/lib/`)
- `analytics.js` (event-tracking, sessie-management, Plausible-bridge)
- `scoring.js` (deriveStage, derivePersona, computeScore)
- `buyingSignals.js` (SIGNAL_DEFS, TEMPERATURE_THRESHOLDS, computeBuyingSignals)
- `recommendation.js` (recommendUnit, recommendCopy, whatsAppDeeplink)
- `handoffCopy.js` (buildHandoffCopy, buildHandoffBridge, persona-aware copy)
- `cta.js` (CTA-rotatie A/B)
- `engagement.js` (variant-assignment voor copy A/B)
- `parseLead.js` (regex parser vrije-tekst naar email/phone/firstName)
- `consent.js` (privacy-statement versie + consent-event log)
- `api.js` (Supabase Edge Function client + localStorage queue)
- `slack.js` (Slack notification helper met dedupe)
- `ipExclusion.js` (admin IP-exclusie)
