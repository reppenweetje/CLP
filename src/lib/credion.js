// Credion webhook helper.
// Stuurt de lead-gegevens plus project-context naar de configureerde URL.
// In demo-mode (wanneer URL nog REPLACE bevat) doen we een console.log
// zodat developers zien wat er gestuurd zou worden zonder echt POST'en.

export async function sendCredionLead(lead, project, extras = {}) {
  const url = project?.credionWebhookUrl
  const payload = {
    source: 'REPP CLP',
    project: project?.displayName || project?.name,
    projectId: project?.id,
    lead,
    timestamp: new Date().toISOString(),
    ...extras,
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
