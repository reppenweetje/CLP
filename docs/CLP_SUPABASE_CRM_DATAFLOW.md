# CLP naar Supabase naar CRM: dataflow-handboek

Hoe lead-data van een CLP naar Supabase gaat en hoe zowel Supabase als het CRM
het goed verwerkt. Lees dit voordat je een nieuw veld toevoegt of een nieuwe
CLP opzet, zodat de data gegarandeerd goed in het CRM landt en de UI schoon
blijft.

## De route in een oogopslag

```
CLP  pushSnapshot()            src/App.jsx
  ->  pushLead()               src/lib/api.js        (source = project.crmProject)
  ->  edge functie lead-upsert supabase/functions/lead-upsert/index.ts
  ->  tabel  public.leads      (project vgdwgjthvltucabqfysd)

CRM  leest de leads-tabel:
  -  vaste kolommen            crm/src/lib/leads-data.ts   (vaste SELECT)
  -  attributes JSON           crm/src/lib/signup.ts       (readSignup, sectie "Aanmeldgegevens")
  -  attributes.attribution    crm/src/lib/attribution.ts  (marketing-herkomst)
```

Analytics-events (CLP-reis, admin-dashboard) lopen apart via
`clp-events-upsert` naar het analytics-project. Dat staat los van dit handboek.

## Twee bestemmingen in de leads-tabel

### 1. Vaste kolommen

Een top-level veld in de payload landt alleen in een eigen kolom als het in de
`optional`-whitelist van de edge functie staat
(`supabase/functions/lead-upsert/index.ts`):

```
altijd:   session_id, source, project (= source), last_event_at
optional: email, first_name, phone, persona, intent_id, size_id, timeline_id,
          temperature, score, stage, status, cta_variant, followup,
          afhaak_reason, handoff_shown, handoff_outcome, handoff_temperature,
          handoff_persona, started_at, completed_at,
          privacy_statement_version, attributes
```

Stuur je een top-level veld dat hier NIET in staat, dan wordt het stil
genegeerd (geen error, maar ook niet opgeslagen).

De CRM-tabel heeft daarnaast kolommen die de CLP nu niet vult
(`company_name`, `wants_financing`, `is_investor`, `is_end_user`,
`wants_to_rent`, `kvk_number`, ...). Die worden gezet via CRM-acties. Wil je
ze vanuit de CLP vullen, dan is dat de "nieuwe kolom"-route hieronder.

### 2. De attributes JSON

Alles zonder eigen kolom zet je binnen het `attributes`-object. Dat is een
passthrough: het landt exact zoals je het stuurt. Dit is de plek voor
survey-antwoorden en projectspecifieke velden.

## Regels zodat Supabase het goed ontvangt

- Verplicht: `session_id` (>= 8 tekens) en `source` (= `project.crmProject`,
  wordt ook `project`).
