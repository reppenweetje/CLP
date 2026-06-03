# Project Intake — CLP voor De Paveri (LIVE — werkdocument)

> Gevuld door Claude op 2026-06-03 op basis van:
> - `/Users/flip/Downloads/Paveri BUnit (1).docx` (uitgebreide knowledge base)
> - Plattegrond-screenshot (kopen.repp.nl/depaveri Plattegrond-tab)
> - Brochure: https://repp.nl/wp-content/uploads/2026/05/Brochure-De-Paveri-Assendelft-V2.pdf
> - Prijslijst: https://repp.nl/wp-content/uploads/2026/05/Prijslijst-De-Paveri-Assendelft-v2.pdf
>
> Status per veld:
> - ✅ uit bronnen gehaald, hoge zekerheid
> - ⚠️ placeholder / mijn beste gok, jij bevestigen
> - ❓ niet uit bronnen te halen, jij invullen

---

## A. Project-identiteit

| Veld | Waarde | Status |
|---|---|---|
| Project naam | **De Paveri** | ✅ |
| Slug | **depaveri** (vanwege bestaande URL `/depaveri`) | ✅ |
| Adres + plaats | **Industrieweg 9, Assendelft** | ✅ |
| Buurt / bedrijventerrein | **Bedrijventerrein Assendelft Noord, Zaanstreek** | ✅ |
| Tagline — één regel | ⚠️ "Ondernemen in de Zaanstreek." | ⚠️ — niet expliciet in docs, mijn voorstel |
| Korte omschrijving | **16 casco bedrijfsunits aan de Industrieweg 9 in Assendelft.** | ✅ |
| Sales-type | **koop** | ✅ |
| Unit-typologie | **nieuwbouw bedrijfsunits, casco oplevering** | ✅ |
| **Portal-strategie** | **kopen-repp-redirect** | ✅ |
| **Portal-URL** | **https://kopen.repp.nl/depaveri** | ✅ |

---

## B. Units + plattegrond

### B.1 Algemene unit-info
| Veld | Waarde | Status |
|---|---|---|
| Totaal aantal units (Fase 2) | **16** | ✅ |
| Aantal lagen | **2 (Type C, D) of 3 (Type A, B)** — varieert | ✅ |
| Unit-types | **A, B, C, D** | ✅ |

Disclaimer uit knowledge base: totaalplan = 36 units over 2 gebouwen, Fase 2 = 16 units in Gebouw A. Voor lead-communicatie alleen Fase 2 noemen tenzij gevraagd.

### B.2 Per type — afmetingen + prijs
| Type | m² BG | m² 1e | m² 2e | m² totaal | Lagen | Parkeer | Vanaf-prijs excl. btw | €/m² | 1e VVE bijdrage |
|---|---|---|---|---|---|---|---|---|---|
| **A** | 77 | 77 | 54 | 208 | 3 | 3 | €360.000 (verkocht) | €1.731 | €1.393 |
| **B** | 78 | 78 | 54 | 208 | 3 | 3 | €349.000 (verkocht) | €1.678 | €1.393 |
| **C** | 89 | 89 | — | 178 | 2 | 2 | **€305.000** | €1.713 | €1.192 |
| **D** | 56 | 56 | — | 112 | 2 | 2 | **€199.950** | €1.785 | €750 |

Type A en B hebben dakterras (resp. ~19,73 m² en ~22,97 m²).

### B.3 Plattegrond-grid (situatietekening uit screenshot)
Layout: top-rij met 5 Type C units (8, 7, 6, 5, 4 v.l.n.r.) + rechterkolom met 3 stacked units (1=A, 2=B, 3=A). Bottom-rij met 8 Type D units (9 t/m 16 v.l.n.r.).

