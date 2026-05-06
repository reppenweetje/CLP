# Edge Function — `lead-upsert`

Single write-path voor CLP leads + consent. Service-role-key leeft hier (server-side env), nooit in de browser bundle.

## Endpoint

```
POST https://<project>.supabase.co/functions/v1/lead-upsert
Headers:
  Content-Type:  application/json
  Authorization: Bearer <SUPABASE_ANON_KEY>
```

Authorization is een Supabase-eis voor function-invocation; de anon-key geeft géén database-toegang.

## Request body

Zie de `LeadPayload` interface in [`index.ts`](./index.ts). Minimaal vereist:

```json
{
  "session_id": "8+ chars (crypto.randomUUID)",
  "source":     "clp_<project>"
}
```

Alle andere velden zijn optioneel. De Edge Function stuurt alleen velden die je meegeeft naar de DB — `undefined` velden raken bestaande waarden niet aan (geen NULL-overwrite).

## Response

| Status | Betekenis                                      | Body                                                                  |
| ------ | ---------------------------------------------- | --------------------------------------------------------------------- |
| 200    | Lead + consents oké                            | `{ ok:true, lead_id, consents_inserted }`                             |
| 207    | Lead oké, consent fout — frontend mag retryen  | `{ ok:true, lead_id, consent_error, consents_inserted:0 }`            |
| 400    | Bad payload — niet retryen, body bevat detail  | `{ error:'validation_failed', detail:'...' }`                         |
| 405    | Geen POST                                      | `{ error:'method_not_allowed' }`                                      |
| 500    | Server-fout (server_misconfigured of DB-write) | `{ error:'lead_upsert_failed', detail:'...' }`                        |

## Idempotency

Upsert keyed op `(source, session_id)`. Meermalig posten van dezelfde sessie → één rij. Consent-rijen zijn append-only by design — bij een retry kunnen er duplicaat-consents komen voor dezelfde scope. Dat is AVG-acceptabel (over-recorden boven missen).

## Hot-lead Slack notificatie

Als `temperature === 'hot'` en `SLACK_HOTLEADS_WEBHOOK_URL` is gezet → fire-and-forget POST naar Slack. Faalt nooit de hoofd-response.

## Env vars

| Naam                          | Door wie       | Wat                                         |
| ----------------------------- | -------------- | ------------------------------------------- |
| `SUPABASE_URL`                | Auto (Supabase) | Project URL                                 |
| `SUPABASE_SERVICE_ROLE_KEY`   | Auto (Supabase) | Bypasst RLS, schrijft via Edge Function     |
| `SLACK_HOTLEADS_WEBHOOK_URL`  | Wij            | Optioneel; zonder → Slack-stap is no-op     |
| `ALLOWED_ORIGINS`             | Wij            | Comma-separated; default in `index.ts`      |

## Lokaal runnen

```bash
supabase functions serve lead-upsert --env-file .env.local
```

`.env.local` (niet committen):

```
SLACK_HOTLEADS_WEBHOOK_URL=https://hooks.slack.com/...
```

`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` worden door `supabase functions serve` automatisch geïnjecteerd vanuit het gelinkte project.

## Deploy

```bash
supabase functions deploy lead-upsert
```
