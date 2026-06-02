# Project Intake — CLP voor [PROJECTNAAM]

> **Hoe te gebruiken**: vul dit document volledig in vóór je een setup-sessie start met Claude Code. Hoe completer, hoe minder vragen tussendoor.
>
> Bewaar het ingevulde document in `examples/intake-<slug>.md` zodat het bewaard blijft.
>
> Velden gemarkeerd met **(verplicht)** moeten ingevuld zijn. Velden met **(optioneel)** mag leeg.

---

## A. Project-identiteit

| Veld | Waarde | Voorbeeld De Hofman |
|---|---|---|
| Project naam **(verplicht)** | ... | De Hofman |
| Slug — lowercase, URL-vriendelijk **(verplicht)** | ... | dehofman |
| Adres + plaats **(verplicht)** | ... | A. Hofmanweg 23-27, Haarlem |
| Buurt / bedrijventerrein **(verplicht)** | ... | Waarderpolder |
| Tagline — één regel **(verplicht)** | ... | Omdat Haarlem werkt. |
| Korte omschrijving — 1 zin **(verplicht)** | ... | 14 hoogwaardige bedrijfsunits in Haarlem Waarderpolder. |
| Sales-type **(verplicht)** | koop / huur / mixed | koop |
| Unit-typologie **(verplicht)** | bv "2-laags bedrijfsunits" | 2-laags nieuwbouw bedrijfsunits |
| **Portal-strategie** **(verplicht)** | `own-portal` / `kopen-repp-redirect` | own-portal |
| **Portal-URL** **(verplicht)** | volledige URL waar de lead na lead-capture naartoe gaat | https://dehofman.nl |

### Toelichting Portal-strategie

| Strategie | Wanneer | Wat de lead krijgt |
|---|---|---|
| `own-portal` | Project heeft eigen dedicated portal-site (zoals dehofman.nl) | Unieke portal-code via mail + WhatsApp, gated content op eigen domein |
| `kopen-repp-redirect` | Project gebruikt het algemene REPP-portal `kopen.repp.nl/<slug>` | Directe verwijzing zonder portal-code. Simpelere Brevo-mail (alleen brochure + bedankt) |

Voor nieuwe projecten is `kopen-repp-redirect` de default — minder setup, geen aparte portal-site nodig.

**Impact per strategie:**

| Onderdeel | `own-portal` | `kopen-repp-redirect` |
|---|---|---|
| Aparte portal-repo nodig? | Ja (zoals projectportal voor De Hofman) | Nee |
| Brevo email-template | Met portal-code (magic-link) | Zonder portal-code (alleen brochure-link) |
| CLP CTA na lead-capture | "Bekijk je portal" → eigen domein | "Bekijk meer" → `kopen.repp.nl/<slug>` |
| WhatsApp-bericht (Gemini) | Identiek | Identiek (zegt "via mail ontvangen", werkt voor beide) |
| Externe setup-tijd | +2-4u (portal-site bouwen) | Geen extra |

---

## B. Units + plattegrond

### B.1 Algemene unit-info
| Veld | Waarde | Voorbeeld |
|---|---|---|
| Totaal aantal units **(verplicht)** | ... | 14 |
| Aantal lagen per unit **(verplicht)** | 1 / 2 / 3 | 2 |
| Unit-types in gebruik **(verplicht)** | bv L, XL, XXL of A, B | L, XL, XXL |

### B.2 Per type — afmetingen + prijs
| Type | m² BG | m² totaal | Lagen | Vanaf-prijs | €/m² | VVE/maand |
|---|---|---|---|---|---|---|
| L | 52,5 | 105 | 2 | €239.500 | €2.281 | €... |
| XL | ... | ... | 2 | ... | ... | ... |
| XXL | ... | ... | 3 | ... | ... | ... |

### B.3 Plattegrond-grid (situatietekening)
Beschrijf rijen × kolommen met type per positie:
```
Rij 1: XL | L | L | L | L | L | XXL
Rij 2: XL | L | L | L | L | L | XXL
```

### B.4 Status per unit (actueel)
| Nr | Type | Status |
|---|---|---|
| 1 | XL | sold |
| 2 | L | sold |
| 3 | L | available |
| ... | ... | ... |

Status-opties: `available` (groen), `sold_ov` (oranje, verkocht onder voorbehoud), `sold` (rood), `coming_soon` (grijs).

### B.5 Praktische unit-features
- Overheaddeur per unit: ja / nee
- Eigen parkeerplaats per unit: ... aantal
- Elektra: bv "3×25A standaard, 3×35A optioneel"
- Vrije hoogte BG: bv "4,5 m"
- Vrije hoogte 1e verdieping: bv "3,0 m"
- Vloerbelasting BG: bv "1.500 kg/m²"

