# Hand-off naar sales-team

> Vul de placeholders in met jouw project-specifieke gegevens en stuur dit document naar de makelaar of sales-medewerker die de leads gaat opvolgen.

## Wat is dit

`{{PROJECT_NAAM}}` is een Conversational Landing Page (CLP) op `{{LIVE_URL}}`. Bezoekers vanaf social ads (Meta, Insta, LinkedIn) doorlopen een korte chat-flow waarin we hun voorkeuren ophalen en hen voorzien van de relevante brochure plus prijzen.

In de praktijk: een mobile-first chat-thread met chips als suggested-replies. Geen klassiek formulier, geen lange landingspagina. De bezoeker krijgt direct relevante info, en de sales-medewerker krijgt een gekwalificeerde lead inclusief gedrag-context.

## Live URLs

- **Productie**: `https://{{LIVE_URL}}`
- **Admin dashboard**: `https://{{LIVE_URL}}/admin` (achter password)
- **Privacy**: `https://{{LIVE_URL}}/privacy.html`
- **Architectuur (technische uitleg)**: `https://{{LIVE_URL}}/architectuur.html`

## Hoe leads bij jou komen

### 1. Slack-notificatie (direct)

Zodra een bezoeker expliciet om callback vraagt en een 06-nummer achterlaat, krijg je binnen seconden een bericht in `#{{SLACK_CHANNEL}}`. Daarin staat:

- Voornaam plus telefoonnummer (clickable, opent direct phone-app of WhatsApp)
- Persona (eigen-gebruiker, belegger, ...)
- Wat ze zoeken: intent, m², timeline
- Score + top 3 koop-signalen
- Tijd-context (binnen kantooruren / avond / weekend)
- Email + sessie-ID voor terugzoeken

**Verwachte response-tijd**: binnen kantooruren (09-17, ma-vr) zo snel mogelijk vandaag, anders ochtend van eerstvolgende werkdag.

### 2. Supabase + Brevo (achtergrond)

Naast de Slack-ping wordt elke afgeronde chat met email-invoer automatisch:
- Opgeslagen in een centrale Supabase tabel (`{{SUPABASE_PROJECT}}` → `public.leads`)
- Gesynced naar Brevo voor email-marketing (lijst-ID `{{BREVO_LIST_ID}}`)

Heb je toegang tot Supabase nodig? Vraag aan `{{TECH_CONTACT}}`.

### 3. Email naar de bezoeker (zelf)

Bezoekers die in de chat hun email achterlaten, krijgen vanuit Brevo automatisch de brochure plus een korte intro-mail. Geen actie van jou nodig.

## Wat de bezoeker over jou ziet

- **Chat-persona**: `{{BOT_NAAM}}` (de "ik" in de bot-bubbles)
- **Verkopend makelaar**: `{{ORGANISATIE}}`
- **Telefoonnummer**: `{{TELEFOON}}` (in header-icoon en in WarmHandoffBubble)
- **WhatsApp-nummer**: `{{WHATSAPP_NUMMER}}` (header-icoon plus prefilled bericht)

> **Tip**: het WhatsApp-bericht dat een bezoeker stuurt bevat al een korte samenvatting van hun voorkeuren (persona + m² + timeline + intent). Je hoeft die info niet opnieuw uit te vragen.

## Wat een gekwalificeerde lead inhoudt

In de Slack-notificatie zie je een **score** (0 a 100+). Die geeft kort aan hoe ver de bezoeker in het beslissings-proces zit:

- **Score 50+ plus callback-aanvraag**: hot, direct opvolgen
- **Score 25-50**: warm, eventuele opvolging als deel van email-cadence
- **Score onder 25**: cold, alleen email-cadence

Plus de top 3 signalen tonen welk gedrag de score heeft gedreven (bv. "Rendement berekend, 06 gedeeld, Meerdere units bekeken").

## Hoe je unit-status update

Bezoekers zien op de site-plan welke units beschikbaar of verkocht zijn. Als er iets verkoopt of reserveert, geef dit door aan `{{TECH_CONTACT}}` of update zelf:

1. Open `src/data/project.js` in de repo
2. Zoek `project.sitePlan.rows[].units[].state`
3. Wijzig naar `available`, `sold`, `sold_ov` (verkocht onder voorbehoud), `reserved`, of `coming_soon`
4. Commit + push naar main, Vercel auto-deployt binnen 1 minuut

## Privacy + GDPR

- Bezoekers zien voor email-invoer een korte privacy-disclaimer plus link naar `/privacy.html`
- Consent wordt per sessie gelogd (datum, scope, privacy-statement-versie) in `public.consent_log`
- Voor uitschrijf-verzoeken: gebruik Brevo's standaard unsubscribe-flow plus verwijder de rij uit Supabase

## Veelgestelde vragen

**De chat hangt of gaat te snel.** Refresh werkt altijd, de chat-progress wordt lokaal bewaard (localStorage `clp-state-v5`).

**Een lead heeft tweemaal contact opgenomen.** Slack dedupet per sessionId via localStorage zodat dezelfde bezoeker maximaal 1 ping geeft. Een tweede ping betekent dat 'ie in een andere browser of incognito heeft gewerkt.

**De brochure download niet.** Check of `public/brochure.pdf` aanwezig is en niet boven de 15MB. Vercel cached statics 1 jaar, dus bij update een commit triggeren met een nieuwe filename of cache-bust query.

**Een bezoeker wil zijn data verwijderen.** Stuur een DELETE-verzoek met sessie-ID naar `{{TECH_CONTACT}}` of doe het zelf in Supabase met:
```sql
DELETE FROM public.consent_log WHERE session_id = 'xxx';
DELETE FROM public.leads        WHERE session_id = 'xxx';
```

## Contact

| Wie | Wat | Bereikbaar |
|---|---|---|
| `{{TECH_CONTACT}}` | Technische vragen, bug-meldingen, feature-requests | `{{TECH_CONTACT_KANAAL}}` |
| `{{MARKETING_CONTACT}}` | Brevo, ads, copy-wijzigingen | `{{MARKETING_CONTACT_KANAAL}}` |
| `{{ESCALATIE_CONTACT}}` | Iets is stuk in productie | `{{ESCALATIE_CONTACT_KANAAL}}` |

---

> Laatste update: `{{DATUM}}`. Versie van de CLP-template waarop dit project draait: `{{TEMPLATE_VERSIE}}`.
