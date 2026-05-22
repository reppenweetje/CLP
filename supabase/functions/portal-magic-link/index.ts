// Edge Function: portal-magic-link
//
// Stuurt een magic-link mail naar een lead op basis van email-adres.
// Wordt aangeroepen vanuit dehofman.nl wanneer een uitgelogde bezoeker
// "Inloggen op mijn account" doet — hij geeft zijn email op, wij zoeken
// z'n portal_token op in Supabase, en sturen 'm een mail met
//   https://www.dehofman.nl/?t=<PORTAL_TOKEN>
// waarmee 'ie direct weer ingelogd is via de bestaande middleware-flow.
//
// Endpoint shape:
//   POST  https://<project>.supabase.co/functions/v1/portal-magic-link
//   Body: { "email": "flip@example.nl" }
//   Response (200): { ok: true }
//
// SECURITY: we returnen ALTIJD { ok: true } ongeacht of de email
// bestaat in onze leads-tabel. Dit voorkomt een email-enumeratie-
// attack waar een aanvaller kan ontdekken wie ons systeem kent.
// Bij onbekend email: silent no-op, geen mail wordt verstuurd.
//
// Rate-limit: 3 verzoeken per email per 15 min. Voorkomt mailbomb.
//
// Secrets nodig:
//   BREVO_API_KEY                  — voor Brevo transactional API
//   BREVO_MAGIC_LINK_SENDER_NAME   — optioneel, default "REPP De Hofman"
//   BREVO_MAGIC_LINK_SENDER_EMAIL  — optioneel, default "noreply@dehofman.nl"
//   PORTAL_BASE_URL                — optioneel, default https://www.dehofman.nl

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const DEFAULT_ALLOWED = [
  'https://dehofman.nl',
  'https://www.dehofman.nl',
  'https://projectportal.vercel.app',
  'http://localhost:3000',
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
    'Access-Control-Allow-Origin': corsAllowed(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

function json(payload: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

// In-memory rate-limit: 3 req per email per 15 min. Bij koude start van de
// edge worker wordt het bucket gereset, dat is acceptabel — aanvaller kan
// niet voorspellen wanneer een worker recycled.
const RATE_WINDOW_MS = 15 * 60_000
const RATE_LIMIT = 3
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function rateLimited(emailKey: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(emailKey)
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(emailKey, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  bucket.count += 1
  return bucket.count > RATE_LIMIT
}

setInterval(() => {
  const now = Date.now()
  for (const [k, b] of rateBuckets) if (b.resetAt < now) rateBuckets.delete(k)
}, 5 * 60_000)

function isValidEmail(s: unknown): s is string {
  return typeof s === 'string' && s.length >= 5 && s.length <= 200 && s.includes('@')
}

interface LeadRow {
  portal_token: string | null
  first_name: string | null
}

async function notifySlackError(message: string, context: Record<string, unknown>): Promise<void> {
  const webhook = Deno.env.get('SLACK_ERRORS_WEBHOOK_URL')
  if (!webhook) return
  const lines = Object.entries(context)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `*${k}:* ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n')
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '\u26a0\ufe0f Magic-link error', emoji: true } },
          { type: 'section', text: { type: 'mrkdwn', text: `*${message}*` } },
          ...(lines ? [{ type: 'section', text: { type: 'mrkdwn', text: lines } }] : []),
          { type: 'context', elements: [{ type: 'mrkdwn', text: `at: \`${new Date().toISOString()}\`` }] },
        ],
        text: `\u26a0\ufe0f Magic-link error: ${message}`,
      }),
    })
  } catch (err) {
    console.error('[slack-error] fetch failed', err)
  }
}

async function findLeadByEmail(email: string): Promise<LeadRow | null> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supa
    .from('leads')
    .select('portal_token, first_name')
    .eq('email', email.toLowerCase())
    .order('last_event_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[magic-link] lookup failed', error)
    // Kritiek: lead vroeg inloglink aan, wij konden DB niet bevragen.
    // Sales kan deze persoon manueel een mail sturen.
    notifySlackError('Supabase lookup failed', {
      email: email.slice(0, 3) + '***',
      detail: error.message,
    })
    return null
  }
  return data as LeadRow | null
}

interface BrevoSendResult {
  ok: boolean
  detail?: string
}