---

## C. Pricing & financieel

| Veld | Waarde |
|---|---|
| Vanaf-prijs excl. btw **(verplicht)** | € ... |
| Prijs per m² excl. btw (gemiddeld) **(verplicht)** | € ... |
| VVE per maand per unit | € ... |
| Btw-handling | standaard 21% / vrij / ... |
| Vrij op naam (VON) | ja / nee |
| Aansluitkosten inbegrepen? | water + elektra + gas etc |
| Bedrijfsgebonden woning surcharge (indien van toepassing) | € ... extra |

### Beleggings-info (alleen invullen bij persona-set "belegger" of "beide")
| Veld | Waarde |
|---|---|
| Bruto aanvangsrendement (BAR) min | ...% |
| Bruto aanvangsrendement (BAR) max | ...% |
| Markthuur €/m²/jaar min | € ... |
| Markthuur €/m²/jaar max | € ... |
| Vergelijkingsgebied voor markthuur | bv Waarderpolder |

---

## D. Persona-set (vink aan welke relevant)

- [ ] **eigen_gebruiker** — MKB-ondernemer die zelf gaat gebruiken
- [ ] **belegger** — kopen om te verhuren
- [ ] **beide** — combinatie eigen-gebruik + belegging
- [ ] **huurder** — alleen relevant als project een huur-optie heeft

---

## E. Marketing-content

### E.1 USPs (3-5 hoogtepunten)
1. ...
2. ...
3. ...

### E.2 FAQ (minimaal 8, max 15 vraag-antwoord paren)
| Vraag | Antwoord |
|---|---|
| ... | ... |

### E.3 Locatie-story (2-3 zinnen)
Beschrijving van wat de locatie kenmerkt:
```
[Project] ligt op een [gevestigde bedrijvenlocatie / nieuw bedrijventerrein] in [stad], in [regio].
[Tweede zin met specifieke karaktertrek van de buurt].
```

### E.4 Locatie-benchmarks (3-5 nabije gebieden + reistijd)
| Naar | Reistijd | Vervoersmiddel |
|---|---|---|
| A9 | 3 min | auto |
| Haarlem CS | 6 min | auto |
| Schiphol | 25 min | auto |
| Amsterdam | 25 min | auto |
| ... | ... | ... |

### E.5 Omgeving-highlights (4-6 punten)
| Icoon | Tekst |
|---|---|
| business | Gevestigde bedrijvenlocatie met meer dan duizend ondernemingen |
| water | Direct aan het Spaarne, met groen op loopafstand |
| home | Woonwijk Schalkwijk en Haarlem-Oost op fietsafstand |
| parking | Eigen parkeerplaats per unit |
| lunch | Lunch en koffie op loopafstand |
| ... | ... |

Icoon-opties: `business`, `water`, `home`, `parking`, `lunch`, `train`, `nature`, `school`.

### E.6 Process / planning
| Mijlpaal | Datum / status |
|---|---|
| Voorverkoop start | ... |
| Bouw start | ... |
| Oplevering | ... |
| Verwachte fasering | ... |

### E.7 Scarcity-claim (optioneel)
Korte zin die schaarste benoemt:
```
Schaarste in [stad]. Binnen de stadsgrenzen is dit een van de laatste nieuwbouw-locaties voor [type].
```

---

## F. Documenten + assets

### F.1 Beelden
- [ ] Hero image (3840×2160 jpg, < 2MB) — naam: `hero.jpg`
- [ ] Logo (svg, transparent achtergrond) — naam: `logo.svg`
- [ ] Exterieur shot (1920×1080+ jpg) — naam: `exterieur.jpg`
- [ ] Gallery impressies (minimaal 6, max 12) — namen: `gallery-1.jpg`, `gallery-2.jpg`, ...
- [ ] Optioneel: timelapse-video van bereikbaarheid (mp4, <20MB) — naam: `bereikbaarheid.mp4`

### F.2 PDFs
- [ ] Brochure PDF (max 15MB) — naam: `brochure.pdf`
- [ ] Prijslijst PDF — naam: `prijslijst.pdf`
- [ ] Kavelpaspoort PDF (optioneel) — naam: `kavelpaspoort.pdf`
- [ ] Andere docs (optioneel) — naam: ...

### F.3 Logo + brand-kleuren (optioneel — standaard REPP-kleuren)
| Veld | Waarde |
|---|---|
| Primary brand color | hex / standaard REPP |
| Accent color | hex / standaard REPP |
| Custom font (anders dan Montserrat) | ja/nee |

---

## G. Mensen (sales team)

