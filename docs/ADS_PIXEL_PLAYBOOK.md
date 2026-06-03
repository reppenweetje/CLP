# REPP Ads-Pixel Playbook

**Complete, hand-holding setup voor Meta + LinkedIn ads-pixels op een nieuw REPP CLP-project, met schone cross-platform attribution, cross-domain UTM-passthrough en marketing-pipeline (Brevo + Slack + Supabase).**

Geschreven 2026-05-28 na het succesvol live-zetten van de uitgifte.com setup. Volg dit document stap voor stap en je hebt binnen een dag werk een complete attribution-stack staan voor je nieuwe project, zonder de 4u trial-and-error die wij hadden.

---

## Inhoudsopgave

- [0. Wat je krijgt aan het einde](#0-wat-je-krijgt-aan-het-einde)
- [1. Voorbereiding & checklist](#1-voorbereiding--checklist)
- [2. Architectuur in detail](#2-architectuur-in-detail)
- [3. Stap 1 — Lokale clones en git config](#3-stap-1--lokale-clones-en-git-config)
- [4. Stap 2 — Meta-account voorbereiden](#4-stap-2--meta-account-voorbereiden)
- [5. Stap 3 — LinkedIn-account voorbereiden](#5-stap-3--linkedin-account-voorbereiden)
- [6. Stap 4 — CLP frontend: index.html](#6-stap-4--clp-frontend-indexhtml)
- [7. Stap 5 — CLP frontend: adSource.js](#7-stap-5--clp-frontend-adsourcejs)
- [8. Stap 6 — CLP frontend: App.jsx helpers + callsites](#8-stap-6--clp-frontend-appjsx-helpers--callsites)
- [9. Stap 7 — Marketing-site: UTM passthrough script](#9-stap-7--marketing-site-utm-passthrough-script)
- [10. Stap 8 — Supabase edge function: Brevo wiring](#10-stap-8--supabase-edge-function-brevo-wiring)
- [11. Stap 9 — Meta Custom Conversions aanmaken](#11-stap-9--meta-custom-conversions-aanmaken)
- [12. Stap 10 — Domain verification](#12-stap-10--domain-verification)
- [13. Stap 11 — LinkedIn Conversions aanmaken](#13-stap-11--linkedin-conversions-aanmaken)
- [14. Stap 12 — Build, push, deploy](#14-stap-12--build-push-deploy)
- [15. Stap 13 — End-to-end verification](#15-stap-13--end-to-end-verification)
- [16. Stap 14 — Campagnes aanmaken](#16-stap-14--campagnes-aanmaken)
- [17. Bijlage A — Troubleshooting](#17-bijlage-a--troubleshooting)
- [18. Bijlage B — Compleet code-overzicht](#18-bijlage-b--compleet-code-overzicht)
- [19. Bijlage C — Commands cheatsheet](#19-bijlage-c--commands-cheatsheet)
- [20. Bijlage D — AI-prompt template](#20-bijlage-d--ai-prompt-template)

---

## 0. Wat je krijgt aan het einde

Een complete attribution-stack waarbij:

1. **Bezoekers** komen via Meta- of LinkedIn-ad → marketing-site → CLP chat-flow
2. **UTM-params** survive de cross-domain navigation (marketing-site → CLP)
3. **Source wordt gedetecteerd** in de CLP en opgeslagen in sessionStorage
4. **Conversion-events** (Lead, FullLeadComplete, Contact) fired **alleen naar het matching platform**:
   - Meta-bezoeker fult email → Alleen Meta krijgt Lead-conversion
   - LinkedIn-bezoeker fult email → Alleen LinkedIn krijgt Lead-conversion
   - Organische bezoeker (geen ad) → Geen ad-platform krijgt conversion
5. **PageView** fired naar BEIDE pixels (voor retargeting-audience-building — dat is geen conversion, dus geen attribution-vervuiling)
6. **Brevo list-koppeling** elke nieuwe lead → marketing-list (naam + email)
7. **Slack-notificatie** elke nieuwe lead → sales-channel
8. **Supabase** als single source of truth voor lead-data + admin-UI

**Resultaat**: campagnes voor Meta én LinkedIn lopen parallel met schone, vergelijkbare data, zonder dat beide platforms credit claimen voor leads die het ander dreef.

---

## 1. Voorbereiding & checklist

Voordat je begint, check of je dit allemaal hebt:

### Toegangen
- [ ] GitHub-account met write-access op de CLP-repo en marketing-site-repo
- [ ] Vercel-account (REPP team OF persoonlijk) met deploy-rechten voor beide projecten
- [ ] Meta Business Manager-account, REPP business portfolio
- [ ] Meta Ads Manager toegang op het juiste ad-account (bv. REPP `207627662078855`)
- [ ] LinkedIn Campaign Manager toegang op het juiste ad-account
- [ ] Brevo-account toegang met API-key creatie-rechten
- [ ] Supabase project-toegang (`clp-analytics` of vergelijkbaar)
- [ ] Slack-workspace toegang om incoming-webhook voor sales-channel te maken

### Tools
- [ ] Lokaal: `git`, `node`, `npm`, `curl`
- [ ] Optioneel: Vercel CLI (`npm i -g vercel`) — alleen als je manueel wil deployen
- [ ] Optioneel: Supabase CLI (`npm i -g supabase`) — alleen als je edge functions buiten MCP wil deployen

### Informatie verzameld
- [ ] Project slug (bv. `borculo`, `dehofman`, `uitgifte`) — lowercase, geen spaties
- [ ] Marketing-site domain (bv. `www.borculo-uitgifte.nl`)
- [ ] CLP domain (bv. `borculo.clp.repp.nl`)
- [ ] Meta Pixel ID (hergebruiken: `2003219213613252` REPP-shared, of nieuwe aanmaken)
- [ ] LinkedIn Partner ID (uit Campaign Manager → Account Assets → Insight Tag)
- [ ] Brevo List ID waar leads naartoe moeten (numeriek, bv. `292`)
- [ ] Slack webhook URL voor sales-channel

### Repositories
- [ ] CLP-repo bestaat (template: `clp-template` of clone van bestaand project)
- [ ] Marketing-site repo bestaat (HTML/Webflow/etc)
- [ ] Supabase project loopt al voor leads/events

---

## 2. Architectuur in detail

```
┌─────────────────────────────────────────────────────────────────────┐
│  STAP 1 - CAMPAGNE                                                  │
│                                                                     │
│    Meta-ad                            LinkedIn-ad                   │
│    ├ Destination URL:                 ├ Destination URL:            │
│    │ https://<marketing>/             │ https://<marketing>/        │
│    │   ?utm_source=meta               │   ?utm_source=linkedin      │
│    │                                  │                             │
│    └ Performance Goal:                └ Conversion to optimize:     │
│      <Project> — Lead                   <Project> — Lead            │
│      (Custom Conversion)                (LinkedIn Insight Conv)     │
└───────────────────┬─────────────────────────────────┬───────────────┘
                    ↓                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STAP 2 - MARKETING-SITE (statisch HTML / Webflow / etc)            │
│                                                                     │
│   URL: https://<marketing>/?utm_source=meta                         │
│        ↓                                                            │
│   UTM-passthrough script (vlak voor </body>):                       │
│   - Pakt utm_source / utm_campaign / fbclid / li_fat_id op uit URL  │
│   - Vindt alle <a href="https://<CLP-domain>/...">                  │
│   - Append't params aan die hrefs                                   │
│   - MutationObserver vangt dynamische links                         │
│        ↓                                                            │
│   Bezoeker klikt "Open chat" CTA →                                  │
└───────────────────┬─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STAP 3 - CLP CHAT-FLOW (React/Vite)                                │
│                                                                     │
│   URL: https://<CLP>/?chat=1&utm_source=meta                        │
│        ↓                                                            │
│   index.html laadt:                                                 │
│   - Meta Pixel script → PageView fired                              │
│   - LinkedIn Insight Tag → PageView fired                           │
│   - facebook-domain-verification meta-tag                           │
│        ↓                                                            │
│   App.jsx mount-effect:                                             │
│   - captureAdSource() leest URL-params, detecteert 'meta'           │
│   - Saved in sessionStorage['clp-ad-source-v1'] = 'meta'            │
│        ↓                                                            │
│   Bezoeker doorloopt chat-flow + vult email                         │
│        ↓                                                            │
│   handleFreeText('leadEmail') fires:                                │
│   - if (shouldFireMetaConversion()) → fireMetaLead()                │
│   - if (shouldFireLinkedInConversion()) → fireLinkedInConversion()  │
│                                                                     │
│   Resultaat: alleen Meta-pixel krijgt Lead-event ✅                 │
│              LinkedIn krijgt NIETS                                  │
│        ↓                                                            │
│   pushLead() → Supabase Edge Function clp-leads-upsert              │
└───────────────────┬─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STAP 4 - SUPABASE EDGE FUNCTION                                    │
│                                                                     │
│   clp-leads-upsert:                                                 │
│   1. Insert in public.clp_leads table                               │
│   2. Best-effort: notifyNewLead() → Slack incoming webhook          │
│   3. Best-effort: upsertBrevoContact() → Brevo Contacts API         │
│      → contact landt in list <X> met FIRSTNAME attribute            │
│                                                                     │
│   Alle 3 paths parallel, geen blocking, faalt stil als secrets      │
│   ontbreken (graceful skip per path).                               │
└─────────────────────────────────────────────────────────────────────┘

EINDRESULTAAT per lead:
  ✅ Meta Pixel: 1× Lead conversion (alleen voor Meta-source)
  ✅ Supabase clp_leads: 1 row met PII + attributes
  ✅ Slack #hot-clp-leads: 1 notificatie
  ✅ Brevo list <X>: 1 contact toegevoegd
  ✅ Admin-UI op /admin: lead zichtbaar voor sales
```

---

## 3. Stap 1 — Lokale clones en git config

### 3.1 Clone repositories

```bash
cd /Users/flip
git clone https://reppenweetje@github.com/reppenweetje/<clp-repo>.git
git clone https://reppenweetje@github.com/reppenweetje/<marketing-repo>.git
```

### 3.2 Stel git config op PER REPO

⚠️ **Cruciaal**: Vercel weigert deploys als de commit-author niet in het Vercel-team zit. Voorkom dat door per repo de juiste email te zetten:

```bash
cd /Users/flip/<clp-repo>
git config user.email "jesse+github@repp.nl"
git config user.name "Flip Jacobs"

cd /Users/flip/<marketing-repo>
git config user.email "jesse+github@repp.nl"
git config user.name "Flip Jacobs"
```

Verifieer met `git config user.email` — moet `jesse+github@repp.nl` retourneren (of welk email-adres aan jouw GitHub `reppenweetje` is gekoppeld).

### 3.3 Verifieer dat builds werken

```bash
cd /Users/flip/<clp-repo>
npm install
npm run build
```

Build moet groen geven. Zo niet → fix dat eerst voor je verder gaat. Niet doorgaan met halve setup.

---

## 4. Stap 2 — Meta-account voorbereiden

### 4.1 Pixel-keuze

Twee opties:
- **Optie A (aangeraden)**: Hergebruik de bestaande REPP-pixel `2003219213613252` (`CLP Conversion`). Filter per project via `content_category` parameter + URL-filter in Custom Conversions.
- **Optie B**: Maak nieuwe Pixel aan. Cleaner per-project scheiding, maar meer setup-werk (nieuwe pixel = nieuwe AEM-slots, nieuwe domain-verify, etc).

Voor de meeste projecten: **Optie A**. We hebben dat patroon getest voor Hofman + uitgifte.

### 4.2 Domain whitelisten

In Meta Business Settings → Brand Safety → Domains:

1. Klik "+ Add" rechtsboven
2. Voer in: `<CLP-domain>` (bv. `borculo.clp.repp.nl`)
3. (Optioneel) ook `<marketing-domain>` als je daar ook Pixel hebt of ads-traffic op laat landen

Domain verschijnt met status "Not verified" — dat fixen we in [Stap 10](#12-stap-10--domain-verification).

### 4.3 Ad Account bevestiging

Check linksboven in Meta Ads Manager: account = jouw REPP-ad-account (bv. `REPP (207627662078855)`). Customer Conversions die je straks maakt verschijnen alleen onder DIT ad-account.

---

## 5. Stap 3 — LinkedIn-account voorbereiden

### 5.1 LinkedIn Insight Tag Partner ID ophalen

In LinkedIn Campaign Manager:

1. Linker sidebar → **Meten** → **Signalen manager** (of fallback: **Account Assets** → **Insight Tag**)
2. Bovenaan staat **Partner ID** — 7-cijferig nummer (bv. `9404796`)
3. Noteer deze ID — heb je nodig in Stap 4

Als er nog geen Insight Tag is: klik "Insight Tag aanmaken" / "Create Insight Tag". LinkedIn genereert er een.

### 5.2 Brevo API key

In Brevo dashboard:

1. **Settings** → **SMTP & API** → **API keys**
2. Klik "Generate new key"
3. Naam: `CLP <Project>` (bv. `CLP Borculo`)
4. Klik Save → kopieer de key direct (krijg je 1 keer te zien!)
5. Bewaar 'm tijdelijk in een wachtwoord-manager — gebruik je in [Stap 8](#10-stap-8--supabase-edge-function-brevo-wiring)

### 5.3 Brevo List-ID

1. Brevo → **Contacts** → **Lists**
2. Maak een nieuwe list aan: `CLP <Project>` (of hergebruik bestaande)
3. Open de list → kijk in URL: `https://my.brevo.com/contact/index/list/<ID>` — die numeriek `<ID>` heb je nodig

### 5.4 Slack-webhook

1. Open Slack workspace → klik je naam → "Customize Slack" → Apps
2. Zoek **Incoming Webhooks** → Add to Slack
3. Kies channel `#hot-clp-leads` of project-specific channel
4. Klik "Add Incoming WebHooks integration"
5. Kopieer de **Webhook URL** (begint met `https://hooks.slack.com/services/...`)

---

## 6. Stap 4 — CLP frontend: index.html

### 6.1 Open een nieuwe branch

```bash
cd /Users/flip/<clp-repo>
git checkout main
git pull
git checkout -b ads-pixels-install
```

### 6.2 Edit `index.html`

Voeg in het `<head>` toe (NA `<meta name="viewport">` en `<title>`, VÓÓR `</head>`):

```html
<!-- Facebook domain verification voor <CLP-domain>. Vereist door Meta sinds
     iOS 14 voor iOS-attributie en AEM. Token komt uit Business Settings
     → Brand Safety → Domains → klik domain → kopieer meta-tag content. -->
<meta name="facebook-domain-verification" content="<VERIFICATION_TOKEN>" />

<!-- Meta Pixel. Gedeelde REPP-pixel of nieuwe, naar keuze. content_category
     wordt in App.jsx::fireMetaPixelEvent op elk event gezet voor per-project
     filtering in Custom Conversions. -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '<META_PIXEL_ID>');
  fbq('track', 'PageView');
</script>

<!-- LinkedIn Insight Tag. PageView fired automatisch on-load. Event-specifieke
     conversies worden vanuit App.jsx gefired via window.lintrk(). -->
<script type="text/javascript">
  _linkedin_partner_id = "<LINKEDIN_PARTNER_ID>";
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script>
<script type="text/javascript">
  (function(l) {
  if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
  window.lintrk.q=[]}
  var s = document.getElementsByTagName("script")[0];
  var b = document.createElement("script");
  b.type = "text/javascript";b.async = true;
  b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
  s.parentNode.insertBefore(b, s);})(window.lintrk);
</script>
```

Voeg in `<body>` (vlak na de opening tag) noscript-fallbacks toe:

```html
<noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=<META_PIXEL_ID>&ev=PageView&noscript=1"
/></noscript>
<noscript><img height="1" width="1" style="display:none;" alt=""
  src="https://px.ads.linkedin.com/collect/?pid=<LINKEDIN_PARTNER_ID>&fmt=gif"
/></noscript>
```

### 6.3 Placeholder check

Voor je commit:
- `<META_PIXEL_ID>` → vervang door je echte Pixel ID (bv. `2003219213613252`)
- `<LINKEDIN_PARTNER_ID>` → vervang door je echte Partner ID (bv. `9404796`)
- `<VERIFICATION_TOKEN>` → vervang door je Meta domain-verification token (uit Stap 10 — voeg eerst leeg toe, fix later)

Géén placeholders met `<...>` laten staan in productie.

### 6.4 Build check

```bash
npm run build
```

Moet groen. Geen JS errors verwacht omdat dit pure HTML edits zijn.

---

## 7. Stap 5 — CLP frontend: adSource.js

### 7.1 Nieuw bestand aanmaken

Maak `src/lib/adSource.js` met de volgende inhoud:

```js
// Ad-source detectie en attribution-routing voor cross-platform pixel fires.
//
// Probleem dat dit oplost: zonder source-awareness fired een Lead-event
// naar zowel Meta als LinkedIn pixels — ongeacht waar de bezoeker vandaan
// kwam. Resultaat: beide platforms claimen credit voor leads die het andere
// platform dreef, algoritmes leren op vervuilde data.
//
// Oplossing: detecteer de ad-source bij eerste page-load, sla op in
// sessionStorage, fire conversion-events alleen naar het matching pixel.
// PageView blijft naar beide gaan (geen conversie = geen pollutie, en
// retargeting-audience-building wil je sowieso voor beide platforms).

const STORAGE_KEY = 'clp-ad-source-v1'

export function detectAdSource(searchParams, referrer = '') {
  if (!searchParams) return 'organic'

  // Click-IDs (meest betrouwbaar — gezet door het ad-platform zelf)
  if (searchParams.get('fbclid')) return 'meta'
  if (searchParams.get('li_fat_id')) return 'linkedin'

  // UTM source (handmatig getagd op de ad-URL door marketeer)
  const utm = (searchParams.get('utm_source') || '').toLowerCase().trim()
  if (utm) {
    if (['facebook', 'fb', 'meta', 'instagram', 'ig'].includes(utm)) return 'meta'
    if (['linkedin', 'li'].includes(utm)) return 'linkedin'
  }

  // Referrer fallback — alleen als geen UTM/click-ID
  if (referrer) {
    const ref = referrer.toLowerCase()
    if (ref.includes('facebook.com') || ref.includes('instagram.com')) return 'meta'
    if (ref.includes('linkedin.com')) return 'linkedin'
  }

  return 'organic'
}

export function captureAdSource() {
  if (typeof window === 'undefined') return 'organic'
  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY)
    if (existing) return existing  // first-touch wins binnen sessie

    const params = new URLSearchParams(window.location.search)
    const source = detectAdSource(params, document.referrer || '')
    window.sessionStorage.setItem(STORAGE_KEY, source)
    return source
  } catch {
    return 'organic'
  }
}

export function getAdSource() {
  if (typeof window === 'undefined') return 'organic'
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) || 'organic'
  } catch {
    return 'organic'
  }
}

export function shouldFireMetaConversion() {
  return getAdSource() === 'meta'
}

export function shouldFireLinkedInConversion() {
  return getAdSource() === 'linkedin'
}
```

### 7.2 Wat dit bestand doet

- **`detectAdSource`** — pure function, neemt URLSearchParams + referrer, geeft `'meta'`, `'linkedin'` of `'organic'`. Testable.
- **`captureAdSource`** — aan te roepen 1× bij app-mount. Slaat resultaat op in sessionStorage. First-touch wins binnen sessie (refresh of interne nav verliest source niet).
- **`getAdSource`** — read-only check vanuit sessionStorage.
- **`shouldFireMetaConversion` / `shouldFireLinkedInConversion`** — helpers die je voor elke conversion-event-fire aanroept om alleen het matching pixel te triggeren.

---

## 8. Stap 6 — CLP frontend: App.jsx helpers + callsites

### 8.1 Import-block toevoegen

Bovenaan `src/App.jsx`, na de andere imports:

```jsx
import {
  captureAdSource,
  shouldFireMetaConversion,
  shouldFireLinkedInConversion,
} from './lib/adSource.js'
```

### 8.2 Constants + helpers bovenaan het module

Na de bestaande constants (`STORAGE_KEY`, etc), vóór de `reducer` functie:

```jsx
// ── Meta Pixel helpers ─────────────────────────────────────────────────────
// content_category=<project> is de project-differentiator: dezelfde REPP-
// pixel kan door meerdere CLP's gebruikt worden. In Ads Manager filter je
// per project via Custom Conversion op deze waarde.
const META_PIXEL_PROJECT = '<project-slug>'  // bv 'borculo', 'uitgifte'

function fireMetaPixelEvent(eventName, reason, extra = {}, isCustom = false) {
  if (typeof window === 'undefined') return
  if (typeof window.fbq !== 'function') return
  try {
    const eventId = `${eventName.toLowerCase()}-${reason}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    window.fbq(
      isCustom ? 'trackCustom' : 'track',
      eventName,
      { content_name: reason, content_category: META_PIXEL_PROJECT, ...extra },
      { eventID: eventId },
    )
  } catch {
    // stil falen ; analytics mag nooit de chat-flow breken
  }
}

function fireMetaLead(reason, extra = {}) {
  fireMetaPixelEvent('Lead', reason, extra)
}
function fireMetaContact(reason, extra = {}) {
  fireMetaPixelEvent('Contact', reason, extra)
}
function fireMetaCustom(eventName, reason, extra = {}) {
  fireMetaPixelEvent(eventName, reason, extra, true)
}

// ── LinkedIn Insight Tag helpers ───────────────────────────────────────────
// LinkedIn Conversion IDs worden aangemaakt in Campaign Manager → Meten →
// Conversies bijhouden → "Evenementspecifiek" methode. Null = nog niet
// aangemaakt → fire is een no-op (graceful skip). Update zodra je IDs hebt.
const LI_CONV_LEAD = null       // '<Project> — Lead' conversion ID
const LI_CONV_FULL_LEAD = null  // '<Project> — Full Lead' conversion ID

function fireLinkedInConversion(conversionId) {
  if (typeof window === 'undefined') return
  if (typeof window.lintrk !== 'function') return
  if (!conversionId) return  // graceful skip als ID nog null is
  try {
    window.lintrk('track', { conversion_id: conversionId })
  } catch {}
}
```

### 8.3 captureAdSource() in mount-effect

Zoek de `useEffect` die `startNewSession()` aanroept. Voeg `captureAdSource()` direct erna toe:

```jsx
useEffect(() => {
  startNewSession()
  logSessionStartConsent()
  captureAdSource()  // ← zo vroeg mogelijk, vóór enige conversion-fire
  setSessionReady(true)
  flushPending().catch(() => {})

  // URL-param triggers
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('debug') === '1') dispatch({ type: 'TOGGLE_DEBUG' })
    if (params.get('chat') === '1') dispatch({ type: 'URL_AUTO_START' })
  }
}, [])
```

### 8.4 Lead-event fires wrappen

Zoek je `handleFreeText` (of equivalent) waar de email-capture gebeurt. Voeg toe:

```jsx
if (key === 'leadEmail') {
  const parsed = parseLeadInput(trimmed)
  const lead = mergeLead(state.leadDraft || {}, parsed)
  appendUser(trimmed)
  if (!lead.email) {
    enqueueBot('Het mailadres herken ik niet helemaal. Kun je het nog een keer noteren?')
    return
  }
  // Meta + LinkedIn Lead-event, alleen bij EERSTE email-capture. Source-
  // routing: alleen het matching pixel ontvangt de conversion.
  const isFirstEmail = !state.leadDraft?.email
  dispatch({ type: 'LEAD_DRAFT', draft: lead })
  if (isFirstEmail) {
    if (shouldFireMetaConversion()) {
      fireMetaLead('email', { hasName: !!lead.firstName })
    }
    if (shouldFireLinkedInConversion()) {
      fireLinkedInConversion(LI_CONV_LEAD)
    }
  }
  // ... rest blijft hetzelfde
}
```

### 8.5 FullLeadComplete fires wrappen

Zoek je `finishLead` (of equivalent). Voeg toe:

```jsx
function finishLead(lead) {
  // Meta + LinkedIn FullLeadComplete-event, alleen bij eerste keer dat
  // phone landt. Sterker signaal dan email-only.
  const isFirstFullLead = !!lead?.phone && !state.answers?.lead?.phone
  if (isFirstFullLead) {
    if (shouldFireMetaConversion()) {
      fireMetaCustom('FullLeadComplete', 'lead-complete', { hasPhone: true })
    }
    if (shouldFireLinkedInConversion()) {
      fireLinkedInConversion(LI_CONV_FULL_LEAD)
    }
  }
  // ... rest blijft hetzelfde
}
```

### 8.6 Contact-events wrappen (WhatsApp + tel-tap)

In de JSX waar AppShell wordt gerendered:

```jsx
<AppShell
  // ... andere props
  onWaClick={() => { if (shouldFireMetaConversion()) fireMetaContact('whatsapp', { location: 'header' }) }}
  onPhoneClick={() => { if (shouldFireMetaConversion()) fireMetaContact('phone-tap', { location: 'header' }) }}
>
```

En in ChatThread props:

```jsx
<ChatThread
  messages={state.messages}
  onReset={handleReset}
  onWaRequest={(_e, _summary, source) => {
    if (shouldFireMetaConversion()) fireMetaContact('whatsapp', { location: source || 'chat' })
  }}
/>
```

### 8.7 Build check

```bash
npm run build
```

Moet groen. Als je een error krijgt over `captureAdSource is not defined` → check je import-statement.

---

## 9. Stap 7 — Marketing-site: UTM passthrough script

### 9.1 Open de marketing-repo

```bash
cd /Users/flip/<marketing-repo>
git checkout main
git pull
git checkout -b utm-passthrough
```

### 9.2 Edit `index.html`

Plaats dit script **vlak voor `</body>`** (zodat alle links al in DOM staan bij eerste run):

```html
<!-- UTM passthrough naar de CLP. Marketing-leads komen via ad → marketing-
     site met ?utm_source=meta of ?utm_source=linkedin. Zonder forwarding
     zou de chat-CTA naar CLP alleen ?chat=1 meekrijgen, waardoor de CLP
     source-detectie 'organic' ziet en geen ad-attributie fired.

     Script pakt 8 trackable params op (UTMs + Meta/LinkedIn click-IDs)
     en append't aan alle <a href> die naar <CLP-domain> wijzen.
     MutationObserver vangt dynamisch-toegevoegde links op (bv via async
     JS rendering); plus runs direct + bij DOMContentLoaded. -->
<script>
  (function () {
    var PASSTHROUGH = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','li_fat_id','gclid'];
    var incoming = new URLSearchParams(location.search);
    var toForward = PASSTHROUGH.filter(function (k) { return incoming.has(k); });
    if (toForward.length === 0) return;

    function forwardOnLinks() {
      var links = document.querySelectorAll('a[href*="<CLP-domain>"]');
      for (var i = 0; i < links.length; i++) {
        try {
          var url = new URL(links[i].href);
          toForward.forEach(function (k) { url.searchParams.set(k, incoming.get(k)); });
          links[i].href = url.toString();
        } catch (e) {}
      }
    }

    forwardOnLinks();
    document.addEventListener('DOMContentLoaded', forwardOnLinks);
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(forwardOnLinks).observe(
        document.body || document.documentElement,
        { childList: true, subtree: true }
      );
    }
  })();
</script>
```

### 9.3 Placeholder vervangen

`<CLP-domain>` → vervang door je echte CLP-domain (bv. `borculo.clp.repp.nl`). Géén `https://` of trailing slash — alleen de hostname.

### 9.4 Voor non-statische marketing-sites

Verschillende platforms = andere injection-methode:

| Platform | Waar |
|---|---|
| **Statisch HTML** | Direct in `<body>` vóór `</body>` (zoals hierboven) |
| **WordPress** | Plugin "Insert Headers and Footers" → "Footer scripts" |
| **Webflow** | Project Settings → Custom Code → Footer Code |
| **Framer** | Site Settings → Custom Code → End of Body |
| **Next.js** | In `_document.tsx` of `<Script strategy="lazyOnload">` component |

Bij CMS-platforms: zorg dat de script ook op interne pagina's loopt (niet alleen home), want bezoekers kunnen ook via deep-links binnenkomen.

---

## 10. Stap 8 — Supabase edge function: Brevo wiring

### 10.1 Maak `brevo.ts` in de edge function folder

Pad: `supabase/functions/clp-leads-upsert/brevo.ts`

```typescript
// Brevo Contact upsert — pusht leads (firstName + email) naar Brevo en
// koppelt ze aan list <BREVO_LIST_ID> zodat de marketing-flow op de actuele
// data kan werken. Best-effort: faalt zonder de Edge Function-response te
// blokkeren. Bewust MINIMAAL: alleen FIRSTNAME + email — Brevo is hier puur
// email-marketing-platform, niet een tweede CRM.
//
// Configure once in Supabase dashboard → Edge Functions → Secrets:
//   BREVO_API_KEY    — v3 API key uit Brevo (Settings → SMTP & API)
//   BREVO_LIST_ID    — numerieke ID van de lijst

interface BrevoLeadInput {
  email?: string | null
  first_name?: string | null
}

export async function upsertBrevoContact(lead: BrevoLeadInput): Promise<void> {
  const apiKey = Deno.env.get('BREVO_API_KEY')
  if (!apiKey) return  // niet geconfigureerd, stille skip
  if (!lead.email) return  // email-gate consistent met Supabase- en Slack-paden

  const listIdRaw = Deno.env.get('BREVO_LIST_ID')
  const listId = listIdRaw ? Number.parseInt(listIdRaw, 10) : NaN

  const attributes: Record<string, unknown> = {}
  if (lead.first_name) attributes.FIRSTNAME = lead.first_name

  const body: Record<string, unknown> = {
    email: lead.email,
    attributes,
    updateEnabled: true,  // 2e push op dezelfde email = UPDATE, geen dubbele rij
  }
  if (Number.isFinite(listId) && listId > 0) {
    body.listIds = [listId]
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[brevo] non-2xx', res.status, detail.slice(0, 300))
    }
  } catch (err) {
    console.error('[brevo] fetch failed', err)
  }
}
```

### 10.2 Wire in `index.ts`

Bovenaan, na de bestaande imports:

```typescript
import { upsertBrevoContact } from './brevo.ts'
```

Onderaan in de `Deno.serve` handler, NAAST de bestaande `notifyNewLead` Slack-call (vóór de final `return json(...)`):

```typescript
// Brevo: leads pushen naar list <X> (alleen FIRSTNAME + email).
// Zelfde gate als Slack: alleen bij eerste registratie van een email,
// en alleen voor relevante tenants. Best-effort, blokkeert response niet.
const BREVO_TENANTS = new Set(['<project-slug>'])  // bv 'borculo'
if (isNewRegistration && BREVO_TENANTS.has(tenant)) {
  upsertBrevoContact({
    email:      row.email as string | null,
    first_name: row.first_name as string | null,
  }).catch((err) => {
    console.error('[upsertBrevoContact] uncaught', err)
  })
}
```

### 10.3 Set Supabase secrets

In Supabase dashboard → project `clp-analytics` → Edge Functions → Secrets:

- `BREVO_API_KEY` = (je v3 key)
- `BREVO_LIST_ID` = `<numeric ID>`

### 10.4 Deploy

Via Supabase MCP:

```
deploy_edge_function:
  project_id: <supabase-project-id>
  name: clp-leads-upsert
  entrypoint_path: index.ts
  verify_jwt: true
  files: [index.ts, slack.ts, brevo.ts]
```

Of via CLI:

```bash
cd /Users/flip/<clp-repo>
supabase functions deploy clp-leads-upsert
```

---

## 11. Stap 9 — Meta Custom Conversions aanmaken

### 11.1 Open Events Manager

https://business.facebook.com/events_manager2 → kies pixel `CLP Conversion` (of jouw nieuwe pixel).

### 11.2 Maak 3 Custom Conversions aan

Linker sidebar → **Custom Conversions** → **Create Custom Conversion** (3x):

**Conversion 1 — Lead (email)**

| Veld | Waarde |
|---|---|
| Name | `<Project> — Lead` |
| Data source | `CLP Conversion` |
| Event | `Lead` (standard) |
| Optimization for | Lead |
| **Rule** | URL → `contains` → `<CLP-domain>` |

**Conversion 2 — Full Lead (email + phone)**

| Veld | Waarde |
|---|---|
| Name | `<Project> — Full Lead` |
| Data source | `CLP Conversion` |
| Event | `FullLeadComplete` (custom) |
| Optimization for | Other |
| **Rule** | URL → `contains` → `<CLP-domain>` |

⚠️ `FullLeadComplete` verschijnt alleen in de Event-dropdown nadat 'ie minstens 1× gefired is. Niet beschikbaar? Doe eerst een self-test door de hele flow (zie [Stap 13](#15-stap-13--end-to-end-verification)).

**Conversion 3 — Contact**

| Veld | Waarde |
|---|---|
| Name | `<Project> — Contact` |
| Data source | `CLP Conversion` |
| Event | `Contact` (standard) |
| Optimization for | Contact |
| **Rule** | URL → `contains` → `<CLP-domain>` |

### 11.3 Status check

Alle 3 verschijnen als "Inactive" met 0 events. Dat is normaal — pas Active na eerste event matching de URL-rule. Geen actie nodig.

---

## 12. Stap 10 — Domain verification

### 12.1 Token ophalen uit Meta

Business Settings → Brand Safety → Domains → klik op `<CLP-domain>` → tab "Add a meta-tag" → kopieer het content-attribute (de token, geen quotes).

### 12.2 Plak in CLP `index.html`

Vervang de `<VERIFICATION_TOKEN>` placeholder die je in Stap 4 leeg liet:

```html
<meta name="facebook-domain-verification" content="<DE-TOKEN-VAN-META>" />
```

### 12.3 Build, commit, push, wacht op deploy

Eerst alles van Stap 4 t/m 6 in 1 PR:

```bash
cd /Users/flip/<clp-repo>
npm run build    # moet groen
git add index.html src/lib/adSource.js src/App.jsx
git commit -m "ads-pixels: install Meta + LinkedIn + adSource routing"
git push -u origin ads-pixels-install
```

Open PR via GitHub web → Squash and merge → wacht op Vercel productie-deploy (~2 min).

### 12.4 Verifieer dat token live is

```bash
curl -sL "https://<CLP-domain>/?bust=$(uuidgen)" | grep "facebook-domain-verification"
```

Moet de meta-tag tonen.

### 12.5 Klik Verify in Meta

Terug in Meta Business Settings → Domains → `<CLP-domain>` → knop **Verify Domain**. Status moet groen worden ✅ binnen 30 sec.

### 12.6 Skip AEM

Meta heeft Aggregated Event Measurement-config voor veel accounts uitgefaseerd in 2025-2026 — gebeurt nu automatisch. Als de UI niet zichtbaar is voor jouw account, geen probleem. Skip 'm.

---

## 13. Stap 11 — LinkedIn Conversions aanmaken

### 13.1 Open Conversies-pagina

Campaign Manager → linker sidebar → **Meten** → **Conversies bijhouden**.

### 13.2 Maak 2 Insight Tag-conversies

Klik **Conversie maken** (dropdown) → **Insight Tag-conversie**.

**Conversion 1 — Lead**

Tab "Instellingen":

| Veld | Waarde |
|---|---|
| Conversienaam | `<Project> — Lead` |
| Categorie | `Lead` |
| Conversion value method | `Use the same value` |
| Default Value | `25` (EUR) |
| Klikken | 90 dagen (default) |
| Weergaven | 90 dagen (default) |
| Attributiemodel | Last touch (default) |

**Volgende stap** → kies **`Handmatige conversies instellen`** (middle card) → **Volgende stap** → kies **`Evenementspecifiek`** (rechter optie, NIET "Pagina laden") → **Maken**.

Na opslaan toont LinkedIn een snippet:

```js
window.lintrk('track', { conversion_id: 26339548 });
```

Het nummer `26339548` is je **Conversion ID**. Noteer 'm.

**Conversion 2 — Full Lead**

Herhaal stappen, met:

| Veld | Waarde |
|---|---|
| Conversienaam | `<Project> — Full Lead` |
| Default Value | `50` (sterker signaal) |

Noteer ook deze Conversion ID.

### 13.3 Update CLP code met IDs

```bash
cd /Users/flip/<clp-repo>
git checkout main
git pull
git checkout -b linkedin-conversion-ids
```

Edit `src/App.jsx`:

```jsx
const LI_CONV_LEAD = 26339548       // <Project> — Lead
const LI_CONV_FULL_LEAD = 26339556  // <Project> — Full Lead
```

```bash
npm run build
git add src/App.jsx
git commit -m "linkedin: vul conversion IDs in voor Lead en Full Lead"
git push -u origin linkedin-conversion-ids
```

PR mergen via GitHub web.

---

## 14. Stap 12 — Build, push, deploy

### 14.1 Marketing-site PR

```bash
cd /Users/flip/<marketing-repo>
git add index.html
git commit -m "utm passthrough naar CLP chat-cta links"
git push -u origin utm-passthrough
```

PR mergen → wacht op deploy.

### 14.2 Verifieer

```bash
curl -sL "https://<marketing-domain>/?cb=$(uuidgen)" | grep "PASSTHROUGH"
```

Moet het script tonen.

### 14.3 CLP-deploys

Beide PRs (ads-pixels-install + linkedin-conversion-ids) moeten gemerged en gedeployed zijn.

Verifieer:

```bash
RAND=$(uuidgen)
echo "=== Meta + LinkedIn tags live? ==="
curl -sL "https://<CLP-domain>/?bust=$RAND" --compressed | grep -oE "(linkedin_partner_id|fbq.*init|facebook-domain-verif)" | sort -u

echo "=== Bundle has source-routing? ==="
BUNDLE=$(curl -sL "https://<CLP-domain>/?bust=$RAND" --compressed | grep -oE "index-[a-zA-Z0-9_-]+\.js" | head -1)
curl -sL "https://<CLP-domain>/assets/$BUNDLE" | grep -oE "(clp-ad-source-v1|<META_PIXEL_ID>|<LINKEDIN_PARTNER_ID>)" | sort -u
```

Beide checks moeten resultaten geven.

---

## 15. Stap 13 — End-to-end verification

Doe deze test BEFORE you turn on real ads. Bewijst dat de hele pipeline werkt.

### 15.1 Browser-test voor Meta-source

Open incognito tab → ga naar:

```
https://<marketing-domain>/?utm_source=meta&utm_campaign=funnel-test
```

In browser console (F12):

```js
// Check chat-CTA hrefs gerewrited
Array.from(document.querySelectorAll('a[href*="<CLP-domain>"]'))
  .map(a => Object.fromEntries(new URL(a.href).searchParams))
```

Verwacht: array met objecten die `utm_source: "meta"` bevatten.

Klik een chat-CTA → land je op CLP met UTM params in URL.

In CLP console:

```js
({
  source: sessionStorage.getItem('clp-ad-source-v1'),
  metaLoaded: typeof fbq === 'function',
  linkedInLoaded: typeof lintrk === 'function'
})
```

Verwacht: `{ source: "meta", metaLoaded: true, linkedInLoaded: true }`.

### 15.2 Browser-test voor LinkedIn-source

Sluit tab, open nieuwe incognito tab → ga naar:

```
https://<marketing-domain>/?utm_source=linkedin&utm_campaign=funnel-test
```

Zelfde checks → verwacht: `{ source: "linkedin", ... }`.

### 15.3 Pixel-fire test

In CLP console (met source=linkedin uit vorige stap):

```js
window.lintrk('track', { conversion_id: <LI_CONV_LEAD> })
window.lintrk('track', { conversion_id: <LI_CONV_FULL_LEAD> })
```

In DevTools Network tab → filter op `linkedin` → zie 4 requests:
- 2x `attribution_trigger` (200 OK)
- 2x `collect` (200 OK)

Dit bewijst dat LinkedIn de Conversion IDs ontvangt. LinkedIn verifieert de conversies in 5-10 min — daarna status "Geverifieerd" in Campaign Manager.

### 15.4 Real-lead test (optioneel, creëert echte data)

Doorloop de complete chat-flow met:
- Naam: `Claude Testlead` (of vergelijkbaar duidelijk-test)
- Email: `claude-test-<project>@repp.nl`
- Phone: `0600000000`

Verifieer dat lead landt in:
- Supabase `clp_leads` table
- Slack-channel
- Brevo list `<X>`
- Meta Events Manager (alleen bij utm_source=meta)
- LinkedIn Campaign Manager Conversies (alleen bij utm_source=linkedin)

**Belangrijk**: ruim test-lead op na verificatie:

```sql
delete from clp_leads where email = 'claude-test-<project>@repp.nl';
```

```bash
curl -X DELETE -H "api-key: <BREVO_API_KEY>" \
  "https://api.brevo.com/v3/contacts/claude-test-<project>@repp.nl"
```

---

## 16. Stap 14 — Campagnes aanmaken

### 16.1 Meta-campagne

In Meta Ads Manager:

| Veld | Waarde |
|---|---|
| Campaign objective | Leads |
| Performance goal | Maximise number of conversions |
| Dataset | CLP Conversion |
| Conversion event | `<Project> — Lead` (NIET generieke "Lead") |
| Cost per result goal | None (later bijstellen) |
| Attribution model | Standard |
| Destination URL | `https://<marketing-domain>/?utm_source=meta` |
| Budget | €15-25/dag voor start |

### 16.2 LinkedIn-campagne

In LinkedIn Campaign Manager:

| Veld | Waarde |
|---|---|
| Objective | Lead generation |
| Conversion to optimize | `<Project> — Lead` (de €25 conversion) |
| Audience | Job titles in NL/relevante gemeentes |
| Destination URL | `https://<marketing-domain>/?utm_source=linkedin` |
| Budget | €25-50/dag (LinkedIn duurder dan Meta) |

### 16.3 Auto-tag aanlaten

In beide platforms: laat de "Auto-tag URL parameters" optie **aan**. Dat zorgt voor extra vangnet via `fbclid` / `li_fat_id` mocht UTM ooit ontbreken op een ad.

### 16.4 Learning phase

Eerste 24-72u: hoge CPL, niet schrikken. Algoritme leert. Niet pauseren/wijzigen voor 1 week tenzij iets fundamenteel fout is.

---

## 17. Bijlage A — Troubleshooting

### "Vercel deploy failed: Git author X must have access"

**Fix**: Set lokale git config met je Vercel-authorized email:

```bash
cd /Users/flip/<repo>
git config user.email "jesse+github@repp.nl"
git config user.name "Flip Jacobs"
```

Daarna nieuwe commit pushen. Voor PRs waar de bad-author commit al op zit: gebruik "Squash and merge" — de squash-commit krijgt jou als author en deployt wel.

### "LinkedIn 'Code kopiëren' button geeft error"

**Fix**: Gebruik het email-veld bovenaan de Insight Tag pagina — typ je eigen email, LinkedIn mailt de snippet naar je inbox in plain-text.

### "AEM-config niet vindbaar in Meta UI"

**Fix**: Niet nodig. Meta heeft AEM auto-managed voor veel accounts in 2025-2026. Skip 'm zonder zorgen.

### "Custom Conversion Inactive met 0 events"

**Fix**: Normaal. Custom Conversions zijn forward-looking: ze tellen pas vanaf het moment dat ze zijn aangemaakt. Wacht op eerste echte event matching de URL-rule.

### "FullLeadComplete niet selecteerbaar in Event-dropdown"

**Fix**: Event moet 1× gefired zijn in productie voor 't beschikbaar wordt. Doe een self-test door de complete flow met je echte productie-URL.

### "Vercel deploy slaagt maar live site is oude versie"

**Fix**: Twee oorzaken:
1. Deploy was Preview, niet Production. Klik in Vercel → Deployment → "Promote to Production".
2. CDN cache. In Vercel → Deployment → ⋯ → Redeploy ZONDER "Use existing build cache".

### "Edge function deployt niet bij merge"

**Fix**: Supabase edge functions deployen niet automatisch bij GitHub merge. Doe handmatig:

```bash
supabase functions deploy clp-leads-upsert
```

of via Supabase MCP `deploy_edge_function`.

### "Cross-domain UTM verloren na klik chat-CTA"

**Fix**: Check of UTM-passthrough script op marketing-site actief is:

```bash
curl -sL "https://<marketing>/?utm_source=meta" | grep "PASSTHROUGH"
```

Moet het script tonen. Zo niet: script-tag niet correct geïnjecteerd op alle pagina's.

### "Bundle bevat de adSource code niet"

**Fix**: Import-statement vergeten in App.jsx:

```jsx
import {
  captureAdSource,
  shouldFireMetaConversion,
  shouldFireLinkedInConversion,
} from './lib/adSource.js'
```

### "Beide platforms tellen elke conversion (geen routing)"

**Fix**: 
- Check of `captureAdSource()` daadwerkelijk aangeroepen wordt in mount-effect
- Check of `shouldFireMetaConversion()` en `shouldFireLinkedInConversion()` om de fires heen staan
- Check sessionStorage in browser: `sessionStorage.getItem('clp-ad-source-v1')` moet bron retourneren

---

## 18. Bijlage B — Compleet code-overzicht

Per file, exact wat erin moet:

### `index.html` (CLP)

```
<head>
  ...
  <meta name="facebook-domain-verification" content="<TOKEN>" />
  <title>...</title>
  ...
  <!-- Meta Pixel script -->
  <script>!function(f,b,e,v,n,t,s){...}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','<META_PIXEL_ID>');fbq('track','PageView');</script>
  
  <!-- LinkedIn Insight Tag scripts (2 stuks) -->
  <script>_linkedin_partner_id = "<LI_PARTNER_ID>"; ...</script>
  <script>(function(l){...})(window.lintrk);</script>
</head>
<body>
  <noscript><img src="https://www.facebook.com/tr?id=<META_PIXEL_ID>&ev=PageView&noscript=1" /></noscript>
  <noscript><img src="https://px.ads.linkedin.com/collect/?pid=<LI_PARTNER_ID>&fmt=gif" /></noscript>
  ...
</body>
```

### `src/lib/adSource.js` (CLP)

Zie volledige inhoud in [Stap 5](#7-stap-5--clp-frontend-adsourcejs).

### `src/App.jsx` (CLP) - additions

- Import `captureAdSource` + `shouldFireXConversion` from `./lib/adSource.js`
- Constants: `META_PIXEL_PROJECT`, `LI_CONV_LEAD`, `LI_CONV_FULL_LEAD`
- Helpers: `fireMetaPixelEvent`, `fireMetaLead`, `fireMetaContact`, `fireMetaCustom`, `fireLinkedInConversion`
- In mount-effect: `captureAdSource()` direct na `logSessionStartConsent()`
- Conversion-fires gegated: `if (shouldFireMetaConversion()) { ... }` etc.

### `index.html` (marketing-site)

UTM-passthrough script vlak voor `</body>` — zie [Stap 7](#9-stap-7--marketing-site-utm-passthrough-script).

### `supabase/functions/clp-leads-upsert/brevo.ts`

Zie volledige inhoud in [Stap 8](#10-stap-8--supabase-edge-function-brevo-wiring).

### `supabase/functions/clp-leads-upsert/index.ts` - additions

- Import: `import { upsertBrevoContact } from './brevo.ts'`
- Naast `notifyNewLead` call: vergelijkbare gate met `BREVO_TENANTS` set

---

## 19. Bijlage C — Commands cheatsheet

### Setup

```bash
# Clone + config (per repo)
cd /Users/flip
git clone https://reppenweetje@github.com/reppenweetje/<repo>.git
cd <repo>
git config user.email "jesse+github@repp.nl"
git config user.name "Flip Jacobs"
npm install
npm run build
```

### Per PR

```bash
# Branch maken
git checkout main
git pull
git checkout -b <branch-name>

# Edits maken...

# Verifiëren
npm run build

# Commit + push
git add <files>
git commit -m "<message>"
git push -u origin <branch-name>
```

### Live verificatie

```bash
RAND=$(uuidgen)

# CLP Pixel + tags
curl -sL "https://<CLP>/?cb=$RAND" --compressed | grep -oE "(linkedin_partner_id|fbq.*init|facebook-domain-verif)"

# Marketing UTM passthrough
curl -sL "https://<marketing>/?cb=$RAND" --compressed | grep "PASSTHROUGH"

# Bundle source-routing
BUNDLE=$(curl -sL "https://<CLP>/?cb=$RAND" --compressed | grep -oE "index-[a-zA-Z0-9_-]+\.js" | head -1)
curl -sL "https://<CLP>/assets/$BUNDLE" | grep -oE "clp-ad-source-v1"

# Brevo contact check
curl -s -H "api-key: <KEY>" "https://api.brevo.com/v3/contacts/lists/<LIST_ID>/contacts?limit=5"

# Supabase test-lead cleanup
# (via Supabase SQL editor of MCP execute_sql)
delete from clp_leads where email like '%claude-test%';
```

### Edge function deploy

```bash
# Via Supabase CLI (lokaal)
supabase functions deploy clp-leads-upsert

# Of via Supabase MCP (programmatic)
# Tool: deploy_edge_function
```

---

## 20. Bijlage D — AI-prompt template

Voor volgende projecten — kopieer en vul in:

```
Set up complete Meta + LinkedIn ads-attribution stack voor nieuw REPP CLP-project. Volg `/Users/flip/CLP/docs/ADS_PIXEL_PLAYBOOK.md` als referentie.

VARIABELEN:
- Project slug:           <bv "borculo">
- CLP repo URL:           <bv "https://github.com/reppenweetje/clp-borculo">
- Marketing repo URL:     <bv "https://github.com/reppenweetje/borculo-uitgifte.com">
- CLP domain:             <bv "borculo.clp.repp.nl">
- Marketing domain:       <bv "www.borculo-uitgifte.nl">
- Meta Pixel ID:          <bv "2003219213613252" of nieuw>
- LinkedIn Partner ID:    <bv "9404796" of nieuw uit Campaign Manager>
- Brevo List ID:          <numeriek, bv "293">
- Brevo API key:          (zet zelf in Supabase secrets, niet in chat)

VOER UIT:

1. Clone beide repos lokaal + zet git config (user.email = jesse+github@repp.nl)
2. CLP repo branch ads-pixels-install:
   - index.html: Meta Pixel snippet, LinkedIn Insight Tag, facebook-domain-verification meta-tag, noscript fallbacks in body
   - Nieuw src/lib/adSource.js (copy van playbook)
   - src/App.jsx: import adSource helpers, fireMetaPixelEvent/Lead/Contact/Custom + fireLinkedInConversion helpers, LI_CONV_LEAD/FULL_LEAD null, captureAdSource() in mount-effect, alle conversion-fires gewrapped met shouldFireXConversion()
   - content_category = '<project-slug>' op alle Meta events
   - Build, commit, push, geef PR-URL terug

3. Marketing repo branch utm-passthrough:
   - index.html: UTM-passthrough script vóór </body>, gericht op <CLP-domain>
   - Commit, push, geef PR-URL terug

4. Supabase edge function clp-leads-upsert branch brevo-<project>:
   - Nieuw supabase/functions/clp-leads-upsert/brevo.ts (copy van playbook)
   - index.ts: import upsertBrevoContact, call naast notifyNewLead, BREVO_TENANTS = {'<project>'}
   - Deploy via Supabase MCP (deploy_edge_function)

5. Geef gebruiker checklist voor platform-UI stappen:
   - Meta: 3 Custom Conversions (Lead/FullLead/Contact) met URL contains <CLP-domain>
   - Meta: domain verification (token in index.html plakken)
   - LinkedIn: 2 Insight Tag-conversies methode Evenementspecifiek, stuur Conversion IDs terug
   - Supabase secrets BREVO_API_KEY + BREVO_LIST_ID

6. Na LinkedIn Conversion IDs ontvangen: mini-PR linkedin-conversion-ids die LI_CONV_LEAD en LI_CONV_FULL_LEAD vult

7. End-to-end verification via Chrome MCP:
   - Navigate ?utm_source=meta → check chat-CTA hrefs → click → check sessionStorage source = 'meta'
   - Idem voor utm_source=linkedin
   - Fire test conversions manueel via window.lintrk en verifieer 200 OK responses

GOTCHAS:
- Vercel git author check: gebruik jesse+github@repp.nl
- LinkedIn UI naming verwarrend: Manuele conversies → Evenementspecifiek
- AEM-config niet nodig in 2026: skip Meta AEM-stap
- Edge function deployt niet auto bij merge: handmatig deployen

DELIVERABLES:
- 4 PRs aangemaakt + gemerged (ads-pixels-install, utm-passthrough, brevo-<project>, linkedin-conversion-ids)
- Edge function gedeployed
- End-to-end verification gepasseerd
- Klaar voor ad-launch
```

---

## Versie + onderhoud

**Versie**: 1.0 (2026-05-28)  
**Gebaseerd op**: REPP uitgifte.com / clp-didamdesk setup, geslaagd op 2026-05-28  
**Volgende update**: zodra nieuwe platforms (TikTok, Reddit) toegevoegd worden of Meta/LinkedIn UI fundamenteel verandert

### Bij volgend project — wijzigingen?

Als je dit doc gebruikt voor een volgend project en je loopt tegen iets aan dat hier niet staat:

1. Voeg toe aan [Bijlage A — Troubleshooting](#17-bijlage-a--troubleshooting)
2. Update versie + datum onderaan
3. Push naar `main` van CLP-repo zodat alle toekomstige projecten 't ook hebben

### Heb je een nieuw ad-platform toegevoegd (bv. TikTok)?

Update:
1. `index.html` — TikTok Pixel snippet
2. `src/lib/adSource.js` — detectie voor `ttclid`, `utm_source=tiktok`, etc; nieuwe `shouldFireTikTokConversion()` helper
3. `src/App.jsx` — `fireTikTokConversion` helper + wiring in alle conversion-fire callsites
4. Update marketing-site UTM-passthrough script: voeg `ttclid` aan PASSTHROUGH-array
5. Document hier in Bijlage A onder eigen sectie

Patroon is uitbreidbaar — elke nieuwe platform = ~30 min werk.
