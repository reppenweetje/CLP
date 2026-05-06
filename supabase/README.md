# Supabase backend — REPP CLP

Brief voor **Tharwat**. Status op 2026-05-06: voorbereid, nog niet uitgerold.

## Wat dit is

Backend voor de Conversational Landing Page (CLP). Eerste klant: De Hofman, live op `dehofman.clp.repp.nl`. Toekomstige CLP's draaien op `<project>.clp.repp.nl` op dezelfde Supabase.

Lead-data wordt nu nog alleen in `localStorage` van de bezoeker bewaard. We willen 'm real-time naar de bestaande Supabase wegschrijven, **naast** de WhatsApp-bot leads die er al staan (391 stuks per 2026-05-06).

## Hard-geldende regels

- ❌ Geen bestaande data muteren of verwijderen
- ❌ Geen tabellen droppen of hernoemen
- ❌ Geen bestaande kolommen wijzigen
- ❌ Geen WhatsApp-bot infrastructuur raken
- ❌ Service-role-key NOOIT in frontend
- ✅ Alleen toevoegen: nullable kolommen + één nieuwe tabel
- ✅ Alle DDL als reviewbare `.sql` files
- ✅ Pre-flight + post-flight count-check op `leads`

## Wat we van jou nodig hebben

Stuur deze drie naar Jann (1Password / Bitwarden / signed message — niet via Slack/mail in clear text):

1. **Supabase project URL** — `https://xxx.supabase.co`
2. **Service-role-key** — graag een **nieuwe** specifiek voor CLP, zodat we los kunnen rouleren
3. **Anon-key** (de publieke)

## Mappenstructuur

```
supabase/
├── README.md                                    ← dit bestand
├── migrations/
│   ├── 20260506120000_extend_leads.sql          ← stap 1
│   └── 20260506120100_create_consent_log.sql    ← stap 2
├── policies/
│   └── recommended_rls.sql                      ← stap 3, REVIEW eerst
├── rollback/
│   └── rollback_all.sql                         ← noodgrip
└── functions/
    └── lead-upsert/
        ├── index.ts                             ← Edge Function
        ├── slack.ts                             ← HOTLEADS notifier
        └── deno.json
```

## Migratie-runbook (in volgorde)

### 0. Pre-flight (verplicht)

```sql
-- Backup gemaakt? Dump op z'n minst de leads-tabel:
-- pg_dump --table=public.leads <DB> > leads-pre-clp-2026-05-06.sql

-- Bestaande kolommen op leads — controleer of er geen naam-collisie is:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='leads'
ORDER BY ordinal_position;

-- Lead-count vóór:
SELECT count(*) AS leads_before FROM public.leads;
-- Verwacht: 391. Noteer het exacte getal.
```

Als één van de nieuwe kolomnamen al bestaat met een ander type → **stop** en ping Jann. We bedenken dan samen een prefix (bijv. `clp_`) of overslaan-strategie.

### 1. `20260506120000_extend_leads.sql`

Voegt nullable kolommen toe aan `public.leads` + een partial unique index op `(source, session_id)` voor idempotente upsert. Bestaande rijen worden niet aangeraakt.

```bash
psql "$DATABASE_URL" -f migrations/20260506120000_extend_leads.sql
```

### 2. `20260506120100_create_consent_log.sql`

Maakt nieuwe append-only tabel `public.consent_log` voor AVG art. 7 audit. Geen FK op `leads` (zachte referentie via `lead_id uuid`) omdat we het type van `leads.id` niet zeker weten — als `leads.id` ook uuid is mag je achteraf de FK toevoegen, het commentaar in het bestand legt dat uit.

```bash
psql "$DATABASE_URL" -f migrations/20260506120100_create_consent_log.sql
```

### 3. `policies/recommended_rls.sql` — REVIEW EERST

⚠️ Lees de header van dit bestand. Het schakelt RLS in op `public.leads` en blokkeert alle anon-access. **Aanname**: de WhatsApp-bot schrijft via de service-role-key, niet via anon. Verifieer dat eerst — zoek in de bot-code naar `SUPABASE_SERVICE_ROLE_KEY` vs `SUPABASE_ANON_KEY`.

Als de aanname klopt:

```bash
psql "$DATABASE_URL" -f policies/recommended_rls.sql
```

Als de WhatsApp-bot anon gebruikt → niet draaien, ping Jann, dan maken we een policy-shape die naast de bot kan leven.

### 4. Post-flight (verplicht)

```sql
-- Lead-count ná moet exact gelijk zijn aan vóór:
SELECT count(*) AS leads_after FROM public.leads;

-- Nieuwe kolommen aanwezig?
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name='leads'
  AND column_name IN ('session_id','source','persona','attributes','last_event_at')
ORDER BY column_name;

-- consent_log bestaat?
SELECT to_regclass('public.consent_log') AS consent_log_exists;

-- WhatsApp-bot smoke-test: stuur 1 echt testbericht naar de bot en check
-- of die nog steeds een lead schrijft. Geen schrijven via de bot = bug bij ons.
```

### 5. Rollback (alleen als 't echt mis gaat)

```bash
psql "$DATABASE_URL" -f rollback/rollback_all.sql
```

Zie het commentaar in `rollback_all.sql` voor de pre-rollback CSV-export-tip.

## Edge Function deployment

### Eenmalig

```bash
# In de CLP-repo root:
supabase login
supabase link --project-ref <project-ref>      # uit de Supabase URL
```

### Secrets zetten

```bash
supabase secrets set SLACK_HOTLEADS_WEBHOOK_URL='https://hooks.slack.com/...' \
                     ALLOWED_ORIGINS='https://dehofman.clp.repp.nl,https://clp-xi-tan.vercel.app,http://localhost:5173'

# SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY krijgt de Edge Function automatisch.
```

### Deploy

```bash
supabase functions deploy lead-upsert
```

### Smoke-test

```bash
curl -X POST 'https://<project>.supabase.co/functions/v1/lead-upsert' \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "smoke-test-0001-aaaa",
    "source": "clp_smoketest",
    "first_name": "Smoke",
    "email": "smoke@example.com",
    "persona": "belegger",
    "temperature": "warm",
    "score": 42,
    "stage": "orienterend",
    "consents": [
      { "scope": "brochure-en-opvolging", "granted": true,
        "privacy_statement_version": "2026-05-06" }
    ]
  }'
```

Verwacht: `{"ok":true,"lead_id":"...","consents_inserted":1}`. Daarna de testlead opruimen:

```sql
DELETE FROM public.consent_log WHERE source = 'clp_smoketest';
DELETE FROM public.leads        WHERE source = 'clp_smoketest';
```

## Frontend wiring

Frontend code staat klaar in `src/lib/api.js` (zie de wiring-instructie bovenin dat bestand). Wordt nog **niet** geïmporteerd — geen breaking change voor de huidige demo. Wij doen de wiring in App.jsx zodra de Edge Function draait.

Vercel env-vars die we toevoegen op de CLP project (Production + Preview):

```
VITE_SUPABASE_URL          = https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY     = eyJ...
VITE_LEAD_UPSERT_PATH      = /functions/v1/lead-upsert    # default
VITE_CLP_SOURCE            = clp_dehofman                  # per project
```

## Vragen / contact

Jann — direct in WhatsApp.

## Wijzigingsgeschiedenis

| Datum       | Wat                                            |
|-------------|------------------------------------------------|
| 2026-05-06  | Initial — migrations + Edge Function prepared. |
