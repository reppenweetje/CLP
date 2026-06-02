// Edge Function: gemini-followup (v15)
// Runtime:  Supabase Edge (Deno)
// Purpose:  Genereer één WhatsApp follow-up bericht op basis van een
//           lead-snapshot. Schrijft optioneel terug naar public.leads.
//
// v14 → v15:
//   - ROUTE 2 spacing: opening + samenvattingszin staan op één blok met
//     line-break tussen, geen witregel meer. Drie blokken structuur:
//     begroeting / context / CTA. Visueel rustiger.
// v13 → v14:
//   - Afsluiting "Groet, Reppit" geschrapt. Bericht eindigt na sluitvraag.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { buildHash, HashInput } from './hash.ts'
import { buildPrompt, PromptInput } from './prompt.ts'

// ── Cron alternative auth ─────────────────────────────────────────────────────
const CRON_SECRET = 'ab65d21092985ad1e3d84d50da0feca81966ca36e7f1a9d6bd897550c0e3d003'

interface RequestBody {
  lead_id?: string | null
  snapshot: PromptInput & HashInput
  skip_if_fresh?: boolean
}

function validate(payload: unknown): { ok: true; data: RequestBody } | { ok: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'payload must be a JSON object' }
  }
  const p = payload as Record<string, unknown>
  if (!p.snapshot || typeof p.snapshot !== 'object') {
    return { ok: false, error: 'snapshot is required' }
  }
  if (p.lead_id !== undefined && p.lead_id !== null && typeof p.lead_id !== 'string') {
    return { ok: false, error: 'lead_id must be a string or null' }
  }
  return { ok: true, data: p as unknown as RequestBody }
}

function isServiceRole(authHeader: string | null, serviceKey: string): boolean {
  if (!authHeader) return false
  const m = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!m) return false
  return m[1].trim() === serviceKey.trim()
}

function isCronCaller(req: Request): boolean {
  const hdr = req.headers.get('x-cron-secret')
  if (!hdr) return false
  if (hdr.length !== CRON_SECRET.length) return false
  let mismatch = 0
  for (let i = 0; i < hdr.length; i++) mismatch |= hdr.charCodeAt(i) ^ CRON_SECRET.charCodeAt(i)
  return mismatch === 0
}

function isAuthorized(req: Request, serviceKey: string | undefined): boolean {
  if (serviceKey && isServiceRole(req.headers.get('Authorization'), serviceKey)) return true
  if (isCronCaller(req)) return true
  return false
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  promptFeedback?: { blockReason?: string }
}

async function callGemini(prompt: string, apiKey: string, model: string, maxTokens: number): Promise<string> {
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: maxTokens },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`gemini ${res.status}: ${text.slice(0, 500)}`)

  let data: GeminiResponse
  try { data = JSON.parse(text) } catch { throw new Error('gemini returned non-JSON') }

  if (data.promptFeedback?.blockReason) throw new Error(`gemini blocked: ${data.promptFeedback.blockReason}`)

  const candidate = data.candidates?.[0]
  const out = candidate?.content?.parts?.map(p => p.text ?? '').join('').trim() ?? ''
  if (!out) throw new Error(`gemini empty (finish=${candidate?.finishReason ?? 'unknown'})`)
  return out
}

function sanitizeMessage(raw: string): string {
  let m = raw.trim()
  if ((m.startsWith('"') && m.endsWith('"')) || (m.startsWith('\u201c') && m.endsWith('\u201d'))) {
    m = m.slice(1, -1).trim()
  }
  m = m.replace(/^(whatsapp|bericht|message)\s*:\s*/i, '')
  if (m.length > 800) m = m.slice(0, 800)
  return m
}

function looksValid(message: string): boolean {
  if (message.length < 20) return false
  if (message.length > 800) return false
  if (/https?:\/\//i.test(message)) return false
  return true
}

async function writeBackToLead(
  supa: SupabaseClient,
  leadId: string,
  message: string,
  hash: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supa
    .from('leads')
    .update({
      ai_followup_message:      message,
      ai_followup_status:       'ready',
      ai_followup_generated_at: new Date().toISOString(),
      ai_followup_input_hash:   hash,
    })
    .eq('id', leadId)
  if (error) return { ok: false, error: error.message }
  return { ok: true, error: null }
}

async function readExistingHash(
  supa: SupabaseClient,
  leadId: string,
): Promise<{ hash: string | null; message: string | null; generated_at: string | null }> {
  const { data, error } = await supa
    .from('leads')
    .select('ai_followup_message, ai_followup_input_hash, ai_followup_generated_at')
    .eq('id', leadId)
    .single()
  if (error || !data) return { hash: null, message: null, generated_at: null }
  return {
    hash:         (data as { ai_followup_input_hash: string | null }).ai_followup_input_hash,
    message:      (data as { ai_followup_message: string | null }).ai_followup_message,
    generated_at: (data as { ai_followup_generated_at: string | null }).ai_followup_generated_at,
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405)
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const GEMINI_KEY   = Deno.env.get('GEMINI_API_KEY')
  const MODEL        = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash'
  const MAX_TOKENS   = Number.parseInt(Deno.env.get('GEMINI_MAX_OUTPUT_TOKENS') ?? '320', 10)

  if (!GEMINI_KEY) return json({ ok: false, error: 'server_misconfigured', detail: 'GEMINI_API_KEY missing' }, 500)

  if (!isAuthorized(req, SERVICE_KEY)) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  let body: unknown
  try { body = await req.json() }
  catch { return json({ ok: false, error: 'bad_json' }, 400) }

  const v = validate(body)
  if (!v.ok) return json({ ok: false, error: 'validation_failed', detail: v.error }, 400)

  if (v.data.lead_id && (!SUPABASE_URL || !SERVICE_KEY)) {
    return json({ ok: false, error: 'server_misconfigured', detail: 'supabase env missing for writeback' }, 500)
  }

  const hash = await buildHash(v.data.snapshot)

  if (v.data.skip_if_fresh && v.data.lead_id && SUPABASE_URL && SERVICE_KEY) {
    const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const existing = await readExistingHash(supa, v.data.lead_id)
    if (existing.hash === hash && existing.message) {
      return json({
        ok:           true,
        message:      existing.message,
        hash,
        generated_at: existing.generated_at,
        source:       'cache',
      })
    }
  }

  let message: string
  try {
    const prompt = buildPrompt(v.data.snapshot)
    const raw    = await callGemini(prompt, GEMINI_KEY, MODEL, Number.isFinite(MAX_TOKENS) ? MAX_TOKENS : 320)
    message      = sanitizeMessage(raw)
    if (!looksValid(message)) {
      return json({ ok: false, error: 'gemini_invalid_output', detail: message.slice(0, 200) }, 502)
    }
  } catch (err) {
    return json({ ok: false, error: 'gemini_failed', detail: (err as Error).message }, 502)
  }

  if (v.data.lead_id && SUPABASE_URL && SERVICE_KEY) {
    const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const w = await writeBackToLead(supa, v.data.lead_id, message, hash)
    if (!w.ok) {
      return json({
        ok:           true,
        message,
        hash,
        generated_at: new Date().toISOString(),
        source:       'fresh',
        warning:      `db_writeback_failed: ${w.error}`,
      }, 207)
    }
  }

  return json({
    ok:           true,
    message,
    hash,
    generated_at: new Date().toISOString(),
    source:       'fresh',
  })
})

function json(payload: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
