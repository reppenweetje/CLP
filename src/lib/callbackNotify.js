// callbackNotify — fired wanneer een lead in de chat op "Laat de makelaar
// mij bellen" klikt. Roept de Supabase Edge Function `callback-request`
// aan, die op zijn beurt een Slack-bericht naar het #callbacks kanaal
// stuurt.
//
// Server-side (Edge Function) ipv direct vanuit de browser zodat de
// Slack webhook URL niet in het JS-bundle terechtkomt. Secret leeft in
// Supabase als SLACK_CALLBACK_WEBHOOK_URL.
//
// Fire-and-forget: faalt nooit de UX. Errors → console.warn alleen.

function readEnv(key, fallback) {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const v = import.meta.env[key]
    if (v != null && v !== '') return v
  }
  return fallback
}

function endpoint() {
  const base = readEnv('VITE_SUPABASE_URL', '')
  if (!base) return null
  return base.replace(/\/+$/, '') + '/functions/v1/callback-request'
}

function anonKey() {
  return readEnv('VITE_SUPABASE_ANON_KEY', '')
}

function isEnabled() {
  const flag = readEnv('VITE_SUPABASE_ENABLED', 'true')
  return String(flag).toLowerCase() !== 'false'
}

export async function notifyCallbackRequest({ lead, project, source, context }) {
  if (!isEnabled()) return { ok: true, skipped: 'supabase_disabled' }
  const url = endpoint()
  const key = anonKey()
  if (!url || !key) {
    console.warn('[callbackNotify] supabase env not configured, skipping')
    return { ok: true, skipped: 'env_missing' }
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      body: JSON.stringify({
        lead: {
          firstName: lead?.firstName ?? null,
          email: lead?.email ?? null,
          phone: lead?.phone ?? null,
        },
        project: project ?? null,
        source: source ?? 'warm-handoff',
        context: context ?? {},
      }),
    })
    if (!res.ok) {
      console.warn('[callbackNotify] non-2xx', res.status)
      return { ok: false, status: res.status }
    }
    return { ok: true }
  } catch (err) {
    console.warn('[callbackNotify] fetch failed', err)
    return { ok: false, error: String(err?.message || err) }
  }
}
