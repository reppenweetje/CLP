// Vercel serverless endpoint dat een hot-lead notificatie naar Slack stuurt.
// Webhook-URL staat in env (SLACK_WEBHOOK_URL) zodat het secret niet client-
// side leakt. Slack-app heet "Hothothot" en post in #hot-clp-leads.
//
// Trigger sinds mei 2026: alleen expliciete callback-aanvragen (bezoeker
// klikt "Laat de makelaar mij bellen"). De `trigger`-payload-key bevat
// 'callback-requested', score+signals dienen als context voor sales.
//
// Body schema, alle velden optioneel behalve persona/temperature/score:
//   { firstName, email, phone, persona, temperature, score, signals,
//     intent, size, timeline, trigger, units, behaviors, sessionId, source }
//
// Best-effort: API geeft 204 bij succes, 502 als Slack faalt, 4xx bij invalid
// payload. Frontend negeert failures zodat een Slack-uitval de chat-flow niet
// blokkeert.

export default async function handler(req, res) {
  // Vercel routes /api/slack-hot.js automatisch op /api/slack-hot. Methode
  // beperken tot POST om accidental GET-pings te voorkomen.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  const webhook = process.env.SLACK_WEBHOOK_URL
  if (!webhook) {
    // Bewust 503 ipv 500 zodat een ontbrekende env-var herkenbaar blijft in
    // logs zonder dat de frontend in een retry-loop schiet.
    return res.status(503).json({ error: 'webhook-not-configured' })
  }

  let body = req.body
  // Vercel parseert JSON al voor ons als content-type application/json klopt.
  // Voor robuustheid accepteren we ook een raw string.
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  body = body || {}

  // Minimal validation: temperature moet hot zijn anders is dit endpoint niet
  // de juiste route. Voorkomt dat per ongeluk warm/cold leads doorgaan.
  if (body.temperature && body.temperature !== 'hot') {
    return res.status(202).json({ skipped: 'not-hot' })
  }

  const text = formatSlackText(body)
  const blocks = formatSlackBlocks(body)

  try {
    const slackRes = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, blocks }),
    })
    if (!slackRes.ok) {
      const detail = await slackRes.text().catch(() => '')
      return res.status(502).json({ error: 'slack-rejected', status: slackRes.status, detail: detail.slice(0, 200) })
    }
    return res.status(204).end()
  } catch (err) {
    return res.status(502).json({ error: 'slack-fetch-failed', message: String(err?.message || err).slice(0, 200) })
  }
}

// Plain-text fallback die in notification-popups wordt getoond als Slack
// blocks niet kan renderen.
function formatSlackText(p) {
  const name = p.firstName || 'Onbekende lead'
  const score = typeof p.score === 'number' ? ` (score ${p.score})` : ''
  const persona = p.persona ? `, ${labelForPersona(p.persona)}` : ''
  return `Hot lead${persona}${score}: ${name}`
}

// Block kit-bericht voor de message body. Houdt het beknopt, sales kan vanuit
// hier doorklikken naar het CLP-admin-paneel voor de full session-replay.
function formatSlackBlocks(p) {
  const lines = []
  const name = p.firstName || 'Nog niet'
  const email = p.email || 'Nog niet'
  const phone = p.phone || 'Nog niet'
  const persona = labelForPersona(p.persona)
  const score = typeof p.score === 'number' ? `${p.score}` : 'Nog niet'
  const signals = Array.isArray(p.signals) ? p.signals : []

  // Header expliciet de aanleiding noemen zodat sales bij het zien van de
  // notificatie meteen weet dat dit geen achtergrond-score-trigger is maar
  // een directe terugbel-aanvraag waar binnen kantooruren op gereageerd
  // moet worden.
  const isCallback = p.trigger === 'callback-requested'
  lines.push({
    type: 'header',
    text: {
      type: 'plain_text',
      text: isCallback ? '📞 Callback verzocht op CLP' : '🔥 Hot lead op CLP',
      emoji: true,
    },
  })

  if (isCallback) {
    lines.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: 'Bezoeker vroeg expliciet om teruggebeld te worden.' }],
    })
  }

  lines.push({
    type: 'section',
    fields: [
      { type: 'mrkdwn', text: `*Naam*\n${escapeMrkdwn(name)}` },
      { type: 'mrkdwn', text: `*Persona*\n${escapeMrkdwn(persona)}` },
      { type: 'mrkdwn', text: `*E-mail*\n${escapeMrkdwn(email)}` },
      { type: 'mrkdwn', text: `*06*\n${escapeMrkdwn(phone)}` },
      { type: 'mrkdwn', text: `*Score*\n${score}` },
      { type: 'mrkdwn', text: `*Temperatuur*\n${escapeMrkdwn(p.temperature || 'hot')}` },
    ],
  })

  const intent = p.intent || ''
  const size = p.size || ''
  const timeline = p.timeline || ''
  if (intent || size || timeline) {
    const ctxParts = []
    if (intent) ctxParts.push(`Intent: ${intent}`)
    if (size) ctxParts.push(`m²: ${size}`)
    if (timeline) ctxParts.push(`Timeline: ${timeline}`)
    lines.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: ctxParts.map(escapeMrkdwn).join('  |  ') }],
    })
  }

  if (signals.length > 0) {
    const top = signals.slice(0, 5).map((s) => `• ${escapeMrkdwn(typeof s === 'string' ? s : s.id || '')}`).join('\n')
    lines.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Top signalen*\n${top}` },
    })
  }

  if (p.sessionId) {
    lines.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Session \`${escapeMrkdwn(String(p.sessionId).slice(0, 24))}\`` }],
    })
  }

  return lines
}

function labelForPersona(p) {
  switch (p) {
    case 'eigen_gebruiker': return 'Eigen gebruiker'
    case 'belegger': return 'Belegger'
    case 'beide': return 'Beide'
    case 'huurder': return 'Huurder'
    case 'onbekend': return 'Onbekend'
    default: return p || 'Onbekend'
  }
}

// Slack mrkdwn escape, voornamelijk om `<` `>` `&` te ontsnappen die anders
// als Slack-formatting worden geinterpreteerd. We strippen ook controle-chars
// zodat een lead-veld de markdown niet kapot kan maken.
function escapeMrkdwn(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\x00-\x1f]/g, ' ')
    .slice(0, 500)
}
