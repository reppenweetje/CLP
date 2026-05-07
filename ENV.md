# Environment-variabelen

Niet versioned. Zet ze in Vercel Dashboard onder **Project Settings → Environment Variables**.

## Slack hot-lead notificaties

| Variabele | Waarde | Waarom |
|---|---|---|
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/services/.../...` | Server-side webhook voor de Hothothot Slack-app. Post in `#hot-clp-leads` zodra een bezoeker een hot-lead-score raakt en minimaal een e-mailadres heeft achtergelaten. |

### Hothothot Slack-app

- App-naam: `Hothothot`
- Workspace: `REPP`
- Channel: `#hot-clp-leads` (privé)
- Beheer: https://api.slack.com/apps/A0B23VBE72R
- Webhook-URL onder **Incoming Webhooks** in de app-config

### Vercel scope

Zet `SLACK_WEBHOOK_URL` aan voor zowel **Production** als **Preview** als je ook PR-deploys realtime alerts wil zien. Voor lokale `npm run dev` wordt geen Slack-call gedaan — de fetch faalt op 404 zonder dat de chat-flow blokkeert.

### Endpoints

- `/api/slack-hot` (Vercel serverless function in `api/slack-hot.js`)
- Methode: `POST application/json`
- Body schema: zie comments in `api/slack-hot.js`
- Returns: `204` bij succes, `503` bij ontbrekende env, `502` bij Slack-API failure

### Trigger-logica

Frontend `src/lib/slack.js::notifyHotLead()` wordt vanuit `App.jsx` aangeroepen wanneer:

1. `buying.temperature === 'hot'` (uit `lib/buyingSignals.js`, score ≥ 50)
2. `state.answers.lead.email` is aanwezig (anders kan sales niets met de melding)
3. Per `sessionId` maximaal 1 keer per sessie (in-memory dedupe)

Bij elke call worden naam, e-mail, 06, persona, score, signalen en context (intent/m²/timeline) meegestuurd.
