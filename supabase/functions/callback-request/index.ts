// Edge Function: callback-request
// Runtime:  Supabase Edge (Deno)
// Purpose:  Stuurt een Slack-notificatie naar het #callbacks kanaal zodra
//           een lead op de "Laat de makelaar mij bellen" chip klikt in de
//           CLP warm-handoff. De makelaar kan dan binnen minuten reageren.
//
// Endpoint:
//   POST  https://<project>.supabase.co/functions/v1/callback-request
//   Headers:
//     Content-Type: application/json
//     Authorization: Bearer <SUPABASE_ANON_KEY>
//   Body:
//     {
//       "lead":    { "firstName": "...", "email": "...", "phone": "..." },
//       "project": "clp_dehofman",
//       "source":  "warm-handoff" | "macro-chip",
//       "context": { "persona": "...", "temperature": "...", "score": 0 }
//     }
//
// Configure in Supabase dashboard → Edge Functions → Secrets:
//   SLACK_CALLBACK_WEBHOOK_URL  (Slack incoming webhook for the #callbacks
//                                channel — different van #generation +
//                                #errors zodat sales-alerts niet verdrinken)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const DEFAULT_ALLOWED = [
  'https://dehofman.clp.repp.nl',
  'https://clp-xi-tan.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]
const VERCEL_PREVIEW_REGEX = /^https:\/\/[a-z0-9-]+-repp-1bdaee61\.vercel\.app$/

function corsAllowed(origin: string | null): string {
  const fromEnv = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const list = Array.from(new Set([...DEFAULT_ALLOWED, ...fromEnv]))
  if (origin && (list.includes(origin) || VERCEL_PREVIEW_REGEX.test(origin))) return origin
  return list[0] ?? '*'
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':  corsAllowed(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age':       '86400',
    'Vary':                         'Origin',
  }
}

