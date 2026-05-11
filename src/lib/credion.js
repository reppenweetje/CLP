// Credion webhook helper.
// Stuurt de lead-gegevens plus project-context naar de configureerde URL.
// In demo-mode (wanneer URL nog REPLACE bevat) doen we een console.log
// zodat developers zien wat er gestuurd zou worden zonder echt POST'en.
//
// CORS-strategie: Zapier's Catch Hook accepteert multipart/form-data
// cross-origin zonder preflight (FormData is een CORS-safelisted
// content-type) plus geeft Access-Control-Allow-Origin terug, dus
// browser laat de response gewoon door. Eerdere versies probeerden
// Content-Type application/json (triggert preflight die Zapier niet
// honoreert) of mode no-cors (gaf opaque false-503 errors in Chrome's
// DevTools). Met plain FormData + default cors-mode lopen requests
// soepel door en kunnen we Zapier's success-response zelfs lezen.

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
  // Calc-snapshot (slider-waarden uit MortgageCalc of RentabilityCalc) wordt
  // flat meegestuurd met een calc_ prefix zodat Credion in Zapier elk veld
  // als losse trigger-parameter ziet: calc_kind, calc_downPayment, etc.
  const calc = extras.calc && typeof extras.calc === 'object' ? extras.calc : null
  const calcFlat = {}
  if (calc) {
    Object.entries(calc).forEach(([key, val]) => {
      calcFlat['calc_' + key] = val
    })
  }
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
    ...calcFlat,
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
    const res = await fetch(url, {
      method: 'POST',
      body: toFormData(payload),
      keepalive: true,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      if (typeof console !== 'undefined') {
        console.warn('[credion] non-2xx', res.status, detail.slice(0, 200))
      }
      return { ok: false, status: res.status, mode: 'live' }
    }
    return { ok: true, status: res.status, mode: 'live' }
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('[credion] webhook failed', e)
    }
    return { ok: false, error: String(e?.message || e), mode: 'live' }
  }
}
