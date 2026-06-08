import { notifyError } from './slack.ts'

// Brevo Contact upsert — pusht elke lead met email naar Brevo's Contacts API
// zodat de marketing-flow (lijsten, segmenten, mailings) op de actuele data
// kan werken. Best-effort: faalt zonder de Edge Function-response te blokkeren.
//
// Configure once in Supabase dashboard → Edge Functions → Secrets:
//   BREVO_API_KEY        — v3 API key uit Brevo (Settings → SMTP & API → API keys)
//   BREVO_LIST_ID        — numerieke ID van de CLP-lijst, bv. "286"
//   BREVO_LIST_ID_PORTAL — (optioneel) lijst-ID voor walk-in leads vanaf
//                          dehofman.nl (source = "dehofman_portal"). Als
//                          niet gezet vallen die leads in BREVO_LIST_ID.
//
// Brevo dedup't automatisch op `email`. We gebruiken `updateEnabled: true`
// zodat een tweede lead-upsert op dezelfde email een UPDATE wordt, niet
// een dubbele rij. Symmetrisch met onze Supabase upsert op (source, session_id).

interface BrevoLeadInput {
  email?: string | null
  first_name?: string | null
  phone?: string | null
  persona?: string | null
  intent_id?: string | null
  size_id?: string | null
  timeline_id?: string | null
  temperature?: string | null
  score?: number | null
  stage?: string | null
  source?: string | null
  followup?: string | null
  afhaak_reason?: string | null
  handoff_outcome?: string | null
  started_at?: string | null
  last_event_at?: string | null
  portal_token?: string | null
  attributes?: Record<string, unknown>
}

// Map een source-string naar de bijbehorende project-slug voor Brevo's
// PROJECT attribuut. PROJECT staat in Brevo waarschijnlijk als enum met
// vaste waarden ('dehofman', 'paveri' enz); een onbekende value laat
// Brevo de attribute stilletjes vallen, wat de segmentatie breekt.
//
// Explicit-map voor projecten met een non-standaard source-naam
// (bv. "Paveri BUnit" met spatie kun je niet via prefix-strip slug'en).
// Fallback-patterns onderaan voor legacy:
//   clp_<slug>     → '<slug>'    (CLP)
//   <slug>_*       → '<slug>'    (walk-in op portal, etc)
const SOURCE_TO_PROJECT_SLUG: Record<string, string> = {
  clp_dehofman:   'dehofman',
  'Paveri BUnit': 'paveri',
  // Zonder expliciete map zou "Elst BUnit" via de fallback "elst bunit"
  // (mét spatie) opleveren — ongeldig voor de Brevo PROJECT-enum. TODO:
  // Tharwat bevestigen of de Brevo-enum 'elster11' of een andere waarde is.
  'Elst BUnit':   'elster11',
}

function projectFromSource(source: string | null | undefined): string | undefined {
  if (!source) return undefined
  const explicit = SOURCE_TO_PROJECT_SLUG[source]
  if (explicit) return explicit
  const s = String(source).toLowerCase()
  if (s.startsWith('clp_')) return s.slice(4) || undefined
  const seg = s.split('_')[0]
  return seg || undefined
}

// Mappen NL 06 naar internationaal +316 formaat — Brevo verwacht E.164.
// Onbekende formaten skippen we (Brevo SMS-veld leeg laten) ipv te raden.
function normalizePhoneE164(phone: string | null | undefined): string | null {
  if (!phone) return null
  const trimmed = String(phone).trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  // 06 12 34 56 78  → 0612345678 → +31612345678
  if (digits.length === 10 && digits.startsWith('06')) return '+31' + digits.slice(1)
  // 316xxxxxxxx → +316xxxxxxxx
  if (digits.length === 11 && digits.startsWith('316')) return '+' + digits
  // Reeds in +316-vorm — accepteer als 11-digit body
  if (trimmed.startsWith('+31') && digits.length === 11 && digits.startsWith('316')) return trimmed
  return null
}

