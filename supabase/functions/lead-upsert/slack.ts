// Slack HOTLEADS notifier — fired when a lead reaches `temperature === 'hot'`.
// Best-effort: any failure is swallowed and logged, never blocks the
// Edge Function response to the visitor.
//
// Configure once in Supabase dashboard → Edge Functions → Secrets:
//   SLACK_HOTLEADS_WEBHOOK_URL  (Slack incoming webhook for #hotleads)
//
// Channel naming convention: #hotleads-<project> if you want per-project
// channels later. For now a single #hotleads is fine.

interface HotLeadInput {
  session_id?: string
  source?: string
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
  attributes?: Record<string, unknown>
}

const PERSONA_LABEL: Record<string, string> = {
  eigen_gebruiker: 'Voor eigen bedrijf',
  belegger:        'Belegger',
  beide:           'Beide (eigen + belegging)',
  huurder:         'Huurder',
  onbekend:        'Persona onbekend',
}

const TIMELINE_LABEL: Record<string, string> = {
  zsm:        'Zo snel mogelijk',
  '3mnd':     'Binnen 3 maanden',
  '6mnd':     'Binnen 6 maanden',
  '12mnd':    'Binnen een jaar',
  weet_niet:  'Termijn onbekend',
}

function fmt(label: string, value: string | null | undefined): string {
  if (!value) return ''
  return `*${label}:* ${value}`
}

/**
 * notifyError — stuurt een server-side fout naar het Slack #errors-kanaal
 * zodat sales/dev kan ingrijpen voor de lead-data verloren raakt.
 *
 * Configureer met secret SLACK_ERRORS_WEBHOOK_URL. Niet gezet → stille
 * skip (dev/preview-omgevingen hebben dit niet nodig).
 *
 * `context` is een platte key/value-object dat we als veld in de Slack
 * blocks tonen. PII (email/phone) wordt expliciet getoond zodat sales
 * de lead handmatig kan oppakken — dat is een trade-off met privacy,
 * maar in een operationeel kanaal dat alleen team-leden zien acceptabel.
 */
export async function notifyError(
  message: string,
  context: Record<string, unknown> = {},
): Promise<void> {
  const webhook = Deno.env.get('SLACK_ERRORS_WEBHOOK_URL')
  if (!webhook) return

  const contextLines = Object.entries(context)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `*${k}:* ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n')

  const payload = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '\u26a0\ufe0f Server error', emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${message}*` },
      },
      ...(contextLines ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: contextLines },
      }] : []),
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `at: \`${new Date().toISOString()}\`` },
        ],
      },
    ],
    text: `\u26a0\ufe0f Server error: ${message}`,
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) console.error('[slack-error] non-2xx', res.status)
  } catch (err) {
    console.error('[slack-error] fetch failed', err)
  }
}

/**
 * notifyNewLead — fired ONCE per lead, op het moment dat de bezoeker
 * zijn e-mailadres invult (= conversie van anoniem bezoek naar lead).
 *
 * Caller in index.ts checkt zelf of email net nu voor het eerst gezet
 * is (via SELECT vóór UPSERT). Wij doen alleen het Slack-posten, niet
 * de dedupe.
 *
 * Configure secret: SLACK_LEADGEN_WEBHOOK_URL (incoming webhook van
 * het #generation kanaal in de REPP-workspace).
 */
// Mapt source-string naar lees-baar project + lead-type label.
// CLP en portal-bronnen krijgen verschillende labels zodat sales meteen
// ziet waar de lead vandaan komt (CLP = vol scripted flow, Portal =
// walk-in op dehofman.nl).
function leadHeader(source: string | null | undefined): string {
  const s = (source ?? '').toLowerCase()
  // Project-label, capitalized voor leesbaarheid in Slack
  const projectLabel = s.includes('dehofman') ? 'De Hofman' : (s.split('_').slice(-1)[0] || 'project')
  if (s.startsWith('clp_')) return `✨ CLP lead — ${projectLabel}`
  if (s === 'dehofman_portal_reservation') return `🔑 Reservering — ${projectLabel}`
  if (s.startsWith('dehofman_portal')) return `✨ Portal lead — ${projectLabel}`
  return `✨ Nieuwe lead — ${projectLabel}`
}