- Geen null-overschrijving: de functie schrijft alleen velden die je
  meestuurt (`undefined` slaat 'ie over). Een halverwege-snapshot wist dus
  geen bestaande waardes.
- CORS: het subdomein van de tenant moet in `DEFAULT_ALLOWED` staan in de
  edge functie, anders blokkeert de browser de POST.
- Nieuwe eigen kolom toevoegen = 3 stappen:
  1. Kolom aanmaken in de `leads`-tabel (migration).
  2. Veldnaam toevoegen aan de `optional`-array in `lead-upsert/index.ts`.
  3. Edge functie redeployen (alle CLP's delen deze functie, dus reproduceer
     de live-versie en voeg alleen je veld toe).

## Regels zodat het CRM het goed leest

Het CRM toont `attributes` in de sectie "Aanmeldgegevens" via `readSignup()`
(`crm/src/lib/signup.ts`). Daar gelden harde regels:

| Regel | Gevolg |
|---|---|
| Alleen scalars (string/number) worden getoond | Arrays en objecten worden overgeslagen |
| Sleutels in de SKIP-set worden overgeslagen | zie hieronder |
| Lege/null-waardes vallen weg | stuur geen lege strings |
| Label = LABELS-map, anders auto-format van de sleutel: `_`/`-` wordt spatie, eerste letter hoofdletter | gebruik snake_case, geen camelCase |

Gevolg voor de sleutelnaam:

- `interesse_locaties: "Haarlem"` toont als "Interesse locaties: Haarlem". Goed.
- `waarInBreda: "..."` zou tonen als "WaarInBreda". Fout. Daarom hernoemd naar
  `voorkeurlocatie`.

De SKIP-set (`signup.ts`) verbergt velden die elders zichtbaar zijn of puur
technisch/intern zijn:

```
attribution   eigen marketing-herkomst-lezer
project       al in de header
fb_event_id   Meta Pixel/CAPI-deduplicatie-id, niet sales-relevant
grondM2       dormant CLP-veld
```

Voor sommige sleutels bestaat een leesbaar label of een waarde-mapping in
`signup.ts` (bijvoorbeeld `company` -> "Bedrijfsnaam", `leadVariant` ->
"Aanvraagtype" met `bouwgrond` -> "Bouwkavel").

## Praktische beslisregels

1. Wil je het gewoon zien in het CRM? Scalar (string/number) met snake_case
   sleutel in `attributes`. Verschijnt automatisch met net label. Geen
   CRM-wijziging nodig.
2. Is je waarde een lijst of object? Het landt in Supabase, maar niet in het
   CRM. Stuur er een leesbare string-versie naast mee (zoals
   `interesse_locaties` naast de array `interestLocations`).
3. Is je veld technisch/intern (id's, routing-slugs, dedup-tokens)? Voeg de
   sleutel toe aan de SKIP-set in `crm/src/lib/signup.ts`, anders vervuilt het
   de sales-UI. Dit is het belangrijkste aandachtspunt bij nieuwe velden.
4. Moet het CRM erop filteren, of het financieringsbord/pipeline voeden? Dan
   een eigen kolom (3-stappen edge-functie-route hierboven).
5. Marketing-herkomst? Altijd als object onder `attributes.attribution`
   (utm/fbclid). Heeft een eigen lezer in het CRM.
6. Kernvelden (doel/afmeting/wanneer/persona) gaan top-level als
   `intent_id`/`size_id`/`timeline_id`/`persona` (bestaande kolommen). Bij de
   peiling mappen we survey-keys op deze kolommen via een `??`-fallthrough in
   `pushSnapshot`, zodat de sales-tenants ongemoeid blijven.

## Recept: nieuw survey-veld toevoegen (meest voorkomend)

1. In `pushSnapshot()` (`src/App.jsx`), binnen het `attributes`-object, gated
   op aanwezigheid en met een snake_case sleutel:
   ```js
   ...(state.answers.X ? { veld_naam: state.answers.X.label } : {}),
   ```
2. Is de waarde een array? Stuur er ook een leesbare string-versie naast mee.
3. Is het veld technisch? Zet de sleutel in de SKIP-set van
   `crm/src/lib/signup.ts` en push die repo.

Dat is alles. Sales-velden verschijnen automatisch netjes in Aanmeldgegevens.

## Checklist bij een nieuwe CLP

- [ ] `source` = `project.crmProject` en die waarde is als project in Supabase
      bekend.
- [ ] Subdomein toegevoegd aan `DEFAULT_ALLOWED` in de edge functie (CORS).
- [ ] Survey-/projectvelden staan als scalars met snake_case sleutels in
      `pushSnapshot.attributes`.
- [ ] Array-antwoorden hebben een leesbare string-variant.
- [ ] Technische velden staan in de CRM SKIP-set.
- [ ] Test-lead gedaan en de rij in het CRM gecontroleerd: alles ontvangen en
      schoon in de UI.
- [ ] Tenant heeft een eigen genamespacete state-key (automatisch via
      `clp-state-v7-<project.id>`) zodat tenants elkaar niet vervuilen.

## Belangrijke bestanden

| Wat | Bestand |
|---|---|
| Payload bouwen | `src/App.jsx` (`pushSnapshot`) |
| Verzenden + source-tag | `src/lib/api.js` |
| Edge functie (write-path) | `supabase/functions/lead-upsert/index.ts` |
| CRM: vaste kolommen | `crm/src/lib/leads-data.ts` |
| CRM: Aanmeldgegevens-weergave | `crm/src/lib/signup.ts` |
| CRM: marketing-herkomst | `crm/src/lib/attribution.ts` |
