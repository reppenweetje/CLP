# Environment-variabelen

Niet versioned. Zet ze in Vercel Dashboard onder **Project Settings, Environment Variables**.

Per integratie de volledige set die nodig is voor activatie. Zonder de bijbehorende env-vars draait de feature niet maar blokkeert ook niets, zodat je elke integratie afzonderlijk kunt aanzetten.

---

## Slack hot-lead notificaties

| Variabele | Waarde | Scope |
|---|---|---|
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/services/.../...` | Production + Preview |

Server-side webhook voor de Slack-app. Post in een privé-channel zodra een bezoeker expliciet om callback vraagt en een 06 invult. Trigger sinds mei 2026: alleen `warmHandoffOutcome === 'callback'` plus `lead.phone` aanwezig (dus geen score-gebaseerde pings meer).

**Setup:**
1. Slack-app aanmaken in jouw workspace via api.slack.com/apps
2. Activeer **Incoming Webhooks** in de app-config
3. Voeg een webhook toe voor het kanaal waar pings moeten landen
4. Kopieer de webhook URL en zet 'em in Vercel
5. Redeploy productie zodat de env-var wordt meegenomen

**Endpoint**: `/api/slack-hot.js` (Vercel serverless), POST application/json. Returns 204 bij succes, 503 bij ontbrekende env, 502 bij Slack-API failure.

**Dedupe**: localStorage `clp-slack-notified-v1` (max 200 sessionIds). Page-reloads herfire't niet.

---

## Supabase backend

| Variabele | Waarde | Scope |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production + Preview |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (anon key, niet service-role) | Production + Preview |
| `VITE_SUPABASE_ENABLED` | `true` of `false` (master-switch) | Production + Preview |
| `VITE_LEAD_UPSERT_PATH` | `/functions/v1/lead-upsert` (default, optioneel) | Production + Preview |
| `VITE_CLP_SOURCE` | `clp_<projectnaam>` (per project uniek) | Production + Preview |

Frontend wiring zit in `src/lib/api.js`. Wordt aangeroepen op alle flow-complete momenten in `App.jsx`. Bij `VITE_SUPABASE_ENABLED=false` doet de client niets en retourneert `{ ok: true, queued: false, skipped: true }`.

**Setup:**
1. Backend-dev (Tharwat-traject voor REPP) deployt migrations + Edge Function `lead-upsert` plus configureert `ALLOWED_ORIGINS` en Brevo secrets aan de Supabase-kant
2. Wij krijgen de project-URL en anon-key, zetten ze in Vercel
3. `VITE_SUPABASE_ENABLED` blijft op `false` tot de backend live is
4. Bij activatie: zet 'em op `true` en redeploy productie (Vite injecteert env-vars tijdens build, dus redeploy is verplicht)

**Localstorage queue**: `clp-lead-queue-v1` (max 50 items, max 5 retries per item). Geflusht bij app-mount en bij `online`-event. Zichtbaar in admin-panel onder de section "Supabase".

Zie [supabase/README.md](supabase/README.md) voor de volledige briefing.

---

## Brevo email-sync

Brevo-integratie loopt via de Supabase Edge Function (server-side). Frontend stuurt geen Brevo-credentials. Backend-dev configureert deze secrets aan de Supabase-kant via `supabase secrets set`:

| Secret (Supabase, niet Vercel) | Waarde |
|---|---|
| `BREVO_API_KEY` | v3 API-key uit Brevo dashboard |
| `BREVO_LIST_ID` | Numerieke ID van de target-lijst |

Voor onze frontend dus niet relevant. Werkt automatisch zodra Supabase actief is.

---

## Plausible analytics

Geen env-vars nodig. Plausible-script wordt geladen in `index.html` met domain-attribuut. Aanpassen in `index.html` na elke domein-wijziging:

```html
<script defer data-domain="jouw-domein.nl" src="..."></script>
```

Custom events worden in de code aangeroepen via `trackEvent()` in `src/lib/analytics.js`. Goals kunnen geinitialiseerd worden via `npm run setup:plausible` (vereist Plausible API key in een `.env.local`):

```
PLAUSIBLE_API_KEY=plausible_pat_xxx   # alleen voor lokale setup-script
PLAUSIBLE_SITE_ID=jouw-domein.nl      # idem
```

`.env.local` is gitignored, gebruikt door `scripts/setup-plausible-goals.mjs` om custom-events als goals te registreren. Eenmalige actie per project.

---

## Lokaal ontwikkelen

Voor `npm run dev` heb je geen van deze env-vars nodig. De CLP draait dan op puur localStorage zonder Slack of Supabase calls. Alle integraties faalsoft naar `console.info` of stille skip.

Voor lokale Supabase-tests: maak een `.env.local` (gitignored):

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_ENABLED=true
VITE_CLP_SOURCE=clp_<projectnaam>_dev
```

Vergeet niet `dev` als suffix toe te voegen aan `VITE_CLP_SOURCE` zodat lokale testdata niet vermengt met productie-rijen.
