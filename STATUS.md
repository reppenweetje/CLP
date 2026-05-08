# Project-status

> Snelle context voor een collega die deze repo overneemt of erin meeleest. Last update: 2026-05-08.

## Wat draait er live

| Onderdeel | Status | Bron |
|---|---|---|
| **Productie URL** | `https://dehofman.clp.repp.nl` (alias: `clp-xi-tan.vercel.app`) | Vercel project `clp` onder team `repp-1bdaee61` |
| **Repo** | `reppenweetje/CLP` op `main` | GitHub |
| **Auto-deploy** | Op elke push naar `main` | Vercel |
| **Slack hot-leads** | Live, alleen bij expliciete callback-aanvraag plus 06 | `/api/slack-hot.js` plus webhook in env |
| **Supabase pipeline** | Live sinds 2026-05-08, `VITE_SUPABASE_ENABLED=true` | Project `vgdwgjthvltucabqfysd` |
| **Brevo sync** | Live via Supabase Edge Function. Dual-write naar SMS plus WHATSAPP attribute | `supabase/functions/lead-upsert/brevo.ts` |
| **Plausible analytics** | Actief op productie-domein | Custom events via `src/lib/analytics.js` |
| **Admin panel** | Op `/admin`, password-gate, IP-exclusie voor team-verkeer | `src/components/admin/` |
| **RLS op Supabase** | Bewust nog niet geactiveerd (Phase 3 follow-up) | Met Tharwat afgesproken |

## Wat er recent gebeurd is

In chronologische volgorde van laatste werk-sessies:

1. **Wizard 2.0** (`21f93b7`): wizard verhuisd uit CLAUDE.md naar `WIZARD.md`, `HANDOFF.md` template toegevoegd, `npm run wizard:status` script. CLAUDE.md is nu slank en project-specifiek
2. **Supabase pipeline live** (`b0c1b18`): Tharwat deployde migrations + Edge Function, wij flipt `VITE_SUPABASE_ENABLED=true` plus redeploy. Nieuwe `SupabaseQueueTile` widget in admin-paneel
3. **Slack callback-only** (`91200b5`): Slack pingt alleen nog bij expliciete callback-aanvraag plus 06, niet meer op behavioral score. localStorage-dedupe over reloads heen
4. **Slack-bericht herontworpen** (`25af5fe`): naam in header, 06 als clickable tel: deeplink, action-buttons (Bel / WhatsApp / Mail), tijd-context (kantooruren / weekend), human-readable signal labels
5. **Even-contact direct-pad** (`5ae9c96`): chip "Even contact opnemen" toont nu direct WarmHandoffBubble zonder bridge-tekst of value-bullets
6. **Logo navigeert terug** (`5ae9c96`): klik op REPP-logo in chat-header gaat naar IntroScreen, START CHAT hervat zonder progress-verlies
7. **Brevo retry-fix** (`b89fa61`): bij Brevo's `duplicate_parameter` SMS-conflict halen we SMS uit de payload en retry'en zonder. Email plus alle andere attributes komen wel door
8. **Brevo dual-write** (`11f4d86`): telefoonnummer wordt nu naar zowel `SMS` (Brevo unique) als `WHATSAPP` (custom non-unique) attribute geschreven, zodat sales altijd het 06 kan vinden ook bij conflict

## Hoe je er insleutelt

```bash
# 1. Repo klonen + installeren
git clone https://github.com/reppenweetje/CLP.git
cd CLP
npm install

# 2. Lokaal draaien
npm run dev          # vite op poort 5174 (of beschikbare poort)

# 3. Verifieer
npm run check-content   # project.js plus assets compleet
npm run check-copy      # geen leesstreepjes in user-facing copy
npm run build           # production-build groen
npm run wizard:status   # wizard-fase voortgang (informatief)
```

Voor admin-paneel: open `http://localhost:5174/admin` of de productie-URL. Password staat in `src/components/admin/AdminPasswordGate.jsx`.

## Belangrijkste bestanden

| Wat | Waar | Wanneer aanraken |
|---|---|---|
| Project content | `src/data/project.js` | Bij elke copy- of unit-status-wijziging |
| Vragen-flow plus chip-opties | `src/data/flow.js` | Bij flow-aanpassingen |
| State-machine plus orchestrator | `src/App.jsx` (~2300 regels) | Bij gedrags-wijzigingen |
| Persona-aware handoff-copy | `src/lib/handoffCopy.js` | Bij persona-copy tweaks |
| Buying signals + thresholds | `src/lib/buyingSignals.js` | Bij scoring-wijzigingen |
| Slack endpoint | `api/slack-hot.js` | Bij slack-bericht-tweaks |
| Supabase wiring | `src/lib/api.js` | Bij API-flow wijzigingen |
| Edge Function code | `supabase/functions/lead-upsert/` | Backend-flow wijzigingen, redeploy nodig |
| Wizard voor nieuwe projecten | `WIZARD.md` | Onboarding nieuwe CLP-instances |
| Sales hand-off template | `HANDOFF.md` | Per nieuwe CLP invullen voor sales |

## Bekende open punten

- **RLS op Supabase**: bewust uit voor Phase 3, Tharwat-traject
- **Bestaande Nel-lead in Brevo**: SMS leeg, WHATSAPP veld is later toegevoegd (na de fix). Nieuwe pushSnapshot van Nel zou WHATSAPP wel vullen
- **CLP-bezoekers met 06 dat al in Brevo zit**: SMS-kolom blijft leeg, WHATSAPP wordt gevuld. Sales moet WHATSAPP-kolom toevoegen aan hun Brevo view
- **Gemini API kosten** of andere AI-features: niet aanwezig, demo is regex-only
- **Bundle size**: 622KB JS, gzip 187KB. Voor demo OK, voor productie eventueel code-splitting overwegen

## Contact

| Wie | Waarvoor |
|---|---|
| Jann | Frontend, copy, deploy, productie-CLP |
| Tharwat | Supabase backend, migrations, Edge Function, Brevo secrets |

## Volgende mogelijke werk-rondes

Niet ingepland maar wel logisch als vervolg:
- Vercel function logs review na een week productie-traffic om te zien hoe vaak SMS-conflict voorkomt
- A/B variant labels voor CTA-button activeren (nu allen "START CHAT")
- Externe uptime-monitoring voor de CLP plus Supabase Edge Function
- AI-mode na lead-capture (Claude API met function-calling) — architectuur is er klaar voor
- Live unit-status feed uit `kopen.repp.nl` ipv hardcoded `project.sitePlan`

Zie ook `WIZARD.md` voor onboarding-handleiding voor nieuwe CLP-instances en `supabase/README.md` voor het Supabase backend-traject.