function json(payload: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

interface CallbackPayload {
  lead?: {
    firstName?: string | null
    email?: string | null
    phone?: string | null
  }
  project?: string | null
  source?: string | null
  context?: Record<string, unknown> | null
}

function fmt(label: string, value: string | null | undefined): string {
  if (!value) return ''
  return `*${label}:* ${value}`
}

// Brevo transactional email — verstuurt een notificatie naar
// info@repp.nl met dezelfde info als Slack. Gebruikt bestaande
// BREVO_API_KEY secret die ook door lead-upsert wordt gebruikt voor
// contact-syncs.
//
// Sender: Reppit <noreply@repp.nl> (aanname: repp.nl-domein is in
// Brevo geverifieerd; zo niet, dan zet je via SUPABASE secret
// CALLBACK_MAIL_FROM een ander adres). Reply-to is info@repp.nl
// zodat als sales op 'reply' klikt het in de juiste inbox belandt.
async function sendCallbackEmail(payload: CallbackPayload): Promise<void> {
  const apiKey = Deno.env.get('BREVO_API_KEY')
  if (!apiKey) {
    console.warn('[callback-request] BREVO_API_KEY not configured, skipping email')
    return
  }
  const to = Deno.env.get('CALLBACK_MAIL_TO') ?? 'info@repp.nl'
  // jann@repp.nl is verified sender in Brevo. noreply@ bouncet anders.
  const fromEmail = Deno.env.get('CALLBACK_MAIL_FROM') ?? 'jann@repp.nl'
  const fromName = Deno.env.get('CALLBACK_MAIL_FROM_NAME') ?? 'Reppit'

  const lead = payload.lead ?? {}
  const projectLabel = (payload.project ?? '').replace(/^clp_/, '').replace(/^dehofman_/, '') || 'project'
  const ctx = payload.context ?? {}

  const contactLines = [
    lead.firstName ? `Naam:     ${lead.firstName}` : null,
    lead.email ? `E-mail:   ${lead.email}` : null,
    lead.phone ? `Telefoon: ${lead.phone}` : null,
  ].filter(Boolean).join('\n')

  const ctxLines = Object.entries(ctx)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n')

  const textBody = [
    `Een lead heeft via de CLP aangegeven gebeld te willen worden.`,
    '',
    contactLines || '(geen contactgegevens)',
    '',
    ctxLines ? 'Context:' : '',
    ctxLines,
    '',
    `Project:  ${projectLabel}`,
    `Bron:     ${payload.source ?? 'warm-handoff'}`,
    `Tijd:     ${new Date().toISOString()}`,
  ].filter(Boolean).join('\n')

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1d1d1f; max-width: 560px;">
      <h2 style="margin: 0 0 12px; font-size: 20px;">\u260e\ufe0f Lead wil gebeld worden \u2014 ${escapeHtml(projectLabel)}</h2>
      <p style="margin: 0 0 16px; color: #6b6a66;">Iemand heeft via de CLP gevraagd om teruggebeld te worden.</p>
      <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
        ${lead.firstName ? row('Naam', lead.firstName) : ''}
        ${lead.email ? row('E-mail', `<a href="mailto:${escapeHtml(lead.email)}" style="color: #0f0f70;">${escapeHtml(lead.email)}</a>`) : ''}
        ${lead.phone ? row('Telefoon', `<a href="tel:${escapeHtml(lead.phone)}" style="color: #0f0f70;">${escapeHtml(lead.phone)}</a>`) : ''}
      </table>
      ${ctxLines ? `
        <h3 style="margin: 0 0 8px; font-size: 14px; color: #6b6a66;">Context</h3>
        <pre style="background: #f7f6f1; padding: 12px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; margin: 0 0 16px;">${escapeHtml(ctxLines)}</pre>
      ` : ''}
      <p style="margin: 16px 0 0; font-size: 12px; color: #9a9893;">
        Project: <code>${escapeHtml(payload.project ?? '')}</code><br/>
        Bron: <code>${escapeHtml(payload.source ?? 'warm-handoff')}</code><br/>
        Tijd: ${new Date().toISOString()}
      </p>
    </div>
  `.trim()

  const body = {
    sender: { email: fromEmail, name: fromName },
    to: [{ email: to }],
    replyTo: { email: 'info@repp.nl' },
    subject: 'Lead bellen de Hofman',
    htmlContent: htmlBody,
    textContent: textBody,
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.error('[callback-request] brevo non-2xx', res.status, txt.slice(0, 300))
    }
  } catch (err) {
    console.error('[callback-request] brevo fetch failed', err)
  }
}

function row(label: string, value: string): string {
  return `<tr><td style="padding: 6px 12px 6px 0; color: #6b6a66; font-size: 13px; vertical-align: top; white-space: nowrap;">${label}</td><td style="padding: 6px 0; font-size: 13px; font-weight: 600;">${value}</td></tr>`
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

async function postSlack(webhook: string, payload: CallbackPayload): Promise<void> {
  const lead = payload.lead ?? {}
  const projectLabel = (payload.project ?? '').replace(/^clp_/, '').replace(/^dehofman_/, '') || 'project'
  const ctx = payload.context ?? {}
  const ctxLines = Object.entries(ctx)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `*${k}:* ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n')

  const contactLines = [
    fmt('Naam',     lead.firstName),
    fmt('E-mail',   lead.email),
    fmt('Telefoon', lead.phone),
  ].filter(Boolean).join('\n')

  const slackBody = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `\u260e\ufe0f Lead wil gebeld worden \u2014 ${projectLabel}`, emoji: true },
      },
      ...(contactLines ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: contactLines },
      }] : []),
      ...(ctxLines ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: ctxLines },
      }] : []),
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `via: \`${payload.source ?? 'warm-handoff'}\` \u00b7 ${new Date().toISOString()}` },
        ],
      },
    ],
    text: `\u260e\ufe0f Lead wil gebeld worden \u2014 ${projectLabel} \u00b7 ${lead.firstName ?? ''} ${lead.phone ?? ''}`.trim(),
  }

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slackBody),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('[callback-request] slack non-2xx', res.status, txt.slice(0, 300))
  }
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors)

  let body: CallbackPayload
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_json' }, 400, cors)
  }

  // Fire Slack + Email parallel. Beide best-effort; één faal blokkeert
  // de ander niet. Edge Function returnt 200 zolang we überhaupt iets
  // hebben kunnen versturen.
  const webhook = Deno.env.get('SLACK_CALLBACK_WEBHOOK_URL')
  const slackPromise = webhook
    ? postSlack(webhook, body).catch((err) => {
        console.error('[callback-request] slack post failed', err)
      })
    : Promise.resolve()
  const emailPromise = sendCallbackEmail(body).catch((err) => {
    console.error('[callback-request] email send failed', err)
  })

  if (!webhook && !Deno.env.get('BREVO_API_KEY')) {
    console.warn('[callback-request] no slack webhook and no brevo key configured')
    return json({ ok: true, skipped: 'no_notifiers_configured' }, 200, cors)
  }

  await Promise.all([slackPromise, emailPromise])
  return json({ ok: true }, 200, cors)
})
