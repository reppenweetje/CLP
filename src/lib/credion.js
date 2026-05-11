// Credion webhook helper.
// Stuurt de lead-gegevens plus project-context naar de configureerde URL.
// In demo-mode (wanneer URL nog REPLACE bevat) doen we een console.log
// zodat developers zien wat er gestuurd zou worden zonder echt POST'en.
//
// Payload-structuur: alle relevante lead-velden staan top-level zodat
// Zapier's Catch Hook ze als losse parameters kan oppikken. Een eerdere
// versie nestte ze onder `lead: {...}` waardoor Zapier de fields niet
// als losse trigger-velden zag en de Zap een lege payload kreeg.
// `_lead` blijft als volledig object meegestuurd voor debug-mogelijkheid.

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
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
    return { ok: res.ok, status: res.status, mode: 'live' }
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('[credion] webhook failed', e)
    }
    return { ok: false, error: String(e?.message || e), mode: 'live' }
  }
}
