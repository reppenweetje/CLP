# WhatsApp briefing for Tharwat — 2026-05-07 (rev with Brevo)

Forward-ready text. Copy and paste into WhatsApp.

---

Hi Tharwat,

Great that you've cleared us and the backups are running. For now we just want to land leads + tags into Supabase **and** mirror them into Brevo (our marketing-email platform). RLS rollout we'll do later, separately, after the CRM-impact check.

I've attached a zip with everything you need (`clp-supabase-handoff-2026-05-07.zip`). Inside the `supabase/` folder you'll find migrations, the Edge Function source (now also includes `brevo.ts`), policies, rollback, and the full runbook in `README.md`.

Three things on your side:

**1. Apply migrations** (additive, no breakage — `leads` count must stay at 393, `consent_log` is new):
```
psql "$DATABASE_URL" -f supabase/migrations/20260506120000_extend_leads.sql
psql "$DATABASE_URL" -f supabase/migrations/20260506120100_create_consent_log.sql
```

**2. Deploy the Edge Function** (service-role key gets auto-injected by Supabase Edge runtime — you don't need to share it):
```
supabase link --project-ref vgdwgjthvltucabqfysd
supabase functions deploy lead-upsert
```

**3. Set secrets** (CORS allowlist + Brevo credentials):
```
supabase secrets set \
  ALLOWED_ORIGINS="https://dehofman.clp.repp.nl,https://clp-xi-tan.vercel.app" \
  BREVO_API_KEY="<I'll send the value in a separate message>" \
  BREVO_LIST_ID="<I'll send this once the Brevo list is created>"
```

Slack is intentionally NOT set in this round — our existing Vercel `/api/slack-hot.js` keeps doing the Hothothot pings. Slack-routing consolidation is a separate later step.

Smoke-test runbook is in `supabase/README.md` under "Edge Function deployment → Smoke test". One curl-call with `clp_smoketest` as source-tag, then SQL cleanup.

Once that's green, we flip `VITE_SUPABASE_ENABLED=true` in Vercel on our side. RLS rollout later, together, when you've confirmed the CRM impact.

Let me know.
Jann

---

## Internal notes (don't forward)

- Brevo API key is `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` — stuur in een tweede WhatsApp-bericht naar Tharwat zodra je het bovenstaande hebt gestuurd, met een korte note "Here's the BREVO_API_KEY value — please don't paste it in any logs or commit it anywhere".
- BREVO_LIST_ID krijgt Tharwat zodra de lijst is aangemaakt in Brevo. Tot die tijd kan hij `BREVO_LIST_ID` weglaten — de Edge Function logt dan alleen contact zonder lijst-koppeling. Liever wel meteen de juiste ID erin.
- Onze Vercel-deploy van vandaag bevat de wiring achter `VITE_SUPABASE_ENABLED=false`. Bij Tharwat's groen op de smoke-test flippen we 'em.