Voorgesteld als 2 rijen voor `sitePlan.rows`:
```
Rij 1: 8 (C) | 7 (C) | 6 (C) | 5 (C) | 4 (C) | 1 (A) | 2 (B) | 3 (A)
Rij 2: 9 (D) | 10 (D) | 11 (D) | 12 (D) | 13 (D) | 14 (D) | 15 (D) | 16 (D)
```

(Visueel niet 1:1 zoals screenshot — rechterkolom 1/2/3 staat in code als deel van rij 1. Voor exacte L-vorm-rendering eventueel later `SitePlanBubble.jsx` aanpassen.)

### B.4 Status per unit (actueel — uit screenshot)
| Nr | Type | Status |
|---|---|---|
| 1 | A | sold |
| 2 | B | sold |
| 3 | A | sold |
| 4 | C | sold |
| 5 | C | **available** |
| 6 | C | **available** |
| 7 | C | **available** |
| 8 | C | **available** |
| 9 | D | sold |
| 10 | D | sold_ov |
| 11 | D | sold |
| 12 | D | sold |
| 13 | D | sold_ov |
| 14 | D | sold |
| 15 | D | sold |
| 16 | D | sold |

**Samenvatting**: 4 beschikbaar (allemaal Type C), 2 verkocht o.v., 10 verkocht. Sold percent = 75%.

### B.5 Praktische features (uit technische omschrijving)
- Overheaddeur: handbediend standaard, elektrisch optioneel
  - Type A, B, C: 4,00 m × 3,50 m
  - Type D: 3,00 m × 3,50 m
- Eigen parkeerplaats: 2 (C, D) of 3 (A, B) direct voor de deur
- Elektra: 3 × 25A op basis van 230V (standaard), krachtstroom optioneel
- Vrije hoogte BG: 3,65 m
- Vrije hoogte 1e: ~2,60-2,65 m
- Vrije hoogte 2e (alleen A, B): ~2,55 m
- Vloerbelasting BG: 1.500 kg/m²
- Vloerbelasting verdiepingen: 250 kg/m²
- Separate loopdeur met inbraakwerend SKG**-hang/sluitwerk
- Houten trap, betonnen verdiepingsvloer
- Gasloze uitvoering
- Eigen meterkast, riool, water-aansluiting
- Units koppelbaar in overleg (geen garantie)

---

## C. Pricing & financieel

| Veld | Waarde | Status |
|---|---|---|
| Vanaf-prijs excl. btw | **€199.950** (Type D) | ✅ |
| Hoogste prijs excl. btw beschikbaar | **€305.000** (Type C) | ✅ |
| Prijs per m² gemiddeld | **~€1.730** | ✅ |
| Eerste VVE bijdrage | €750-€1.393 afhankelijk van type | ✅ |
| Maandelijkse VVE-lasten | indicatief €75-€125 | ✅ |
| Btw-handling | **standaard 21%** (in veel zakelijke situaties terugvorderbaar) | ✅ |
| Vrij op naam (VON) | **ja** (grond, bouw, notaris, kadasterkosten inbegrepen) | ✅ |
| Aansluitkosten inbegrepen | water + 3×25A elektra, tot €2.850 excl. btw | ✅ |
| Bedrijfsgebonden woning | **nvt** (geen bewoning toegestaan) | ✅ |
| Korting / onderhandeling | normaal gesproken niet | ✅ |

### Beleggings-info
| Veld | Waarde | Status |
|---|---|---|
| Bruto aanvangsrendement (BAR) min/max | ❓ — niet in docs vermeld | ❓ |
| Markthuur €/m²/jaar voor Assendelft | ❓ — niet in docs vermeld | ❓ |
| Vergelijkingsgebied | Bedrijventerrein Assendelft Noord | ✅ |
| Financieringspartner | **Company & Living Finance** | ✅ |
| Standaard financiering tot | 75%, maatwerk soms 100% (niet gegarandeerd) | ✅ |

---

## D. Persona-set
- [x] **eigen_gebruiker** — MKB-ondernemer (kernkopgroep)
- [x] **belegger** — kopen voor verhuur
- [x] **beide** — combinatie
- [ ] huurder — primair koopproject, alleen via eigenaar mogelijk

