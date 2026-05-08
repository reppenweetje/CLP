# Supabase backend, REPP CLP

Briefing for **Tharwat** plus rollout-historie. Status as of 2026-05-08: **Phase 2 live**. Pipeline produceert lead-rijen vanuit `dehofman.clp.repp.nl` naar Supabase plus Brevo via de `lead-upsert` Edge Function. RLS bewust nog niet geactiveerd, dat is Phase 3.

## Status snapshot (2026-05-08)

- ✅ Project URL: `https://vgdwgjthvltucabqfysd.supabase.co`
- ✅ Anon key + URL in Vercel env (Production en Preview)
- ✅ Frontend client (`src/lib/api.js`) wired in `App.jsx` op alle flow:complete-momenten
- ✅ Migrations applied (`extend_leads` + `create_consent_log`) door Tharwat
- ✅ Edge Function `lead-upsert` deployed plus geconfigureerd met `ALLOWED_ORIGINS` + Brevo secrets
- ✅ Pre/post pand-counts gelijk gebleven, smoke-test groen, smoke-data opgeruimd
- ✅ `VITE_SUPABASE_ENABLED=true` op 2026-05-08 geflipt plus production redeploy gedraaid
- ✅ End-to-end verificatie: eerste echte chat-sessie geland in `public.leads` plus `public.consent_log`
- ⏸️ RLS bewust niet geactiveerd om CRM/dashboard-flow niet te raken (Phase 3)
- ⏸️ Slack-relay via Edge Function uit, eigen `/api/slack-hot.js` blijft `#hot-clp-leads` voeden

## What this is

Backend for the Conversational Landing Page (CLP). First customer: De Hofman, live at `dehofman.clp.repp.nl`. Future CLPs will run at `<project>.clp.repp.nl` on the same Supabase.

Lead data is currently stored only in the visitor's `localStorage`. We want to write it real-time to the existing Supabase, **alongside** the WhatsApp-bot leads already there (391 rows as of 2026-05-06).

## Hard rules

- ❌ Do not mutate or delete existing data
- ❌ Do not drop or rename tables
- ❌ Do not modify existing columns
- ❌ Do not touch WhatsApp-bot infrastructure
- ❌ Service-role key NEVER in the frontend
- ✅ Additive only: nullable columns + one new table
- ✅ All DDL as reviewable `.sql` files
- ✅ Pre-flight + post-flight count check on `leads`

## What we need from you

Update 2026-05-07 op basis van Tharwat's brief:

1. ✅ **Supabase project URL** — ontvangen
2. ✅ **Anon key** — ontvangen, in Vercel env gezet
3. ⏳ **Service-role key** — Tharwat levert in **final deployment step** (zoals afgesproken). Niet aan client, alleen in Supabase Edge Function secrets via `supabase secrets set`. Eén key gedeeld met n8n is OK want Supabase ondersteunt geen meerdere service-role keys per project.

Plus de volgende **openstaande vragen** voordat we Fase 1 starten:

