// Edge Function: outbound-dispatcher (v18 - walk-in support)
// Wijzigingen tov v17:
//   - SQL filter uitgebreid: nu ook source LIKE 'dehofman_portal%' naast clp_%
//   - Gemini-call wordt geskipped voor walk-in sources (geen kwalificatie-data
//     dus geen personalisatie mogelijk). Template uit outbound_settings
//     wordt direct gebruikt met {first_name} placeholder.
//   - aiSummary is '' voor walk-ins -> renderOutboundTemplate's {ai_summary}
//     placeholder wordt leeg vervangen indien aanwezig.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const CRON_SECRET = 'ab65d21092985ad1e3d84d50da0feca81966ca36e7f1a9d6bd897550c0e3d003'

interface RequestBody {
  dry_run?: boolean
  lead_ids?: string[]
  limit?: number
  skip_n8n?: boolean
}

interface LeadRow {
  id: string
  source: string | null
  session_id: string | null
  project: string | null
  first_name: string | null
  email: string | null
  phone: string | null
  phone_normalized: string | null
  persona: string | null
  intent_id: string | null
  size_id: string | null
  timeline_id: string | null
  afhaak_reason: string | null
  attributes: Record<string, unknown> | null
  non_inbound_outbound_status: string | null
  ai_followup_message: string | null
  ai_followup_input_hash: string | null
}

interface OutboundSettingRow {
  id: string
  project: string
  stage: number
  message_template: string | null
  media_url?: string | null
  media_type?: string | null
}

interface DispatchResult {
  processed: number
  sent: number
  failed: number
  skipped: number
  errors: Array<{ lead_id: string; stage: string; error: string }>
  preview?: Array<{ lead_id: string; message_type: string; reason: string }>
}

function json(payload: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
}

function messageTypeFor(afhaakReason: string | null | undefined): string {
  if (!afhaakReason) return 'standard_followup'
  const r = afhaakReason.trim().toLowerCase()
  switch (r) {
    case 'prijs': return 'afhaak_price'
    case 'locatie': return 'afhaak_location'
    case 'oppervlakte': return 'afhaak_size'
    case 'huur': return 'afhaak_rent'
    case 'timing': return 'afhaak_timing'
    case '': return 'standard_followup'
    default: return 'afhaak_other'
  }
}

// v18: bepaal of we Gemini moeten aanroepen. CLP-leads = ja (rijke
// kwalificatie-data: persona, intent, size, timeline, afhaak_reason).
// Walk-in leads (dehofman_portal*) = nee -> static template only.
function shouldCallGemini(source: string | null | undefined): boolean {
  if (!source) return false
  return source.toLowerCase().startsWith('clp_')
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

function isAuthorized(req: Request, serviceKey: string): boolean {
  return isServiceRole(req.headers.get('Authorization'), serviceKey) || isCronCaller(req)
}

function scalarToString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

function renderOutboundTemplate(template: string | null | undefined, lead: LeadRow, aiSummary: string): string {
  const attrs = (lead.attributes ?? {}) as Record<string, unknown>
  const context: Record<string, string | null> = {
    ai_summary: aiSummary,
    first_name: lead.first_name ?? null,
    name: lead.first_name ?? null,
    email: lead.email ?? null,
    phone: lead.phone_normalized ?? lead.phone ?? null,
    project: lead.project ?? null,
    source: lead.source ?? null,
    session_id: lead.session_id ?? null,
    persona: lead.persona ?? null,
    intent_id: lead.intent_id ?? null,
    size_id: lead.size_id ?? null,
    timeline_id: lead.timeline_id ?? null,
    afhaak_reason: lead.afhaak_reason ?? null,
  }
  for (const [key, value] of Object.entries(attrs)) {
    const scalar = scalarToString(value)
    if (scalar !== null && context[key] === undefined) context[key] = scalar
  }
  const sourceTemplate = template?.trim() ? template : '{ai_summary}'
  return sourceTemplate.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    const value = context[key]
    return value === null || value === undefined ? match : value
  })
}

async function fetchOutboundTemplate(supa: SupabaseClient, project: string | null, stage: number): Promise<{ setting: OutboundSettingRow | null; error: string | null }> {
  if (!project) return { setting: null, error: null }
  const { data, error } = await supa.from('outbound_settings').select('id, project, stage, message_template, media_url, media_type').eq('project', project).eq('stage', stage).maybeSingle()
  if (error) return { setting: null, error: error.message }
  return { setting: data as OutboundSettingRow | null, error: null }
}

