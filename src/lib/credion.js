// Credion webhook helper.
// Stuurt de lead-gegevens plus project-context naar de configureerde URL.
// In demo-mode (wanneer URL nog REPLACE bevat) doen we een console.log
// zodat developers zien wat er gestuurd zou worden zonder echt POST'en.
//
// CORS-strategie: Zapier's Catch Hook honoreert geen preflight voor
// JSON-content-type cross-origin POSTs vanuit de browser. Eerdere versies
// stuurden Content-Type application/json en sneuvelden op CORS preflight
// waardoor Zapier ofwel niks of een lege body ontving. Nu gebruiken we
// FormData (simple request, geen preflight) plus mode: 'no-cors' zodat
// de browser de POST gegarandeerd verstuurt. De response is dan opaque
// (status 0) maar dat is OK: we hebben de response niet nodig, alleen
// de delivery telt. Zapier parse't form-fields top-level zoals gewenst.

function toFormData(payload) {
  const fd = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) return
    if (typeof value === 'object') {
      // Geneste objecten zoals _lead als JSON-string opslaan zodat Zapier
      // ze als raw veld kan oppikken indien nodig voor debug.
      try { fd.append(key, JSON.stringify(value)) } catch { /* skip */ }
      return
    }
    fd.append(key, String(value))
  })
  return fd
}

export async function sendCredionLead(lead, project, extras = {}) {
  const url = project?.credionWebhookUrl
  const safeLead = lead && typeof lead === 'object' ? lead : {}
  const payload = {
    source:    'REPP CLP',
    project:   project?.displayName || project?.name || null,
    projectId: project?.id || null,
    firstName: safeLead.firstName ?? null,
    email:     safeLead.email ?? null,
    phone:     safeLead.phone ?? null,
    intent:    extras.intent ?? null,
    size:      extras.size ?? null,
    timeline:  extras.timeline ?? null,
    timestamp: new Date().toISOString(),
    _lead:     safeLead,
  }

  if (!url || /REPLACE/i.test(url)) {
    if (typeof console !== 'undefined') {
      console.log('[credion] webhook URL not configured, payload zou zijn:', payload)
    }
    return { ok: true, mode: 'demo' }
  }

  try {
    await fetch(url, {
      method: 'POST',
      body: toFormData(payload),
      mode: 'no-cors',
      keepalive: true,
    })
    // Response is opaque door no-cors, dus we kunnen status niet lezen.
    // Geen news = goed news: de POST is daadwerkelijk verstuurd.
    return { ok: true, mode: 'live-opaque' }
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('[credion] webhook failed', e)
    }
    return { ok: false, error: String(e?.message || e), mode: 'live' }
  }
}