export async function notifyNewLead(lead: HotLeadInput, leadId: string | null): Promise<void> {
  const webhook = Deno.env.get('SLACK_LEADGEN_WEBHOOK_URL')
  if (!webhook) {
    // Webhook niet gezet → silent skip (dev/preview heeft dit niet nodig).
    return
  }

  const headerText = leadHeader(lead.source)
  const persona  = PERSONA_LABEL[lead.persona ?? ''] ?? lead.persona ?? null
  const timeline = TIMELINE_LABEL[lead.timeline_id ?? ''] ?? lead.timeline_id ?? null

  const contactLines = [
    fmt('Naam',     lead.first_name),
    fmt('E-mail',   lead.email),
    fmt('Telefoon', lead.phone),
  ].filter(Boolean).join('\n')

  // Context-info (persona/timeline/score) is vaak nog leeg op het moment
  // van email-capture — pas later in de flow wordt dat gevuld. Optioneel
  // tonen indien aanwezig.
  const qualLines = [
    fmt('Persona',  persona),
    fmt('Termijn',  timeline),
    fmt('Stage',    lead.stage),
    fmt('Score',    lead.score != null ? String(lead.score) : null),
  ].filter(Boolean).join('\n')

  const payload = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: headerText, emoji: true },
      },
      ...(contactLines ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: contactLines },
      }] : []),
      ...(qualLines ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: qualLines },
      }] : []),
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `via: \`${lead.source ?? '—'}\` · lead_id: \`${leadId ?? '—'}\`` },
        ],
      },
    ],
    text: `${headerText} · ${lead.first_name ?? ''} ${lead.email ?? ''}`.trim(),
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.error('[slack-newlead] non-2xx', res.status, await res.text())
    }
  } catch (err) {
    console.error('[slack-newlead] webhook fetch failed', err)
  }
}

export async function notifyHotLead(lead: HotLeadInput, leadId: string | null): Promise<void> {
  const webhook = Deno.env.get('SLACK_HOTLEADS_WEBHOOK_URL')
  if (!webhook) {
    // Slack not configured — silently skip. This is by design so dev/preview
    // environments don't need a webhook.
    return
  }

  const persona  = PERSONA_LABEL[lead.persona ?? ''] ?? lead.persona ?? '—'
  const timeline = TIMELINE_LABEL[lead.timeline_id ?? ''] ?? lead.timeline_id ?? '—'
  const project  = (lead.source ?? '').replace(/^clp_/, '') || 'onbekend'

  const contactLines = [
    fmt('Naam',       lead.first_name),
    fmt('E-mail',     lead.email),
    fmt('Telefoon',   lead.phone),
  ].filter(Boolean).join('\n')

  const qualLines = [
    fmt('Persona',    persona),
    fmt('Termijn',    timeline),
    fmt('Grootte',    lead.size_id),
    fmt('Stage',      lead.stage),
    fmt('Score',      lead.score != null ? String(lead.score) : null),
  ].filter(Boolean).join('\n')

  const payload = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🔥 HOT lead — ${project}`, emoji: true },
      },
      ...(contactLines ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: contactLines },
      }] : []),
      ...(qualLines ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: qualLines },
      }] : []),
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `lead_id: \`${leadId ?? '—'}\` · session: \`${(lead.session_id ?? '').slice(0, 8)}…\`` },
        ],
      },
    ],
    // Plaintext fallback for notifications + clients without block-kit support.
    text: `🔥 HOT lead — ${project} · ${lead.first_name ?? ''} ${lead.email ?? ''}`.trim(),
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.error('[slack] non-2xx from webhook', res.status, await res.text())
    }
  } catch (err) {
    console.error('[slack] webhook fetch failed', err)
  }
}
