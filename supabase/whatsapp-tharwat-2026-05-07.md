# WhatsApp-bericht voor Tharwat — 2026-05-07

Doorstuurbare versie. Kopieer en plak in WhatsApp. Iets korter dan de README, en in jouw stem.

---

Hi Tharwat,

Dank voor de uitgebreide review en notes — heel waardevol om te lezen dat de WhatsApp-bot al via service-role draait en de migration-pad clean is. We zijn aan onze kant ook bezig.

Wat we vandaag hebben gedaan:
1. Project URL + anon key verwerkt in onze Vercel-deploy. Anon key staat als env-var, niet hardcoded.
2. Frontend client (lead-upsert + consent log) wired in de chat — maar **achter een feature-flag** (`VITE_SUPABASE_ENABLED=false`). Dus er gaat NU nog niets naar Supabase. Bij go-live flippen we de flag in Vercel zonder rebuild.
3. Health-check tegen het project gedaan: `auth/v1/health` geeft 200, anon key werkt. Edge Function endpoint geeft 404 zoals verwacht (jij moet 'm nog deployen).
4. Onze README + runbook bijgewerkt met de baseline counts die jij gaf (leads 393 etc.) en de Phase 2 wachtmoment-sectie zodat onze rollout op jouw signaal aanhaakt.

Voordat we Fase 1 (migrations + RLS) kunnen starten heb ik nog een paar antwoorden van je nodig:

1. **CRM-frontend**: praat de bestaande CRM met de anon key tegen `public.leads`? Zo ja, op welke tabellen leest 'ie? Onze `recommended_rls.sql` blokkeert anon-toegang tot leads — als de CRM via anon leest, breken we 'em. Dan moeten we de policy-shape aanpassen.

2. **Staging-omgeving**: bestaat er een tweede Supabase-project (staging/preview) waar we eerst de migrations + RLS kunnen testen? Of doen we direct op productie? Mijn voorkeur is staging als die er is.

3. **Backup**: kun je vóór de migration een full pg_dump maken (minimaal `leads` + `consent_log`, liefst hele DB) en versleuteld bewaren? Eigen rollback-zekerheid voor onze kant.

4. **Phase 2 timing**: wat is een realistische datum waarop je Phase 2 als groen verklaart? Onze rollout haakt daarop aan.

5. **Bredere RLS-gap**: je noemt 5 tabellen zonder RLS (leads, chatlog, projects, outbound_settings, escalations). Onze CLP-rollout raakt alleen leads + consent_log. Wie pakt na CLP-launch de andere drie aan? Lijkt me een follow-up sprint, maar wel goed dat we 't markeren.

Service-role key komt zoals afgesproken pas bij de final deployment step — geen druk daarop tot 1-4 groen zijn.

Laat maar weten,
Jann
