# Nieuw CLP-project starten — kickoff prompt

> Paste de prompt hieronder in een Claude Code chat (in `/Users/flip/CLP/`)
> om een nieuw CLP-project op te zetten. Vervang `<SLUG>` en plak je
> ingevulde intake erachter.

---

## De prompt

```
Nieuw CLP-project: <SLUG>

Doe een end-to-end setup volgens de hybride architectuur uit
TEMPLATE_DUPLICATION_PLAN.md. Lees eerst dat plan + PROJECT_INTAKE.md
+ examples/intake-paveri.md voor referentie.

Werkstappen:
1. Branch: project/<slug>-setup
2. Maak src/data/projects/<slug>.js gebaseerd op de intake hieronder.
   Hou exact dezelfde shape aan als src/data/projects/dehofman.js.
3. Voeg <slug> toe aan loader-map in src/data/project.js.
4. Maak public/projects/<slug>/ folder. Plaats placeholder-assets
   (filenames matchend met intake) — werkelijke uploads volgen later.
5. Voeg Supabase rij toe aan project_meta tabel:
   INSERT INTO project_meta (source, display_name, city, ...)
   VALUES ('clp_<slug>', '...', '...', ...);
6. Voeg Supabase rij toe aan outbound_settings stage 1:
   INSERT INTO outbound_settings (project, stage, delay_days, delay_minutes, message_template)
   VALUES ('clp_<slug>', 1, 0, 1, '{ai_summary}');
7. Smoke-test lokaal:
   VITE_PROJECT_OVERRIDE=<slug>.clp.repp.nl npm run dev
   → doorloop chat-flow, geen errors, geen "undefined" in copy
   → npm run build is groen
8. Open PR met titel "project: nieuwe CLP voor <slug>".
9. Genereer EXTERNAL_SETUP_CHECKLIST_<SLUG>.md met de exacte extern-te-doen
   stappen voor Flip: Vercel custom-domain, DNS CNAME, Brevo PORTAL list,
   Slack channel + webhook, Plausible subdomain, Meta Pixel, n8n routing.

HARD REQUIREMENT: De Hofman moet 100% blijven werken. De wijzigingen
zijn additief (nieuwe project-file + loader-entry + Supabase rijen) en
mogen geen bestaande functionaliteit raken.

Stel mij ALLEEN vragen als de intake een veld leeg laat dat verplicht is
voor build-success. Anders begin direct.

INTAKE BEGINT HIER:
=========================================

[plak hier de volledig ingevulde PROJECT_INTAKE.md content]
```

---

## Wat Claude vervolgens doet

In 1 chat-sessie:

1. **Leest** plan + intake-template + voorbeeld
2. **Maakt** `src/data/projects/<slug>.js` met alle velden gevuld uit jouw intake
3. **Update** `src/data/project.js` loader-map met de nieuwe hostname
4. **Maakt** `public/projects/<slug>/` met placeholder-files (jij vervangt later met echte assets)
5. **Draait** SQL via Supabase MCP om `project_meta` + `outbound_settings` rijen toe te voegen
6. **Smoke-test** lokaal — bouwt + opent dev-server + doorloopt chat-flow virtueel
7. **Commit + push** branch + opent PR
8. **Genereert** `EXTERNAL_SETUP_CHECKLIST_<SLUG>.md` met de exacte stappen voor Flip
9. **Toont** de PR-URL en checklist-link

Tijd in chat: ~10-15 min. Daarna:

**Jouw acties na merge** (~30 min):
- Merge de PR → Vercel deployt
- Vercel dashboard: add domain `<slug>.clp.repp.nl`
- DNS: CNAME `<slug>.clp.repp.nl → cname.vercel-dns.com`
- Brevo: maak PORTAL_<SLUG> lijst, noteer list_id, voeg toe als Vercel env-var `BREVO_LIST_<SLUG>`
- Slack: maak `#hot-leads-<slug>` channel + webhook, voeg toe als `SLACK_WEBHOOK_<SLUG>`
- Plausible: voeg subdomein toe (of nieuwe site)
- Stuur Tharwat: "n8n routing voor nieuwe source `clp_<slug>` toevoegen"
- Upload echte assets naar `public/projects/<slug>/` (overschrijft placeholders) — kleine PR

Totaal: project live binnen 2-3 uur.

---

## Twee voorbeeld-scenarios

### Scenario 1: Minimale intake (alleen verplichte velden)
Werkt, maar Claude vraagt waarschijnlijk 3-5 vervolgvragen voor edge cases (bv. bedrijfsgebonden woning surcharge bij XXL, of welke icons in omgeving-highlights).

### Scenario 2: Complete intake (zoals examples/intake-paveri.md)
Zero vragen. Claude voert alles uit in één keer.

**Aanbeveling**: vul intake zo compleet mogelijk in. Tijd geïnvesteerd in intake = tijd bespaard in chat-sessie + minder kans op fouten.

---

## Foutmodi + recovery

| Probleem | Oplossing |
|---|---|
| Claude vraagt door over een veld | Beantwoord ad-hoc; vul retroactief in PROJECT_INTAKE.md voor volgende project |
| Smoke-test faalt (build error) | Claude debugt zelf, vraagt jou alleen bij design-keuze |
| Supabase MCP-call faalt | Claude rapporteert SQL aan jou voor handmatige uitvoering in dashboard |
| Vercel preview-deploy faalt | Logs in PR, Claude analyseert + fixt |
| Hostname-loader matched verkeerd in dev | Use `VITE_PROJECT_OVERRIDE` env-var om project te kiezen |

---

## Wat je NIET hoeft op te leveren

- GitHub repo aanmaken (gebruiken bestaande CLP-repo)
- Vercel project aanmaken (gebruiken bestaande clp-project)
- Code refactoren voor nieuw project (gedaan in Fase 1)
- Gemini-prompt aanpassen per project (geparameteriseerd via `project_meta` in Fase 2)

---

*Versie 1.0 — Geschreven op 2026-06-02. Iteratief verbeteren naarmate er meer CLPs op live komen.*