async function selectLeadsByFilter(supa: SupabaseClient, limit: number): Promise<{ data: LeadRow[]; error: string | null }> {
  const nowIso = new Date().toISOString()
  const baseSelect = 'id, source, session_id, project, first_name, email, phone, phone_normalized, persona, intent_id, size_id, timeline_id, afhaak_reason, attributes, non_inbound_outbound_status, ai_followup_message, ai_followup_input_hash'
  // v18: filter accepteert nu zowel CLP- als walk-in-bronnen (dehofman_portal).
  // PostgREST `.or()` met meerdere LIKE-patterns.
  const sourceFilter = 'source.like.clp_%,source.like.dehofman_portal%'
  const buildQuery = () => supa.from('leads').select(baseSelect).or(sourceFilter).not('phone', 'is', null).not('phone_normalized', 'is', null).not('email', 'is', null).lte('earliest_outbound_at', nowIso).or('inbound_detected.is.null,inbound_detected.eq.false').order('earliest_outbound_at', { ascending: true }).limit(limit)
  const a = await buildQuery().is('non_inbound_outbound_status', null)
  if (a.error) return { data: [], error: a.error.message }
  const remaining = Math.max(0, limit - (a.data?.length ?? 0))
  let b: { data: LeadRow[] | null; error: { message: string } | null } = { data: [], error: null }
  if (remaining > 0) {
    b = await buildQuery().eq('non_inbound_outbound_status', 'pending').limit(remaining)
    if (b.error) return { data: [], error: b.error.message }
  }
  const merged = [...((a.data ?? []) as LeadRow[]), ...((b.data ?? []) as LeadRow[])]
  const seen = new Set<string>()
  const dedup = merged.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
  return { data: dedup, error: null }
}

async function selectLeadsByIds(supa: SupabaseClient, ids: string[]): Promise<{ data: LeadRow[]; error: string | null }> {
  if (ids.length === 0) return { data: [], error: null }
  const baseSelect = 'id, source, session_id, project, first_name, email, phone, phone_normalized, persona, intent_id, size_id, timeline_id, afhaak_reason, attributes, non_inbound_outbound_status, ai_followup_message, ai_followup_input_hash'
  const { data, error } = await supa.from('leads').select(baseSelect).in('id', ids)
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as LeadRow[], error: null }
}

interface GeminiFollowupResult {
  ok: boolean
  message?: string
  hash?: string
  source?: 'fresh' | 'cache'
  error?: string
  detail?: string
}

async function callGeminiFollowup(url: string, serviceKey: string, leadId: string, snapshot: Record<string, unknown>): Promise<GeminiFollowupResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
      body: JSON.stringify({ lead_id: leadId, snapshot, skip_if_fresh: true }),
    })
    const text = await res.text()
    let parsed: GeminiFollowupResult
    try { parsed = JSON.parse(text) } catch { return { ok: false, error: 'gemini_followup_non_json', detail: text.slice(0, 300) } }
    if (!res.ok && !parsed.ok) return { ok: false, error: parsed.error ?? `gemini_followup_${res.status}`, detail: parsed.detail }
    return parsed
  } catch (err) { return { ok: false, error: 'gemini_followup_fetch_failed', detail: (err as Error).message } }
}

interface N8nCallResult { ok: boolean; status: number; body: unknown; error?: string }

async function callN8n(url: string, token: string | null, payload: Record<string, unknown>): Promise<N8nCallResult> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['x-webhook-token'] = token
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })
    const text = await res.text()
    let body: unknown = text
    try { body = JSON.parse(text) } catch { /* response can be plain text */ }
    if (!res.ok) return { ok: false, status: res.status, body, error: `n8n_${res.status}` }
    return { ok: true, status: res.status, body }
  } catch (err) { return { ok: false, status: 0, body: null, error: (err as Error).message } }
}

interface QueueRow { id: string; status: string; attempts: number; ai_followup_message: string | null }

async function upsertQueueEntry(supa: SupabaseClient, lead: LeadRow, messageType: string, message: string, payload: Record<string, unknown>): Promise<{ row: QueueRow | null; error: string | null }> {
  const insertRow = {
    lead_id: lead.id, source: lead.source ?? '', session_id: lead.session_id ?? '',
    project: lead.project, first_name: lead.first_name, email: lead.email,
    phone: lead.phone, phone_normalized: lead.phone_normalized,
    message_type: messageType, ai_followup_message: message, payload, status: 'pending',
  }
  const { data, error } = await supa.from('whatsapp_outbound_queue').upsert(insertRow, { onConflict: 'lead_id,message_type' }).select('id, status, attempts, ai_followup_message').single()
  if (error) return { row: null, error: error.message }
  return { row: data as QueueRow, error: null }
}

