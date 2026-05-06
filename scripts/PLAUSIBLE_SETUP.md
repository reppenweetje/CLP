# Plausible setup voor REPP CLP

Een-pagina handleiding voor de eenmalige setup van Goals + Funnels +
Custom Segments in Plausible Pro. Goals zet het script automatisch op,
Funnels en Segments moeten handmatig in de UI omdat de Plausible-API
die nog niet ondersteunt.

## 1. Goals automatisch aanmaken (eenmalig, ~30 sec)

### Stap 1a — API key

1. Open https://plausible.io/settings/api-keys (Pro plan)
2. **+ New API Key**
3. Geef 'm een naam (bv. `repp-clp-setup`)
4. Vink scopes aan:
   - `sites:provision:goals:write`
   - `sites:provision:goals:read`
5. Kopieer de key (verschijnt maar één keer)

### Stap 1b — Lokaal env-file

```bash
cp .env.plausible.local.example .env.plausible.local
# Open .env.plausible.local en plak je API key + site_id
```

`.env.plausible.local` staat op `*.local` in `.gitignore` dus komt nooit per ongeluk in git.

### Stap 1c — Run

```bash
npm run setup:plausible
```

Wat je ziet:
```
Plausible goals setup
  site:     clp.repp.nl
  goals:    26 totaal
  bestaand: 0 goals al op site

  ✓ intro:cta-clicked
  ✓ intent:answered
  ✓ brochure-trigger:answered
  ...
— Klaar —
  26 nieuw aangemaakt
  0 bestond al
  0 mislukt
```

Idempotent — re-run is veilig (skipt wat er al is).

### Optionele flags

| Flag | Effect |
|---|---|
| `npm run setup:plausible -- --dry-run` | Toon wat het zou doen, geen API-calls |
| `npm run setup:plausible -- --list` | Toon alle bestaande goals op de site |

## 2. Funnels handmatig configureren (UI, ~5 min)

Plausible API ondersteunt geen funnel-creatie. In de UI:

`Plausible dashboard → Funnels → + Add a funnel`

### Funnel A — Main conversion (de belangrijkste)

| # | Goal |
|---|---|
| 1 | `intro:cta-clicked` |
| 2 | `intent:answered` |
| 3 | `brochure-trigger:answered` |
| 4 | `lead-email:submitted` |
| 5 | `lead-name:submitted` |
| 6 | `lead-phone:submitted` |
| 7 | `flow:complete` |

Naam: **Main funnel — bezoek tot voltooid**

### Funnel B — Engagement signalen

| # | Goal |
|---|---|
| 1 | `intent:answered` |
| 2 | `unit:detail-opened` |
| 3 | `calc:rentability-interaction` |
| 4 | `flow:complete` |

Naam: **Engagement — wie verdiept zich?**

### Funnel C — Warm handoff conversie

| # | Goal |
|---|---|
| 1 | `warm-handoff:shown` |
| 2 | `warm-handoff:callback` (of `warm-handoff:whatsapp` of `warm-handoff:phone`) |

Naam: **Warm handoff — accepted vs dismissed**

Tip: maak twee varianten — eentje die alleen `warm-handoff:callback`
telt en eentje voor `warm-handoff:whatsapp` — dan zie je per channel
de conversie.

## 3. Custom segments (saved filters) — UI

Vanuit het dashboard kun je filters opslaan als segment. Aanbevolen
shortlist:

| Segment | Filter |
|---|---|
| **Beleggers** | event prop `persona = belegger` |
| **Eigen gebruikers** | event prop `persona = eigen_gebruiker` |
| **Snelle koper** | event prop `timeline = zsm` of `timeline = 3mnd` |
| **Hot leads** | event prop `temperature = hot` |
| **Variant A / B** | event prop `cta_variant = a` / `b` (zodra je A/B test) |

Met deze segments kun je elke Funnel + elk Goal slicen op persona /
timeline / variant. Bijvoorbeeld: "main funnel-conversie alleen voor
beleggers" of "afhaak-redenen per timeline".

## 4. Aanbevolen dashboard-views

Onder Plausible Pro → Custom dashboards (of bookmark URLs):

1. **Hot leads vandaag** — segment "Hot leads", periode "vandaag",
   widget "Goal conversions"
2. **Funnel-overview** — Main funnel, periode "deze maand", split per
   `persona`
3. **Drop-off-detail** — Goal `afhaak-reason:answered`, breakdown op
   `reason` event property

## 5. Verifieren dat alles werkt

In Plausible: `Site Settings → General → Goals` — moet 26 events
tonen. Gebeurt er nog niets in "Realtime" tab? Open de site, doorloop
de chat, en de events horen binnen ~5 sec te verschijnen onder
`Realtime` met je custom event-namen.

Als events NIET verschijnen:
- Adblocker actief? Plausible.io is niet op default lijsten maar als je `script.tagged-events.js` hardcoded hebt, kun je ook proxy via `https://repp.nl/js/script.js` gebruiken. Niet nu nodig.
- Domain mismatch? Check dat `pa-35jm-s2ndmvndK0WIw3UD.js` is gekoppeld aan dezelfde site_id als waar je Goals naartoe schrijft.

## Rollback / cleanup

API key intrekken:
1. https://plausible.io/settings/api-keys → Revoke
2. `rm .env.plausible.local`

Goals weghalen (als je iets anders wilt): UI → Site Settings → Goals → delete one-by-one. Of via API met `DELETE /api/v1/sites/goals/:id`.
