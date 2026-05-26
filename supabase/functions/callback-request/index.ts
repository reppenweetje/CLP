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

  const webhook = Deno.env.get('SLACK_CALLBACK_WEBHOOK_URL')
  if (!webhook) {
    // Secret niet gezet → return ok zodat de CLP-frontend niet faalt,
    // maar log de skip zodat dit duidelijk is in de Edge Function logs.
    console.warn('[callback-request] SLACK_CALLBACK_WEBHOOK_URL not configured, skipping')
    return json({ ok: true, skipped: 'webhook_not_configured' }, 200, cors)
  }

  try {
    await postSlack(webhook, body)
    return json({ ok: true }, 200, cors)
  } catch (err) {
    console.error('[callback-request] post failed', err)
    return json({ ok: false, error: 'slack_post_failed' }, 500, cors)
  }
})