---

## E. Marketing-content

### E.1 USPs (uit knowledge base)
1. **Hoogwaardige nieuwbouw bedrijfsunits** met casco oplevering, eigen meterkast, riool, 3×25A elektra
2. **Strategische ligging** in de Zaanstreek met N8 en N203 binnen handbereik
3. **Multifunctioneel** — geschikt voor opslag, werkplaats, showroom, kantoor of combinatie
4. **2-3 eigen parkeerplaatsen** direct voor de deur per unit
5. **Gasloze uitvoering** + units in overleg koppelbaar

### E.2 FAQ (uit knowledge base, selectie van 10)
| Vraag | Antwoord |
|---|---|
| Wat is De Paveri? | Nieuwbouwproject met 16 casco bedrijfsunits aan de Industrieweg 9 in Assendelft. Units van 112 m², 178 m² en 208 m². |
| Wat kost een unit? | Type D €199.950 excl. btw, Type C €305.000 excl. btw. Beschikbaarheid altijd checken via de koopomgeving. |
| Zijn de prijzen inclusief btw? | Nee, exclusief 21% btw. In veel zakelijke situaties terugvorderbaar. |
| Wat betekent v.o.n.? | Vrij op naam — grond, bouw, notaris en kadasterkosten zijn inbegrepen. Btw en meerwerk niet automatisch. |
| Wat wordt standaard opgeleverd? | Casco met meterkast, 3×25A elektra, rioolaansluiting, handbediende overheaddeur, loopdeur, betonnen verdiepingsvloer, houten trap, eigen parkeerplaatsen. |
| Is er gas? | Nee, de units worden gasloos uitgevoerd. |
| Kan ik units koppelen? | In overleg mogelijk, afhankelijk van technische mogelijkheden en bouwfase. |
| Kan ik financieren? | Via Company & Living Finance. Standaard tot 75%, maatwerk soms 100%. Afhankelijk van persoonlijke situatie. |
| Wanneer wordt opgeleverd? | Bouw is gestart, omgevingsvergunning afgegeven. Exacte oplevering hangt af van bouwvoortgang en koopovereenkomst. |
| Mag ik horeca / autobedrijf starten? | Niet standaard toegestaan. Moet altijd worden getoetst bij gemeente, VvE en projectorganisatie. |

### E.3 Locatie-story
```
De Paveri ligt op bedrijventerrein Assendelft Noord, centraal in de Zaanstreek.
Via N8 en N203 zijn Zaandam, Alkmaar en Amsterdam goed bereikbaar.
NS Station Krommenie-Assendelft ligt op circa 5 minuten fietsen.
```
✅ Uit knowledge base.

### E.4 Locatie-benchmarks
| Naar | Reistijd | Vervoersmiddel |
|---|---|---|
| N8 / N203 | "nabij" | auto | ✅ |
| Krommenie-Assendelft NS | 5 min | fiets | ✅ |
| Zaandam | ❓ | auto | ⚠️ — niet expliciet, ~10 min schat |
| Alkmaar | ❓ | auto | ⚠️ |
| Amsterdam | ❓ | auto | ⚠️ |
| Haarlem | ❓ | auto | ⚠️ |

❓ Concrete reistijden moeten gemeten / aangevuld.

### E.5 Omgeving-highlights
| Icoon | Tekst |
|---|---|
| business | Bedrijventerrein Assendelft Noord, op een historische locatie waar vroeger de papierindustrie actief was |
| train | NS Station Krommenie-Assendelft op ~5 minuten fietsen |
| parking | 2 of 3 eigen parkeerplaatsen per unit, direct voor de deur |
| ⚠️ | ❓ extra highlights ontbreken — geen info over lunch, water, woonbuurten |

