// Brevo Contact upsert — pusht elke lead met email naar Brevo's Contacts API
// zodat de marketing-flow (lijsten, segmenten, mailings) op de actuele data
// kan werken. Best-effort: faalt zonder de Edge Function-response te blokkeren.
//
// Configure once in Supabase dashboard → Edge Functions → Secrets:
//   BREVO_API_KEY    — v3 API key uit Brevo (Settings → SMTP & API → API keys)
//   BREVO_LIST_ID    — numerieke ID van de lijst, bv. "42"
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
  attributes?: Record<string, unknown>
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

  set('FIRSTNAME',       lead.first_name)
  set('SMS',             normalizePhoneE164(lead.phone))
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
  set('CLP_PROJECT',     (lead.source ?? '').replace(/^clp_/, '') || undefined)
  set('FOLLOWUP',        lead.followup)
  set('AFHAAK_REASON',   lead.afhaak_reason)
  set('HANDOFF_OUTCOME', lead.handoff_outcome)
  set('STARTED_AT',      lead.started_at)
  set('LAST_EVENT_AT',   lead.last_event_at)

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

export async function upsertBrevoContact(lead: BrevoLeadInput): Promise<void> {
  const apiKey = Deno.env.get('BREVO_API_KEY')
  if (!apiKey) {
    // Brevo niet geconfigureerd — stille skip. Zelfde patroon als Slack:
    // dev/preview-omgevingen hebben geen Brevo-key nodig.
    return
  }
  if (!lead.email) {
    // Email-gate consistent met Supabase- en Slack-paden.
    return
  }

  const listIdRaw = Deno.env.get('BREVO_LIST_ID')
  const listId = listIdRaw ? Number.parseInt(listIdRaw, 10) : NaN

  const body: Record<string, unknown> = {
    email: lead.email,
    attributes: buildAttributes(lead),
    updateEnabled: true,
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