// Bouw het attributes-object dat Brevo verwacht. Lege/undefined velden
// laten we eruit zodat we bestaande Brevo-attributes niet onbedoeld
// overschrijven met null bij een vroege snapshot-push.
function buildAttributes(lead: BrevoLeadInput): Record<string, unknown> {
  const attrs: Record<string, unknown> = {}
  const set = (key: string, value: unknown) => {
    if (value === undefined || value === null) return
    if (typeof value === 'string' && value.length === 0) return
    attrs[key] = value
  }

  // Telefoonnummer naar twee plekken schrijven:
  //   SMS      = Brevo standaard attribuut, uniek per contact (handig voor
  //              SMS campaigns maar weigert insert als het nummer al
  //              ergens in Brevo bekend is, zie retry-logica onderaan)
  //   WHATSAPP = custom non-unique attribuut, landt ALTIJD. Sales kan hier
  //              op terugvallen om het 06 te vinden ook als SMS conflict
  //              gaf. Nederlandse markt heeft veel 06-overlap tussen
  //              WhatsApp-bot leads en CLP-bezoekers, dus dit is geen edge
  //              case maar het normale geval
  const phoneE164 = normalizePhoneE164(lead.phone)
  set('FIRSTNAME',       lead.first_name)
  set('SMS',             phoneE164)
  set('WHATSAPP',        phoneE164)
  set('PERSONA',         lead.persona)
  set('INTENT',          lead.intent_id)
  set('SIZE',            lead.size_id)
  set('TIMELINE',        lead.timeline_id)
  set('TEMPERATURE',     lead.temperature)
  set('STAGE',           lead.stage)
  // SCORE expliciet als number — Brevo accepteert number-types als de
  // attribute in hun dashboard ook als NUMBER is aangemaakt (anders
  // converteert Brevo 'em naar string, ook OK).
  if (typeof lead.score === 'number') set('SCORE', lead.score)
  set('SOURCE',          lead.source)
  // Project-attribute heet PROJECT in Brevo (niet CLP_PROJECT). Brevo dropt
  // unknown attributes stil. projectFromSource() mapt clp_dehofman /
  // dehofman_portal beide naar 'dehofman' zodat segmentatie consistent is.
  // Volgende attributes STAAN NIET in Brevo en worden ook stil gedropt
  // tenzij user ze toevoegt via dashboard:
  //   SCORE, FOLLOWUP, AFHAAK_REASON, HANDOFF_OUTCOME, STARTED_AT,
  //   RENT_RANGE, GATE_CONTEXT
  // We sturen ze toch (toekomstvast); na aanmaken in Brevo verschijnt
  // de data automatisch zonder code-wijziging.
  set('PROJECT',         projectFromSource(lead.source))
  set('FOLLOWUP',        lead.followup)
  set('AFHAAK_REASON',   lead.afhaak_reason)
  set('HANDOFF_OUTCOME', lead.handoff_outcome)
  set('STARTED_AT',      lead.started_at)
  set('LAST_EVENT_AT',   lead.last_event_at)
  set('PORTAL_TOKEN',    lead.portal_token)

  // Project-specifieke extras gaan via flat keys met CLP_-prefix om
  // botsing met andere Brevo-attributen te voorkomen.
  const extras = lead.attributes ?? {}
  if (extras && typeof extras === 'object') {
    if (typeof (extras as Record<string, unknown>).rentRange === 'string') {
      set('RENT_RANGE', (extras as Record<string, string>).rentRange)
    }
  }

  return attrs
}

async function postBrevoContact(body: Record<string, unknown>, apiKey: string): Promise<Response> {
  return fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
}