### E.6 Process / planning
| Mijlpaal | Status |
|---|---|
| Omgevingsvergunning | **afgegeven** ✅ |
| Bouw start | **gestart** ✅ |
| Oplevering | ❓ — niet expliciet datum, "afhankelijk van bouwvoortgang en koopovereenkomst" |
| Fasering | Fase 2 = 16 units in Gebouw A, totaal 36 units over 2 gebouwen ✅ |

### E.7 Scarcity-claim
```
⚠️ Geen expliciete scarcity-claim in de knowledge base.
Mijn voorstel: "Beperkt aanbod nieuwbouw bedrijfsunits in de Zaanstreek.
Van de 16 units in Fase 2 zijn er nog enkele Type C beschikbaar."
```
⚠️ — bevestigen

---

## F. Documenten + assets

### F.1 Beelden
| Asset | Status |
|---|---|
| Hero image | ❓ — niet meegestuurd, beschikbaar in brochure-PDF (kan ik er uithalen?) |
| Logo (svg) | ❓ — niet meegestuurd |
| Exterieur shot | ❓ — beschikbaar in brochure |
| Gallery (6+ impressies) | ❓ — beschikbaar in brochure |
| Bereikbaarheid-video | ❓ — niet beschikbaar |

### F.2 PDFs
- ✅ Brochure: https://repp.nl/wp-content/uploads/2026/05/Brochure-De-Paveri-Assendelft-V2.pdf
- ✅ Prijslijst: https://repp.nl/wp-content/uploads/2026/05/Prijslijst-De-Paveri-Assendelft-v2.pdf

Voorstel: deze 2 PDFs downloaden + in `public/projects/depaveri/` zetten (anders hosting bij repp.nl, prima maar minder controle).

### F.3 Brand
- Primary: standaard REPP-midnight ✅
- Accent: standaard REPP-neon ✅
- Custom font: nee, standaard Montserrat ✅

---

## G. Mensen (sales team)

❓ **Geen info in knowledge base over specifieke sales-contactpersoon.**

Verplicht in te vullen:
- Sales naam: ❓
- Functie / titel: ❓
- Telefoon: ❓
- WhatsApp: ❓
- E-mail: ❓
- Foto: ❓

Voor handoff in CLP en WhatsApp-prefill cruciaal.

### Beleggings-specialist (optioneel — persona 'belegger' geselecteerd)
❓ — wie is dat?

---

## H. Externe accounts

- [✅] Domein: **depaveri.clp.repp.nl** (via REPP-DNS)
- [✅] Brevo: REPP-account hergebruiken, nieuwe DEPAVERI lijst aanmaken (geen portal-code, alleen brochure)
- [⚠️] Meta Pixel: bestaande REPP-pixel hergebruiken — bevestigen?
- [⚠️] Plausible: bestaande REPP-account, subdomein depaveri.clp.repp.nl toevoegen — bevestigen?
- [✅] GitHub + Vercel: REPP-team
- [⚠️] Slack: nieuw kanaal `#hot-leads-depaveri` of bestaand kanaal? ❓

---

## I. Backend routing

- CLP source key: `clp_depaveri` ✅
- Hostname: `depaveri.clp.repp.nl` ✅
- project-veld in Supabase: `clp_depaveri` ✅
- Evolution WhatsApp instance: `repp` (gedeeld, default) ✅
- CRM project label: **De Paveri** (Tharwat)

---

## J. Optionele features

- [x] Mortgage calculator (koop-project)
- [x] Rentability calculator (persona belegger geselecteerd)
- [ ] Walk-in portal site — niet nodig (kopen-repp-redirect)
- [ ] iDeal aanbetaling — niet voor nu
- [ ] AI Q&A na lead-capture — niet voor nu

---

## K. Speciale aandachtspunten voor Paveri (afwijkend van De Hofman)

### K.1 Chat-flow size-vraag aanpassen
De Hofman gebruikt categorieën "tot 50 m² BG / rond 100 m² / meer dan 100 m²".

