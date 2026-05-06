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