async function markQueueSent(supa: SupabaseClient, queueId: string, n8nResponse: unknown): Promise<string | null> {
  const { error } = await supa.from('whatsapp_outbound_queue').update({ status: 'sent_to_n8n', sent_to_n8n_at: new Date().toISOString(), n8n_response: n8nResponse, last_error: null }).eq('id', queueId)
  return error?.message ?? null
}

async function markQueueFailed(supa: SupabaseClient, queueId: string, errorText: string, currentAttempts: number): Promise<string | null> {
  const { error } = await supa.from('whatsapp_outbound_queue').update({ status: 'failed', last_error: errorText.slice(0, 500), attempts: currentAttempts + 1 }).eq('id', queueId)
  return error?.message ?? null
}

async function setLeadOutboundStatus(supa: SupabaseClient, leadId: string, status: string): Promise<string | null> {
  const { error } = await supa.from('leads').update({ non_inbound_outbound_status: status }).eq('id', leadId)
  return error?.message ?? null
}

async function processLead(lead: LeadRow, supa: SupabaseClient, geminiUrl: string, serviceKey: string, n8nUrl: string | null, n8nToken: string | null, skipN8n: boolean, result: DispatchResult): Promise<void> {
  result.processed++
  const attrs = (lead.attributes ?? {}) as Record<string, unknown>
  const flags = (attrs.flags ?? {}) as Record<string, unknown>
  const snapshot = {
    first_name: lead.first_name ?? null,
    persona: lead.persona ?? null,
    intent_id: lead.intent_id ?? null,
    size_id: lead.size_id ?? null,
    timeline_id: lead.timeline_id ?? null,
    afhaak_reason: lead.afhaak_reason ?? null,
    financing_interest: !!flags.credionRequested,
    brochure_requested: !!flags.brochureRequested,
    email: lead.email ?? null,
    project_name: lead.project ?? null,
    project_city: null,
  }
  const messageType = messageTypeFor(lead.afhaak_reason)

  // v18: alleen CLP-leads krijgen Gemini-personalisatie. Walk-in leads
  // (source begint NIET met clp_) gebruiken de static template uit
  // outbound_settings direct met placeholders zoals {first_name}.
  let aiSummary = ''
  if (shouldCallGemini(lead.source)) {
    const gem = await callGeminiFollowup(geminiUrl, serviceKey, lead.id, snapshot)
    if (!gem.ok || !gem.message) {
      result.failed++
      result.errors.push({ lead_id: lead.id, stage: 'gemini', error: `${gem.error ?? 'unknown'}${gem.detail ? `: ${gem.detail.slice(0, 120)}` : ''}` })
      return
    }
    aiSummary = gem.message
  }

  const templateLookup = await fetchOutboundTemplate(supa, lead.project, 1)
  if (templateLookup.error) result.errors.push({ lead_id: lead.id, stage: 'template_lookup', error: templateLookup.error })
  const renderedMessage = renderOutboundTemplate(templateLookup.setting?.message_template, lead, aiSummary)
  const { data: existingRow } = await supa.from('whatsapp_outbound_queue').select('id, status, attempts').eq('lead_id', lead.id).eq('message_type', messageType).maybeSingle()
  if (existingRow && (existingRow.status === 'sent_to_n8n' || existingRow.status === 'sent')) { result.skipped++; return }
  const queuePayload = {
    lead_id: lead.id, source: lead.source, session_id: lead.session_id, project: lead.project,
    first_name: lead.first_name, email: lead.email, phone: lead.phone, phone_normalized: lead.phone_normalized,
    message_type: messageType, message: renderedMessage, ai_summary: aiSummary, ai_followup_message: aiSummary,
    template_stage: 1, template_project: templateLookup.setting?.project ?? lead.project,
    template_id: templateLookup.setting?.id ?? null, template_used: templateLookup.setting?.message_template ?? '{ai_summary}',
    snapshot, attributes: attrs, queued_at: new Date().toISOString(),
  }
  const upsert = await upsertQueueEntry(supa, lead, messageType, aiSummary, queuePayload)
  if (!upsert.row) { result.failed++; result.errors.push({ lead_id: lead.id, stage: 'queue_upsert', error: upsert.error ?? 'unknown' }); return }
  const queueRow = upsert.row
  if (skipN8n || !n8nUrl) { result.skipped++; return }
  const n8nBody = {
    lead_id: lead.id, queue_id: queueRow.id, source: lead.source, session_id: lead.session_id, project: lead.project,
    name: lead.first_name, first_name: lead.first_name, email: lead.email, phone: lead.phone, phone_normalized: lead.phone_normalized,
    message_type: messageType, message: renderedMessage, ai_summary: aiSummary, ai_followup_message: aiSummary,
    template_stage: 1, template_id: templateLookup.setting?.id ?? null, attributes: attrs, sent_at_iso: new Date().toISOString(),
  }
  const n8nRes = await callN8n(n8nUrl, n8nToken, n8nBody)
  if (n8nRes.ok) {
    const errMark = await markQueueSent(supa, queueRow.id, n8nRes.body)
    const errLead = await setLeadOutboundStatus(supa, lead.id, 'queued')
    if (errMark || errLead) result.errors.push({ lead_id: lead.id, stage: 'post_n8n_writeback', error: errMark ?? errLead ?? 'unknown' })
    result.sent++
  } else {
    const errMark = await markQueueFailed(supa, queueRow.id, `${n8nRes.error ?? `status_${n8nRes.status}`}: ${typeof n8nRes.body === 'string' ? n8nRes.body.slice(0, 200) : JSON.stringify(n8nRes.body).slice(0, 200)}`, queueRow.attempts ?? 0)
    if (errMark) result.errors.push({ lead_id: lead.id, stage: 'queue_mark_failed', error: errMark })
    result.failed++
    result.errors.push({ lead_id: lead.id, stage: 'n8n', error: n8nRes.error ?? `status_${n8nRes.status}` })
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const GEMINI_URL = Deno.env.get('GEMINI_FOLLOWUP_URL') ?? (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/gemini-followup` : null)
  const N8N_URL = Deno.env.get('N8N_OUTBOUND_WEBHOOK_URL') ?? null
  const N8N_TOKEN = Deno.env.get('N8N_OUTBOUND_WEBHOOK_TOKEN') ?? null
  const DEFAULT_LIMIT = Number.parseInt(Deno.env.get('OUTBOUND_DEFAULT_LIMIT') ?? '50', 10)
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, error: 'server_misconfigured', detail: 'supabase env missing' }, 500)
  if (!GEMINI_URL) return json({ ok: false, error: 'server_misconfigured', detail: 'GEMINI_FOLLOWUP_URL missing' }, 500)
  if (!isAuthorized(req, SERVICE_KEY)) return json({ ok: false, error: 'unauthorized' }, 401)
  let body: RequestBody = {}
  try {
    const text = await req.text()
    if (text.trim().length > 0) body = JSON.parse(text) as RequestBody
  } catch { return json({ ok: false, error: 'bad_json' }, 400) }
  const dryRun = !!body.dry_run
  const skipN8n = !!body.skip_n8n
  const limit = Math.max(1, Math.min(500, Number.isFinite(body.limit) ? Number(body.limit) : (Number.isFinite(DEFAULT_LIMIT) ? DEFAULT_LIMIT : 50)))
  if (!skipN8n && !N8N_URL && !dryRun) return json({ ok: false, error: 'server_misconfigured', detail: 'N8N_OUTBOUND_WEBHOOK_URL missing (set skip_n8n=true to bypass)' }, 500)
  const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  let leads: LeadRow[]
  if (Array.isArray(body.lead_ids) && body.lead_ids.length > 0) {
    const sel = await selectLeadsByIds(supa, body.lead_ids)
    if (sel.error) return json({ ok: false, error: 'select_failed', detail: sel.error }, 500)
    leads = sel.data
  } else {
    const sel = await selectLeadsByFilter(supa, limit)
    if (sel.error) return json({ ok: false, error: 'select_failed', detail: sel.error }, 500)
    leads = sel.data
  }
  if (dryRun) {
    const preview = leads.map(l => ({ lead_id: l.id, message_type: messageTypeFor(l.afhaak_reason), reason: l.afhaak_reason ? `afhaak: ${l.afhaak_reason}` : (l.non_inbound_outbound_status ?? 'NULL') + ' / no afhaak' }))
    return json({ ok: true, processed: leads.length, sent: 0, failed: 0, skipped: 0, errors: [], preview, dry_run: true })
  }
  const result: DispatchResult = { processed: 0, sent: 0, failed: 0, skipped: 0, errors: [] }
  for (const lead of leads) await processLead(lead, supa, GEMINI_URL, SERVICE_KEY, skipN8n ? null : N8N_URL, N8N_TOKEN, skipN8n, result)
  return json({ ok: true, ...result })
})