export async function upsertBrevoContact(lead: BrevoLeadInput, leadId?: string | null): Promise<void> {
  const apiKey = Deno.env.get('BREVO_API_KEY')
  if (!apiKey) {
    // Brevo niet geconfigureerd, stille skip. Zelfde patroon als Slack:
    // dev/preview-omgevingen hebben geen Brevo-key nodig.
    return
  }
  if (!lead.email) {
    // Email-gate consistent met Supabase- en Slack-paden.
    return
  }

  // Lijst-routing per source-string. Volgorde van checks:
  //   1. BREVO_LIST_ID_<NORMALIZED_SOURCE>  — per-project override
  //        bv. source="Paveri BUnit"  → BREVO_LIST_ID_PAVERI_BUNIT
  //        bv. source="clp_dehofman"  → BREVO_LIST_ID_CLP_DEHOFMAN
  //      Hiermee kan elk nieuw project zijn eigen lijst krijgen zonder
  //      code-wijziging — alleen een nieuwe env-var in Supabase secrets.
  //   2. BREVO_LIST_ID_RESERVATION   — dehofman_portal_reservation
  //   3. BREVO_LIST_ID_PORTAL        — overige dehofman_portal* walk-ins
  //   4. BREVO_LIST_ID               — algemene fallback (huidige Hofman default)
  //
  // Bestaande Brevo-contacten worden bij upsert ADDED aan deze lijst
  // (Brevo houdt ze ook in hun originele lijst — geen verlies). Sales
  // kan zo segmenteren op project.
  const sourceRaw = lead.source ?? ''
  // Env-safe key: uppercase + niet-alfanumeriek vervangen door underscore.
  // "Paveri BUnit" → "PAVERI_BUNIT"
  const envSafeSource = sourceRaw.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const perProjectList = envSafeSource ? Deno.env.get(`BREVO_LIST_ID_${envSafeSource}`) : undefined
  // Per-variant override: sommige projecten (PIER14) splitsen leads naar
  // aparte lijsten op basis van een sub-doelgroep (bv. nautisch vs niet-
  // nautisch). leadVariant komt uit lead.attributes, env-key is dan
  // BREVO_LIST_ID_<SOURCE>_<VARIANT>. Wint van perProjectList.
  const leadVariantRaw = typeof (lead.attributes as Record<string, unknown> | undefined)?.leadVariant === 'string'
    ? String((lead.attributes as Record<string, unknown>).leadVariant)
    : ''
  const envSafeVariant = leadVariantRaw.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const variantList = (envSafeSource && envSafeVariant)
    ? Deno.env.get(`BREVO_LIST_ID_${envSafeSource}_${envSafeVariant}`)
    : undefined
  const reservationListRaw = Deno.env.get('BREVO_LIST_ID_RESERVATION')
  const portalListRaw = Deno.env.get('BREVO_LIST_ID_PORTAL')
  const defaultListRaw = Deno.env.get('BREVO_LIST_ID')
  const src = sourceRaw.toLowerCase()
  const isReservation = src === 'dehofman_portal_reservation'
  const isPortalSource = src.startsWith('dehofman_portal')
  const listIdRaw = variantList
    ? variantList
    : perProjectList
      ? perProjectList
      : isReservation && reservationListRaw
        ? reservationListRaw
        : isPortalSource && portalListRaw
          ? portalListRaw
          : defaultListRaw
  const listId = listIdRaw ? Number.parseInt(listIdRaw, 10) : NaN

  const attrs = buildAttributes(lead)
  const body: Record<string, unknown> = {
    email: lead.email,
    attributes: attrs,
    updateEnabled: true,
  }
  if (Number.isFinite(listId) && listId > 0) {
    body.listIds = [listId]
  }

  try {
    let res = await postBrevoContact(body, apiKey)

    // Retry-strip bij Brevo's duplicate_parameter conflict.
    //
    // Brevo enforced uniqueness op DEZE attributes in dit account:
    //   - SMS      (Brevo standaard, altijd uniek)
    //   - WHATSAPP (in dit account ook als unique geconfigureerd \u2014 bevestigd
    //              door 400 response met duplicate_identifiers: [\"WHATSAPP\"])
    //
    // Als ons 06 al aan een ander contact gekoppeld is (campagne-data,
    // WhatsApp-bot leads, eerdere tests) wordt de hele upsert geweigerd.
    // We willen het contact alsnog landen in de marketing-lijst, dus
    // strippen we ALLE conflicting attributes en proberen opnieuw.
    // Het 06-nummer blijft in Supabase bewaard, daar geen uniqueness-eis.
    //
    // Tot 2 retry-rounden \u2014 Brevo kan in 1 keer maar \u00e9\u00e9n type duplicate
    // melden, dus na strip van SMS kan WHATSAPP de volgende fail-reason
    // worden. Tweede retry stript ook die.
    let retryRound = 0
    while (res.status === 400 && retryRound < 2) {
      const detail = await res.clone().json().catch(() => null) as
        | { code?: string; metadata?: { duplicate_identifiers?: string[] } }
        | null
      if (detail?.code !== 'duplicate_parameter') break
      const dups = detail.metadata?.duplicate_identifiers
      if (!Array.isArray(dups) || dups.length === 0) break

      // Strip alle conflicting attrs uit attrs in plaats van met body.
      let strippedAny = false
      for (const dup of dups) {
        if (dup in attrs) {
          delete (attrs as Record<string, unknown>)[dup]
          strippedAny = true
        }
      }
      if (!strippedAny) break

      const bodyRetry = { ...body, attributes: { ...attrs } }
      res = await postBrevoContact(bodyRetry, apiKey)
      retryRound += 1
      if (res.ok) {
        console.warn('[brevo] retry-' + retryRound + ' zonder', dups.join(','), 'geslaagd voor', lead.email)
      }
    }

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300)
      console.error('[brevo] non-2xx', res.status, detail)
      await notifyError('Brevo upsert failed (contact niet in lijst)', {
        source: lead.source,
        email: lead.email,
        first_name: lead.first_name,
        portal_token: lead.portal_token,
        lead_id: leadId,
        status: res.status,
        detail,
      })
    }
  } catch (err) {
    console.error('[brevo] fetch failed', err)
    await notifyError('Brevo fetch threw', {
      source: lead.source,
      email: lead.email,
      first_name: lead.first_name,
      portal_token: lead.portal_token,
      lead_id: leadId,
      error: String(err),
    })
  }
}
