import { notifyError } from './slack.ts'

// Zapier walk-in webhooks — routeer per source naar de juiste Zap.
//
// We hebben twee verschillende Zaps voor twee soorten walk-in events:
//
//   1. ZAPIER_RESERVATION_WEBHOOK_URL — leads die op /reserveren een
//      unit op naam laten zetten. Hoge intentie, hot leads. Sales-team
//      moet deze ASAP zien.
//
//   2. ZAPIER_WALKIN_WEBHOOK_URL — alle andere portal-formulieren
//      (insider, interest, xxl, report, notify-status). Lager intent
//      maar wel een email-capture die in nurture-flow moet.
//
// Beide secrets zijn optioneel. Niet gezet = stille skip, geen errors.
// Best-effort: faalt zonder de Edge Function-response te blokkeren.

interface ZapierLeadInput {
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
  started_at?: string | null
  last_event_at?: string | null
  portal_token?: string | null
  attributes?: Record<string, unknown>
}

const RESERVATION_SOURCE = 'dehofman_portal_reservation'

function pickWebhookUrl(source: string | null | undefined): string | null {
  if (!source) return null
  const s = source.toLowerCase()
  if (s === RESERVATION_SOURCE) {
    return Deno.env.get('ZAPIER_RESERVATION_WEBHOOK_URL') ?? null
  }
  if (s.startsWith('dehofman_portal')) {
    return Deno.env.get('ZAPIER_WALKIN_WEBHOOK_URL') ?? null
  }
  return null
}

function buildPayload(lead: ZapierLeadInput, leadId: string | null): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    lead_id: leadId,
    source: lead.source,
    portal_token: lead.portal_token,
    email: lead.email ?? null,
    first_name: lead.first_name ?? null,
    phone: lead.phone ?? null,
    persona: lead.persona ?? null,
    intent_id: lead.intent_id ?? null,
    size_id: lead.size_id ?? null,
    timeline_id: lead.timeline_id ?? null,
    temperature: lead.temperature ?? null,
    score: typeof lead.score === 'number' ? lead.score : null,
    stage: lead.stage ?? null,
    followup: lead.followup ?? null,
    started_at: lead.started_at ?? null,
    last_event_at: lead.last_event_at ?? null,
    portal_url: lead.portal_token ? `https://www.dehofman.nl/?t=${lead.portal_token}` : null,
    received_at: new Date().toISOString(),
  }

  const extras = lead.attributes ?? {}
  if (extras && typeof extras === 'object') {
    const e = extras as Record<string, unknown>
    if (typeof e.unit_id === 'string') payload.unit_id = e.unit_id
    if (typeof e.note === 'string') payload.note = e.note
    if (typeof e.contact_moment === 'string') payload.contact_moment = e.contact_moment
    if (typeof e.bedrijfsnaam === 'string') payload.bedrijfsnaam = e.bedrijfsnaam
    if (typeof e.report_type === 'string') payload.report_type = e.report_type
    if (typeof e.rentRange === 'string') payload.rent_range = e.rentRange
    if (typeof e.gateContext === 'string') payload.gate_context = e.gateContext
    if (typeof e.project === 'string') payload.project = e.project
  }

  return payload
}

export async function notifyZapierWalkin(
  lead: ZapierLeadInput,
  leadId: string | null,
): Promise<void> {
  const url = pickWebhookUrl(lead.source)
  if (!url) {
    // Geen geconfigureerde webhook voor deze source — stille skip.
    return
  }

  const payload = buildPayload(lead, leadId)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 200)
      console.error('[zapier] non-2xx', res.status, detail)
      await notifyError('Zapier webhook failed (CRM trigger gemist)', {
        source: lead.source,
        email: lead.email,
        portal_token: lead.portal_token,
        lead_id: leadId,
        status: res.status,
        detail,
      })
    }
  } catch (err) {
    console.error('[zapier] fetch failed', err)
    await notifyError('Zapier fetch threw (CRM trigger gemist)', {
      source: lead.source,
      email: lead.email,
      portal_token: lead.portal_token,
      lead_id: leadId,
      error: String(err),
    })
  }
}
