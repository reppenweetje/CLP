# Edge Function — `lead-upsert`

Single write-path for CLP leads + consent. The service-role key lives here (server-side env), never in the browser bundle.

## Endpoint

```
POST https://<project>.supabase.co/functions/v1/lead-upsert
Headers:
  Content-Type:  application/json
  Authorization: Bearer <SUPABASE_ANON_KEY>
```

The `Authorization` header is required by Supabase to invoke the function; the anon key does **not** grant database access on its own.

## Request body

See the `LeadPayload` interface in [`index.ts`](./index.ts). Minimum required:

```json
{
  "session_id": "8+ chars (crypto.randomUUID)",
  "source":     "clp_<project>"
}
```

All other fields are optional. The Edge Function only forwards the fields you send to the database — `undefined` fields do not overwrite existing values (no NULL overwrite).

## Response

| Status | Meaning                                              | Body                                                                  |
| ------ | ---------------------------------------------------- | --------------------------------------------------------------------- |
| 200    | Lead + consents OK                                   | `{ ok:true, lead_id, consents_inserted }`                             |
| 207    | Lead OK, consent failed — frontend may retry consent | `{ ok:true, lead_id, consent_error, consents_inserted:0 }`            |
| 400    | Bad payload — do not retry, body has detail          | `{ error:'validation_failed', detail:'...' }`                         |
| 405    | Not POST                                             | `{ error:'method_not_allowed' }`                                      |
| 500    | Server error (misconfigured or DB write failure)     | `{ error:'lead_upsert_failed', detail:'...' }`                        |

## Idempotency

Upsert keyed on `(source, session_id)`. Multiple calls with the same key → one row. Consent rows are append-only by design — on a retry you may get duplicate consent rows for the same scope. That is GDPR-acceptable (over-record beats miss).

## Hot-lead Slack notification

If `temperature === 'hot'` and `SLACK_HOTLEADS_WEBHOOK_URL` is set → fire-and-forget POST to Slack. Never blocks the main response.

## Env vars

| Name                          | Set by         | Description                                 |
| ----------------------------- | -------------- | ------------------------------------------- |
| `SUPABASE_URL`                | Auto (Supabase) | Project URL                                 |
| `SUPABASE_SERVICE_ROLE_KEY`   | Auto (Supabase) | Bypasses RLS, used by the Edge Function     |
| `SLACK_HOTLEADS_WEBHOOK_URL`  | You            | Optional; if unset → Slack step is a no-op  |
| `ALLOWED_ORIGINS`             | You            | Comma-separated; default in `index.ts`      |

## Local run

```bash
supabase functions serve lead-upsert --env-file .env.local
```

`.env.local` (do not commit):

```
SLACK_HOTLEADS_WEBHOOK_URL=https://hooks.slack.com/...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by `supabase functions serve` from the linked project.

## Deploy

```bash
supabase functions deploy lead-upsert
```