| Vraag | Waarom |
|---|---|
| Welke service gebruikt het CRM-frontend (anon key of authenticated user)? Op welke tabellen leest/schrijft het? | Onze `recommended_rls.sql` blokkeert anon-toegang tot `leads`. Als CRM via anon-key leest, breken we 'em. |
| Bestaat een staging/preview Supabase project? | Reduceert risico in eerste rollout-rondje. |
| Kun je een full backup maken vóór migration en versleuteld leveren? | Onze rollout-runbook vereist pre-flight backup; wij willen dat onafhankelijk valideren. |
| Wat is de realistische datum waarop Phase 2 als groen wordt verklaard? | Onze rollout haakt daarop in (Tharwat's volgorde-aanbeveling). |
| Wie pakt na CLP-launch de bredere RLS-gap aan (chatlog, outbound_settings, escalations, projects)? | Tharwat noemt 5 tabellen zonder RLS. CLP raakt alleen leads + consent_log; rest is follow-up sprint. |

## Folder structure

```
supabase/
├── README.md                                    ← this file
├── migrations/
│   ├── 20260506120000_extend_leads.sql          ← step 1
│   └── 20260506120100_create_consent_log.sql    ← step 2
├── policies/
│   └── recommended_rls.sql                      ← step 3, REVIEW first
├── rollback/
│   └── rollback_all.sql                         ← emergency undo
└── functions/
    └── lead-upsert/
        ├── index.ts                             ← Edge Function
        ├── slack.ts                             ← HOTLEADS notifier
        └── deno.json
```

## Scope

**Wel binnen CLP-scope (deze rollout):**
- `public.leads`: nullable kolommen toevoegen + partial unique index
- `public.consent_log`: nieuwe append-only tabel
- RLS op `public.leads` en `public.consent_log`
- Edge Function `lead-upsert`

**Buiten CLP-scope (follow-up sprint):**
- RLS op `chatlog`, `outbound_settings`, `escalations`, `projects` — Tharwat noemt dat die ook RLS-loos zijn. Wij raken die niet aan in deze rollout. Voor de bredere security-gap is een aparte sprint nodig na CLP-launch.
- Service-role key rotation strategie (gedeeld met n8n; aparte runbook nodig)
- consent_log retentie-cron (60 mnd cleanup; eerste cleanup pas in 2031)

## Phase 2 rollout (afgerond 2026-05-08)

Tharwat's volgorde-aanbeveling (brief 2026-05-07), achteraf gemarkeerd:

1. ✅ Frontend wired achter feature-flag
2. ✅ Phase 2 stabilisatie afgerond
3. ✅ Production operational flow gevalideerd
4. ✅ Migrations applied (RLS bewust uitgesteld naar Phase 3)
5. ✅ Edge Function deployed plus secrets geconfigureerd
6. ✅ Frontend feature-flag flip live (Vercel redeploy 2026-05-08)

Eerste echte lead-rij is geland en bevestigd in `public.leads`. Lokale localStorage-queue wordt automatisch geflusht bij elke volgende app-mount.

## Migration runbook (in order)

### 0. Pre-flight (required)

Baseline counts (Tharwat 2026-05-07): leads 393, chatlog 439, escalations 58, outbound_settings 9, projects 10.

```sql
-- Full backup eerst (Tharwat draait dit zelf):
-- pg_dump --table=public.leads --table=public.consent_log <DB> > clp-pre-2026-05-07.sql
-- Of liefst de hele DB.

-- Existing columns on leads — check there is no name collision:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='leads'
ORDER BY ordinal_position;

-- Baseline row counts BEFORE — alle 5 tabellen (Tharwat brief 2026-05-07):
SELECT 'leads' AS t, count(*) AS n FROM public.leads
UNION ALL SELECT 'chatlog',          count(*) FROM public.chatlog
UNION ALL SELECT 'escalations',      count(*) FROM public.escalations
UNION ALL SELECT 'outbound_settings',count(*) FROM public.outbound_settings
UNION ALL SELECT 'projects',         count(*) FROM public.projects;
-- Expected: 393, 439, 58, 9, 10. Record exact numbers.
```

If any of the new column names already exist with a different type → **stop** and ping Jann. We will agree on a prefix (e.g. `clp_`) or a skip strategy.

### 1. `20260506120000_extend_leads.sql`

Adds nullable columns to `public.leads` plus a partial unique index on `(source, session_id)` for idempotent upsert. Existing rows are not touched.

```bash
psql "$DATABASE_URL" -f migrations/20260506120000_extend_leads.sql
```

### 2. `20260506120100_create_consent_log.sql`

Creates a new append-only table `public.consent_log` for GDPR Art. 7 audit. No FK to `leads` (soft reference via `lead_id uuid`) because we are not certain of the type of `leads.id` — if `leads.id` is also uuid, you may add the FK afterwards. The header comment in the file explains this.

```bash
psql "$DATABASE_URL" -f migrations/20260506120100_create_consent_log.sql
```

### 3. `policies/recommended_rls.sql` — REVIEW FIRST

⚠️ Read the header of this file carefully. It enables RLS on `public.leads` and blocks all anon access. **Assumption**: the WhatsApp-bot writes via the service-role key, not via the anon key. Please verify that first — search the bot code for `SUPABASE_SERVICE_ROLE_KEY` vs `SUPABASE_ANON_KEY`.

If the assumption holds:

```bash
psql "$DATABASE_URL" -f policies/recommended_rls.sql
```

If the WhatsApp-bot uses the anon key → do not run this, ping Jann, and we will design a policy shape that can co-exist with the bot.

### 4. Post-flight (required)

```sql
-- Alle counts AFTER moeten gelijk zijn aan BEFORE:
SELECT 'leads' AS t, count(*) AS n FROM public.leads
UNION ALL SELECT 'chatlog',          count(*) FROM public.chatlog
UNION ALL SELECT 'escalations',      count(*) FROM public.escalations
UNION ALL SELECT 'outbound_settings',count(*) FROM public.outbound_settings
UNION ALL SELECT 'projects',         count(*) FROM public.projects;
-- 393/439/58/9/10. Als er ÉÉN afwijkt — STOP en rollback.

-- Snel-check leads (klassieke check):
SELECT count(*) AS leads_after FROM public.leads;

-- New columns present?
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name='leads'
  AND column_name IN ('session_id','source','persona','attributes','last_event_at')
ORDER BY column_name;

-- consent_log exists?
SELECT to_regclass('public.consent_log') AS consent_log_exists;

-- WhatsApp-bot smoke test: send one real test message to the bot and check
-- that it still writes a lead. No write via the bot = bug on our side.
```

### 5. Rollback (only if something is really wrong)

```bash
psql "$DATABASE_URL" -f rollback/rollback_all.sql
```

See the header comment in `rollback_all.sql` for the recommended pre-rollback CSV export.

## Edge Function deployment

### One-time setup

```bash
# In the CLP repo root:
supabase login
supabase link --project-ref <project-ref>      # from the Supabase URL
```

### Set secrets

```bash
supabase secrets set \
  ALLOWED_ORIGINS='https://dehofman.clp.repp.nl,https://clp-xi-tan.vercel.app,http://localhost:5173' \
  BREVO_API_KEY='xkeysib-...'                  \  # v3 API key uit Brevo dashboard
  BREVO_LIST_ID='42'                            \  # numerieke ID van de target-lijst
  SLACK_HOTLEADS_WEBHOOK_URL='https://hooks.slack.com/...'  # optioneel; alleen voor consolidatie van Slack-routing later

# SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY worden automatisch geinjecteerd door
# de Edge runtime — niet zelf zetten.
#
# Slack is OPTIONEEL in deze ronde: zonder die secret slaat de Edge Function
# de Slack-call netjes over en blijft de bestaande Vercel /api/slack-hot.js
# de Hothothot pings doen. Slack-consolidatie is een aparte vervolgstap.
```

### Deploy

```bash
supabase functions deploy lead-upsert
```

### Smoke test

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

Expected: `{"ok":true,"lead_id":"...","consents_inserted":1}`. Then clean up the test lead:

```sql
DELETE FROM public.consent_log WHERE source = 'clp_smoketest';
DELETE FROM public.leads        WHERE source = 'clp_smoketest';
```

## Frontend wiring

De frontend client zit in `src/lib/api.js` en wordt aangeroepen in `App.jsx` op alle flow:complete-momenten (zie `pushSnapshot()` plus de email-gate in de useEffect-dependencies). Email-gate betekent: er wordt pas een rij gepushed zodra `lead.email` bestaat, zodat we geen orphan-rijen creëren.

`VITE_SUPABASE_ENABLED` (master-switch) staat sinds 2026-05-08 op `true` op Production en Preview. Bij `false` doet `pushLead()` niets en retourneert `{ ok: true, queued: false, skipped: true }`.

Vercel env vars op de CLP project (Production + Preview):

```
VITE_SUPABASE_URL          = https://vgdwgjthvltucabqfysd.supabase.co
VITE_SUPABASE_ANON_KEY     = eyJ...
VITE_LEAD_UPSERT_PATH      = /functions/v1/lead-upsert    # default
VITE_CLP_SOURCE            = clp_dehofman                  # per project
VITE_SUPABASE_ENABLED      = true                          # geflipt op 2026-05-08
```

### localStorage queue + admin diagnostiek

Bij netwerkfouten of 5xx-responses van de Edge Function valt `pushLead()` terug op een localStorage-queue (`clp-lead-queue-v1`, max 50 items, max 5 retries per item). Deze wordt automatisch geflusht bij app-mount en bij `online`-event.

Voor monitoring is in het admin-paneel (Settings-sectie) een `SupabaseQueueTile` widget zichtbaar. Die toont:
- Of de feature-flag actief is (`isApiConfigured()`)
- Aantal items in de queue (`pendingCount()`)
- Voor de oudste 3 items: leeftijd, retry-count, persona/email-fragment
- Knop om handmatig te flushen
- Knop om de queue te wissen (debug)

Zie `src/components/admin/SupabaseQueueTile.jsx`.

## Questions / contact

Jann — direct on WhatsApp.

## Change log

| Date        | What                                           |
|-------------|------------------------------------------------|
| 2026-05-06  | Initial, migrations + Edge Function prepared. |
| 2026-05-07  | Tharwat brief verwerkt: baseline counts bumped (393), Phase 2 sectie + scope-sectie + openstaande vragen toegevoegd. Frontend (App.jsx + api.js + consent.js) gewired achter `VITE_SUPABASE_ENABLED=false`. Anon key + URL ontvangen, in Vercel env gezet. Service-role key + Edge Function deployment pending Phase 2-validation. |
| 2026-05-08  | **Phase 2 live**. Tharwat heeft migrations + Edge Function deployed plus Brevo secrets + ALLOWED_ORIGINS geconfigureerd. Pre/post counts gelijk gebleven, smoke-test groen. Wij hebben `VITE_SUPABASE_ENABLED=true` in Vercel geflipt en productie geredeployed. Eerste echte lead-rij geland en bevestigd in `public.leads`. Lokaal nieuwe admin-widget `SupabaseQueueTile` gemaakt die `pendingCount()` + `inspectQueue()` zichtbaar maakt voor diagnostiek (settings-sectie). RLS blijft uit voor CRM/dashboard-compatibiliteit, Phase 3 follow-up. |
