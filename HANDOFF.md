# Hand-off naar sales-team

> Stuur dit document naar de makelaar of sales-medewerker die de De Hofman-leads gaat opvolgen.

## Wat is dit

**De Hofman** is een Conversational Landing Page (CLP) op `dehofman.clp.repp.nl`. Bezoekers vanaf social ads (Meta, Insta, LinkedIn) doorlopen een korte chat-flow waarin we hun voorkeuren ophalen en hen voorzien van de relevante brochure plus prijzen.

In de praktijk: een mobile-first chat-thread met chips als suggested-replies. Geen klassiek formulier, geen lange landingspagina. De bezoeker krijgt direct relevante info, en de sales-medewerker krijgt een gekwalificeerde lead inclusief gedrag-context.

## Live URLs

- **Productie**: https://dehofman.clp.repp.nl
- **Admin dashboard**: https://dehofman.clp.repp.nl/admin (achter password, vraag bij Jann)
- **Privacy**: https://dehofman.clp.repp.nl/privacy.html
- **Architectuur** (technische uitleg): https://dehofman.clp.repp.nl/architectuur.html
- **Alias**: https://clp-xi-tan.vercel.app (Vercel default URL, dezelfde build)

## Hoe leads bij jou komen

### 1. Slack-notificatie (direct)

Zodra een bezoeker expliciet op de **"Laat de makelaar mij bellen"** chip drukt en een 06-nummer achterlaat, krijg je binnen seconden een bericht in `#hot-clp-leads`. Daarin staat:

- Voornaam plus telefoonnummer (clickable, opent direct phone-app of WhatsApp)
- Persona (eigen-gebruiker, belegger, beide, onbekend)
- Wat ze zoeken: intent, m², timeline
- Score plus top 3 koop-signalen (in mensentaal: "Rendement berekend", "06 gedeeld", "Meerdere units bekeken")
- Tijd-context (binnen kantooruren / avond / weekend) zodat je weet hoe acuut
- Drie action-buttons in Slack: 📞 Bel direct, 💬 WhatsApp, ✉️ Mail
- Email plus afgekorte sessie-ID voor terugzoeken in Supabase

**Verwachte response-tijd**: binnen kantooruren (09-17, ma-vr) zo snel mogelijk vandaag, anders ochtend van eerstvolgende werkdag.

> **Belangrijk**: alleen expliciete callback-aanvragen geven een Slack-ping. Bezoekers die alleen browsen of de brochure aanvragen, krijg je niet als pop-up. Die landen wel in Supabase plus Brevo voor email-cadence.

### 2. Supabase + Brevo (achtergrond)

Naast de Slack-ping wordt elke afgeronde chat met email-invoer automatisch:
- Opgeslagen in een centrale Supabase-tabel `public.leads` (project-ref `vgdwgjthvltucabqfysd`, mogelijk migreert dit nog naar een ander project)
- Gesynced naar Brevo voor email-marketing (de lijst-ID staat in de Edge Function secrets bij Tharwat)

Heb je toegang nodig tot Supabase of Brevo? Vraag aan Jann.

**Brevo-veld waar je 06 vindt**: standaard `SMS`-attribuut, plus fallback `WHATSAPP` custom attribuut (omdat Brevo soms SMS afkeurt door uniqueness met andere contacten — dan landt 't 06 in WHATSAPP). Voeg WHATSAPP toe aan jouw Brevo-kolom view.

### 3. Email naar de bezoeker (automatisch)

Bezoekers die in de chat hun email achterlaten, krijgen vanuit Brevo automatisch de brochure plus een korte intro-mail. Geen actie van jou nodig.

## Wat de bezoeker over jou ziet

- **Chat-persona**: Jesse (de "ik" in de bot-bubbles)
- **Verkopend makelaar**: REPP
- **Telefoonnummer**: 020-2610080 (in header-icoon plus in WarmHandoffBubble bel-knop)
- **WhatsApp-nummer**: +31 6 16 07 94 28 (header-icoon plus prefilled bericht)

> **Tip**: het WhatsApp-bericht dat een bezoeker stuurt bevat al een korte samenvatting van hun voorkeuren (persona + m² + timeline + intent). Je hoeft die info niet opnieuw uit te vragen.

## Wat een gekwalificeerde lead inhoudt

In de Slack-notificatie zie je een **score** (0 tot 100+). Die geeft kort aan hoe ver de bezoeker in het beslissings-proces zit:

- **Score 50+ plus callback-aanvraag**: hot, direct opvolgen
- **Score 25-50**: warm, eventuele opvolging als deel van email-cadence
- **Score onder 25**: cold, alleen email-cadence

Plus de top 3 signalen tonen welk gedrag de score heeft gedreven, bijvoorbeeld "Rendement berekend, 06 gedeeld, Meerdere units bekeken".

## Hoe je unit-status update

Bezoekers zien op de site-plan welke units beschikbaar of verkocht zijn. Als er iets verkoopt of reserveert, geef dit door aan Jann of update zelf:

1. Open `src/data/project.js` in de GitHub-repo (`reppenweetje/CLP`)
2. Zoek `project.sitePlan.rows[].units[].state`
3. Wijzig naar `available`, `sold`, `sold_ov` (verkocht onder voorbehoud), `reserved`, of `coming_soon`
4. Commit + push naar main, Vercel auto-deployt binnen 1 minuut

## Privacy + GDPR

- Bezoekers zien voor email-invoer een korte privacy-disclaimer plus link naar `/privacy.html`
- Consent wordt per sessie gelogd (datum, scope, privacy-statement-versie) in `public.consent_log` (Supabase)
- Voor uitschrijf-verzoeken: gebruik Brevo's standaard unsubscribe-flow plus verwijder de rij uit Supabase
- Privacy-statement-versie momenteel: `2026-05-07b`

## Veelgestelde vragen

**De chat hangt of gaat te snel.** Refresh werkt altijd, de chat-progress wordt lokaal bewaard (localStorage `clp-state-v5`).

**Een lead heeft tweemaal contact opgenomen.** Slack dedupet per sessionId via localStorage zodat dezelfde bezoeker maximaal 1 ping geeft. Een tweede ping betekent dat 'ie in een andere browser of incognito heeft gewerkt.

**De brochure download niet.** Check of `public/brochure.pdf` aanwezig is en niet boven de 15MB. Vercel cached statics 1 jaar, dus bij update een commit met een nieuwe filename of cache-bust query.

**Een bezoeker wil zijn data verwijderen.** Stuur een DELETE-verzoek met sessie-ID naar Jann of doe het zelf in Supabase met:

```sql
DELETE FROM public.consent_log WHERE session_id = 'xxx';
DELETE FROM public.leads        WHERE session_id = 'xxx';
```

**Een bezoeker vroeg om financieringsscan via Credion.** Dat wordt automatisch via een Zapier-webhook doorgezet naar Credion. De webhook bevat naam, email, 06, intent, plus de actuele calc-slider-waardes (maandlast of rendement). Geen extra actie van jou nodig.

## Contact

| Wie | Waarvoor | Bereikbaar |
|---|---|---|
| **Jann** | Technische vragen, bugs, feature-requests, productie-issues | WhatsApp +31 6 16 07 94 28 of mail jann@repp.nl |
| **Tharwat** | Supabase backend, Brevo secrets, Edge Function | Via Jann |
| **REPP marketing** | Brevo email-templates, ads, copy-wijzigingen | Via Jann |

---

> Laatste update: 12 mei 2026. Versie van de CLP-template waarop dit project draait: commit `9128c05`. Repo: https://github.com/reppenweetje/CLP