async function sendMagicLinkMail(
  email: string,
  firstName: string | null,
  portalToken: string,
): Promise<BrevoSendResult> {
  const apiKey = Deno.env.get('BREVO_API_KEY')
  if (!apiKey) {
    console.warn('[magic-link] BREVO_API_KEY ontbreekt, mail kan niet verstuurd')
    return { ok: false, detail: 'brevo_not_configured' }
  }

  const baseUrl = (Deno.env.get('PORTAL_BASE_URL') ?? 'https://www.dehofman.nl').replace(/\/$/, '')
  const magicUrl = `${baseUrl}/?t=${encodeURIComponent(portalToken)}`
  const senderName = Deno.env.get('BREVO_MAGIC_LINK_SENDER_NAME') ?? 'REPP De Hofman'
  const senderEmail = Deno.env.get('BREVO_MAGIC_LINK_SENDER_EMAIL') ?? 'noreply@dehofman.nl'
  const templateId = Deno.env.get('BREVO_MAGIC_LINK_TEMPLATE_ID')

  // Twee verzend-paden:
  //   1. Brevo template (als BREVO_MAGIC_LINK_TEMPLATE_ID is gezet):
  //      template-vars FIRSTNAME en MAGIC_LINK worden meegegeven zodat
  //      design + tone in Brevo dashboard beheerd kan worden.
  //   2. Inline HTML fallback (geen template-ID): minimaal bruikbaar
  //      ontwerp zodat deze flow direct werkt zonder template-setup.
  let body: Record<string, unknown>
  if (templateId) {
    body = {
      to: [{ email, name: firstName ?? undefined }],
      templateId: Number.parseInt(templateId, 10),
      params: {
        FIRSTNAME: firstName ?? '',
        MAGIC_LINK: magicUrl,
      },
    }
  } else {
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,'
    body = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email, name: firstName ?? undefined }],
      subject: 'Log in op De Hofman',
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f0f70">
          <h2 style="margin:0 0 16px 0">${greeting}</h2>
          <p>Je vroeg om in te loggen op je account bij De Hofman. Klik de knop om verder te gaan:</p>
          <p style="margin:24px 0">
            <a href="${magicUrl}" style="display:inline-block;background:#edff00;color:#0f0f70;font-weight:bold;text-decoration:none;padding:14px 24px;border-radius:999px">Inloggen op De Hofman →</a>
          </p>
          <p style="font-size:13px;color:#475569">De link werkt 60 dagen vanaf vandaag. Niet aangevraagd? Negeer deze mail dan, er gebeurt niks.</p>
          <hr style="border:none;border-top:1px solid #d8d6d6;margin:24px 0" />
          <p style="font-size:12px;color:#9a9893">REPP Bedrijfsmakelaar · ${baseUrl}</p>
        </div>
      `.trim(),
    }
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
      const detail = await res.text().catch(() => '')
      console.error('[magic-link] brevo non-2xx', res.status, detail.slice(0, 300))
      notifySlackError('Brevo SMTP send failed', {
        email: email.slice(0, 3) + '***',
        first_name: firstName,
        status: res.status,
        detail: detail.slice(0, 200),
      })
      return { ok: false, detail: `brevo_${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    console.error('[magic-link] brevo fetch failed', err)
    notifySlackError('Brevo SMTP fetch threw', {
      email: email.slice(0, 3) + '***',
      first_name: firstName,
      error: String(err),
    })
    return { ok: false, detail: 'brevo_fetch_failed' }
  }
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors)

  let body: unknown
  try { body = await req.json() } catch { return json({ error: 'bad_json' }, 400, cors) }
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const email = isValidEmail(b.email) ? (b.email as string).trim().toLowerCase() : null

  // Validatie: invalid email → 400. Andere fouten worden niet gelekt.
  if (!email) return json({ error: 'invalid_email' }, 400, cors)

  // Rate-limit op email (niet op IP, want één gezin/bedrijf kan vanaf
  // hetzelfde IP ook legitiem 2 accounts hebben). 3/15min is genereus
  // genoeg voor menselijk gedrag, blokkeert bulk-enumeration scripts.
  if (rateLimited(email)) {
    return json({ ok: true }, 200, cors) // stille rate-limit, geen leak
  }

  // Best-effort flow:
  //   1. Zoek lead op email
  //   2. Heeft 'ie portal_token? Verzend mail.
  //   3. Onbekend? Silent skip.
  // We loggen wel server-side voor debug; client krijgt altijd ok=true.
  const lead = await findLeadByEmail(email)
  if (!lead || !lead.portal_token) {
    console.log('[magic-link] no lead for email', email.slice(0, 3) + '***')
    return json({ ok: true }, 200, cors)
  }

  const result = await sendMagicLinkMail(email, lead.first_name, lead.portal_token)
  if (!result.ok) {
    console.warn('[magic-link] send failed for', email.slice(0, 3) + '***', result.detail)
  }
  return json({ ok: true }, 200, cors)
})
