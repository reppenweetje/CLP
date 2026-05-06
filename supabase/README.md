# Supabase backend — REPP CLP

Briefing for **Tharwat**. Status as of 2026-05-06: prepared, not yet rolled out.

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

Please send the following three to Jann (via 1Password / Bitwarden / signed message — not via Slack/email in clear text):

1. **Supabase project URL** — `https://xxx.supabase.co`
2. **Service-role key** — preferably a **new** one specifically for CLP, so we can rotate it independently
3. **Anon key** (the public one)

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

## Migration runbook (in order)

### 0. Pre-flight (required)

```sql
-- Backup created? At minimum, dump the leads table:
-- pg_dump --table=public.leads <DB> > leads-pre-clp-2026-05-06.sql

-- Existing columns on leads — check there is no name collision:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='leads'
ORDER BY ordinal_position;

-- Lead count BEFORE:
SELECT count(*) AS leads_before FROM public.leads;
-- Expected: 391. Record the exact number you observe.
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
-- Lead count AFTER must be exactly equal to BEFORE:
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
supabase secrets set SLACK_HOTLEADS_WEBHOOK_URL='https://hooks.slack.com/...' \
                     ALLOWED_ORIGINS='https://dehofman.clp.repp.nl,https://clp-xi-tan.vercel.app,http://localhost:5173'

# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provided in the Edge runtime.
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

The frontend client is ready in `src/lib/api.js` (see the wiring instructions at the top of that file). It is **not yet imported** anywhere — no breaking change for the current demo. We will do the wiring in `App.jsx` once the Edge Function is live.

Vercel env vars to add on the CLP project (Production + Preview):

```
VITE_SUPABASE_URL          = https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY     = eyJ...
VITE_LEAD_UPSERT_PATH      = /functions/v1/lead-upsert    # default
VITE_CLP_SOURCE            = clp_dehofman                  # per project
```

## Questions / contact

Jann — direct on WhatsApp.

## Change log

| Date        | What                                           |
|-------------|------------------------------------------------|
| 2026-05-06  | Initial — migrations + Edge Function prepared. |