**Paveri moet gebruiken**: "Hoeveel m² zoek je? Opties: **112 m², 178 m², 208 m², weet ik nog niet**"

Vereist customisatie in `src/data/flow.js` per project. Vandaag is `flow.js` gedeeld over alle projecten. Twee opties:
- **A** — flow.js refactoren naar per-project flow (kleine refactor in core)
- **B** — flow.js sluiten op `project.flowOverrides.sizeOptions` veld, zodat we per-project chip-tekst kunnen instellen

Voorstel: **B** (kleinere change, project.js krijgt extra veld).

### K.2 BAR / markthuur voor Assendelft
Voor `RentabilityCalc` component die De Hofman heeft, hebben we BAR-range en markthuur-range nodig. Niet in de docs. Suggestie: óf weglaten voor Paveri, óf jij geeft mij de getallen voor Assendelft (€/m²/jaar markthuur).

### K.3 Locatie-context: papierindustrie-erfgoed
Knowledge base benoemt expliciet: "historische locatie waar vroeger de papierindustrie actief was, brochure positioneert project als plek waar historie en modern ondernemerschap samenkomen". Mooi narrative-element — wil je dat in de USP-cards of locatie-story verwerkt?

---

## SAMENVATTING — wat MIST nog vóór we paveri.js kunnen bouwen

### ❓ Verplicht (build-blockers)
1. **Sales-team contactgegevens** (naam, foto, telefoon, WhatsApp, e-mail) — voor CtaBubble + WhatsApp-prefill
2. **Assets**: hero image, logo, gallery (minimaal 4), exterieur — anders alleen brochure-image fallback
3. **Tagline** — mijn voorstel is "Ondernemen in de Zaanstreek." — jouw goedkeuring?

### ⚠️ Aanbevolen (anders feature minder rijk)
4. **Locatie-benchmarks reistijden** naar Zaandam, Alkmaar, Amsterdam, Haarlem (kan via Google Maps schatten)
5. **Beleggings-info**: BAR-range + markthuur €/m²/jaar voor Assendelft (anders RentabilityCalc weglaten)
6. **Brochure + prijslijst PDF**: lokaal opslaan of remote linken? (`public/projects/depaveri/` of repp.nl URL)
7. **Slack channel-naam** + webhook
8. **Brevo list ID** (volgt na aanmaken)
9. **Beleggings-specialist contact** (als verschillend van sales)
10. **Scarcity-claim** — bevestig of pas aan

### 💡 Beslissingen
11. **Flow-aanpassing voor size-vraag**: optie A (refactor) of B (project.flowOverrides veld)?
12. **Plattegrond-rendering**: simpele 2-rij benadering van wat ik beschreef bij B.3, of moet ik later SitePlanBubble customizen voor L-vorm?
13. **Papierindustrie-narrative**: meenemen in USP of locatie?

### 📝 Optioneel info-aanvullen
14. **Logo SVG** in REPP-stijl met "De Paveri"-tekst
15. **Bereikbaarheid-video** (kan later)
16. **Optielijst-prijzen** voor MortgageCalc / informatieve bubble (heel veel detail in knowledge base, kunnen we benutten of negeren)

---

## Wat ik volgende stap zou doen

1. Jij stuurt antwoorden op de 16 punten hierboven
2. Ik genereer `src/data/projects/depaveri.js` met alles gevuld
3. Voeg toe aan `src/data/project.js` loader-map
4. Maak `public/projects/depaveri/` met de assets
5. Smoke-test lokaal via `VITE_PROJECT_OVERRIDE=depaveri.clp.repp.nl npm run dev`
6. PR
7. Genereer `EXTERNAL_SETUP_CHECKLIST_DEPAVERI.md` voor de externe stappen

Of kortere route — als je 3 verplichte items (sales-team, assets, tagline) kunt aanleveren begin ik direct met paveri.js bouwen, de rest vullen we al-doende aan.
