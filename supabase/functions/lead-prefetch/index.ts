// Edge Function: lead-prefetch
// Runtime:  Supabase Edge (Deno)
// Purpose:  Read-only lookup van de basis-contactgegevens van één lead op
//           basis van zijn portal_token. Gebruikt door de "warme" CLP-variant
//           (bv. 2emerwedehaven.clp.repp.nl) om het opt-in-formulier voor te
//           vullen voor leads die al in het CRM zitten.
//
// Waarom een token i.p.v. gegevens in de URL: persoonsgegevens horen niet in
// query-strings (privacy). Het portal_token is een hoog-entropie geheim dat al
// per lead in de leads-tabel staat (DB DEFAULT). Een persoonlijke mail-link
// `...?t=<portal_token>` identificeert de lead; deze functie ruilt dat token
// (server-side, met service-role) om voor alleen de velden die het formulier
// nodig heeft. Geen andere lead-data verlaat de server.
//
// Endpoint shape:
//   POST https://<project>.supabase.co/functions/v1/lead-prefetch
//   Headers: Content-Type: application/json, Authorization: Bearer <ANON_KEY>
//   Body:    { "portal_token": "...", "source": "2e MWH" }   // source optioneel
//   Response: { ok: true, found: true, first_name, email, phone, company, session_id }
//         of: { ok: true, found: false }
//
// We geven ook session_id terug zodat de warme CLP diezelfde sessie kan
// aannemen: een afgeronde warme flow ge-upsert dan op (source, session_id) en
// WERKT DE BESTAANDE LEAD BIJ i.p.v. een duplicaat aan te maken.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const DEFAULT_ALLOWED = [
  'https://2emerwedehaven.clp.repp.nl',
  'https://2emwh.clp.repp.nl',
  'https://clp-xi-tan.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
]

function corsAllowed(origin: string | null): string {
  const fromEnv = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean)
  const list = Array.from(new Set([...DEFAULT_ALLOWED, ...fromEnv]))
  if (origin && list.includes(origin)) return origin
  // Vercel preview-URLs (clp-git-*.vercel.app) toestaan zonder ze allemaal te
  // hoeven whitelisten — alleen het clp-project, alleen https.
  if (origin && /^https:\/\/clp-[a-z0-9-]+\.vercel\.app$/.test(origin)) return origin
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

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin)

  let body: { portal_token?: unknown; source?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400, origin)
  }

  const token = typeof body.portal_token === 'string' ? body.portal_token.trim() : ''
  // Hoog-entropie-eis: voorkomt fishing met korte/geraden tokens.
  if (token.length < 16) return json({ ok: false, error: 'invalid_token' }, 400, origin)
  const wantSource = typeof body.source === 'string' ? body.source.trim() : ''

  const supaUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supaUrl || !serviceKey) return json({ ok: false, error: 'server_misconfigured' }, 500, origin)

  const supa = createClient(supaUrl, serviceKey)
  const { data, error } = await supa
    .from('leads')
    .select('first_name, email, phone, company_name, attributes, session_id, source')
    .eq('portal_token', token)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (error) return json({ ok: false, error: 'lookup_failed' }, 500, origin)
  if (!data) return json({ ok: true, found: false }, 200, origin)

  // Optionele source-scope: voorkomt dat een token van project A een formulier
  // van project B voorvult. De warme CLP stuurt zijn eigen source mee.
  if (wantSource && data.source && data.source !== wantSource) {
    return json({ ok: true, found: false }, 200, origin)
  }

  const attrs = (data.attributes && typeof data.attributes === 'object') ? data.attributes as Record<string, unknown> : {}
  const company = (typeof data.company_name === 'string' && data.company_name) ||
    (typeof attrs.company === 'string' ? attrs.company : '') || ''

  return json({
    ok: true,
    found: true,
    first_name: data.first_name ?? '',
    email:      data.email ?? '',
    phone:      data.phone ?? '',
    company,
    session_id: data.session_id ?? '',
  }, 200, origin)
})