### G.1 Sales contact **(verplicht)**
| Veld | Waarde |
|---|---|
| Naam | ... |
| Functie / titel | bv "Verkoopmakelaar" |
| Telefoon | +31 ... |
| WhatsApp | +31 ... |
| E-mail | ... |
| Foto | naam: `sales.jpg` |

### G.2 Reservation contact (kan zelfde zijn als sales contact)
| Veld | Waarde |
|---|---|
| Naam | ... |
| Telefoon | ... |
| WhatsApp | ... |
| E-mail | ... |

### G.3 Beleggings-specialist (optioneel, alleen bij persona belegger/beide)
| Veld | Waarde |
|---|---|
| Naam | ... |
| Telefoon | ... |
| WhatsApp | ... |
| E-mail | ... |

---

## H. Externe accounts (klant levert toegang)

Welke heb je geregeld? (vink aan)
- [ ] Domeinnaam + DNS-toegang (bij welke registrar?: ...)
- [ ] Brevo account-toegang voor REPP (of: REPP gebruikt eigen account?)
- [ ] Meta Business Manager-toegang voor Pixel (of: REPP gebruikt eigen Pixel + share-met-klant?)
- [ ] Plausible-account-toegang (of: REPP-account hergebruiken?)
- [ ] GitHub team-toegang (read-only voor klant?)
- [ ] Vercel team-toegang
- [ ] Slack workspace (eigen workspace of REPP-workspace?)

---

## I. Backend routing (intern bij REPP — Claude vult automatisch)

Wordt automatisch afgeleid:
- **CLP source key**: `clp_<slug>` (bv `clp_paveri`)
- **Hostname**: `<slug>.clp.repp.nl`
- **Project-veld in Supabase**: `clp_<slug>`
- **Vercel project**: bestaande `clp` (we voegen alleen domain toe)

Volgende moeten handmatig aangemaakt + gevuld worden in EXTERNAL_SETUP_RUNBOOK:
- Brevo PORTAL list ID
- Slack hot-leads channel + webhook URL
- n8n routing entry (Tharwat doet)
- Plausible site setup (subdomein toevoegen of nieuwe site)
- Meta Pixel ID (hergebruik of nieuw)
- Evolution WhatsApp instance assignment (default: `repp`)
- CRM project label (Tharwat)

---

## J. Optionele features

Welke wil je activeren? (vink aan)
- [ ] **Mortgage calculator** (alleen voor koop-projecten, slider voor maandlast op basis van rente + LTV)
- [ ] **Rentability calculator** (alleen voor belegging-mogelijk, BAR-berekening)
- [ ] **Walk-in portal site** (aparte Next.js repo, zoals dehofman.nl, voor gated content + reserveren)
- [ ] **iDeal aanbetaling** via Mollie (1-5% aan notaris bij reserveren)
- [ ] **Notaris-koppeling** via DocuSign (digitaal koop-aannemingsovereenkomst)
- [ ] **AI Q&A na lead-capture** (vrije chat ipv scripted timeline-vragen)

---

## K. Notities / bijzonderheden

Vrije tekst voor projectspecifieke informatie die niet in een veld past:
```
...
```

---

## Mapping-tabel (referentie — Claude gebruikt dit om INTAKE → code/setup te vertalen)

| Intake-veld | Naar |
|---|---|
| A. Project-identiteit | `src/data/projects/<slug>.js` velden id, name, displayName, tagline, shortDescription, location, salesType, unitTypology |
| B.1-B.5 Units + plattegrond | `src/data/projects/<slug>.js` velden units, sitePlan, defaultSpecsByType |
| C. Pricing | `src/data/projects/<slug>.js` velden + `project_meta` Supabase rij (price_per_m2) |
| D. Persona-set | `src/data/projects/<slug>.js` veld personas |
| E.1-E.7 Marketing-content | `src/data/projects/<slug>.js` velden uspCards, faqs, location.highlights, location.surroundings, location.travelTimes |
| F.1-F.3 Documenten + assets | uploads naar `public/projects/<slug>/` |
| G. Mensen | `src/data/projects/<slug>.js` veld salesTeam |
| H. Externe accounts | EXTERNAL_SETUP_RUNBOOK actiepunten |
| I. Backend routing | EXTERNAL_SETUP_RUNBOOK + `project_meta` Supabase rij |
| J. Optionele features | `src/data/projects/<slug>.js` veld features `{ mortgageCalc: bool, rentabilityCalc: bool, ... }` |

---

*Versie 1.0 — Geschreven samen met Claude Opus 4 op 2026-06-02. Update vrij naar gelang nieuwe velden bijkomen in `project.js`.*
