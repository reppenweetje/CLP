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
// blocks niet kan renderen. Bewust kort want push-popup heeft maar 1 of 2
// regels ruimte. Bij callback-trigger is de actie het belangrijkste, niet
// de score of persona.
function formatSlackText(p) {
  const isCallback = p.trigger === 'callback-requested'
  const name = cleanName(p.firstName)
  const phone = p.phone ? ` (${p.phone})` : ''
  if (isCallback) {
    return `Callback verzocht: ${name}${phone}`
  }
  const persona = p.persona ? `, ${labelForPersona(p.persona)}` : ''
  return `Hot lead${persona}: ${name}`
}

// Block kit-bericht voor de message body. Geoptimaliseerd voor de callback-
// trigger sinds mei 2026. Lay-out:
//   1. Header met naam zodat sales in de channel-preview meteen ziet wie
//   2. Telefoonnummer prominent en clickable als tel:-deeplink
//   3. Persona + intent + size + timeline op één scan-rij
//   4. Action-buttons: Bel / WhatsApp / Mail (allemaal deeplinks)
//   5. Divider
//   6. Kwalificatie-context (score + top 3 signal-labels)
//   7. Footer (email + tijdstip met kantooruren-context + sessionId)
function formatSlackBlocks(p) {
  const lines = []
  const isCallback = p.trigger === 'callback-requested'
  const name = cleanName(p.firstName)
  const persona = labelForPersona(p.persona)
  const phoneE164 = toE164(p.phone)
  const phoneDisplay = formatPhoneDisplay(p.phone)
  const signals = Array.isArray(p.signals) ? p.signals : []

  // 1. Header: naam plus actie zodat de channel-preview in Slack meteen
  // duidelijk maakt wie er belt om hulp en wat van sales verwacht wordt.
  lines.push({
    type: 'header',
    text: {
      type: 'plain_text',
      text: isCallback ? `📞 ${name} wil teruggebeld worden` : `🔥 Hot lead: ${name}`,
      emoji: true,
    },
  })

  // 2. Telefoonnummer prominent in een aparte section. Bij callback-flow
  // is dit het hoofd-veld want sales moet bellen. Tel:-link werkt op
  // Slack mobile native, op desktop opent associated phone-app of toont
  // 'm fallback als selecteerbare tekst.
  if (phoneE164) {
    lines.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*<tel:${phoneE164}|${escapeMrkdwn(phoneDisplay)}>*`,
      },
    })
  } else {
    lines.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*Geen 06 doorgegeven*' },
    })
  }

  // 3. Korte scan-rij met persona, intent, m² en timeline. Bewust geen
  // labels (Persona: / Intent: /...) want bij 4 velden op één rij zorgen
  // labels alleen voor visuele ruis. Sales weet de volgorde uit ervaring.
  const summary = []
  if (persona && persona !== 'Onbekend') summary.push(persona)
  if (p.intent) summary.push(p.intent)
  if (p.size) summary.push(p.size)
  if (p.timeline) summary.push(p.timeline)
  if (summary.length > 0) {
    lines.push({
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: summary.map(escapeMrkdwn).join('  |  '),
      }],
    })
  }

  // 4. Action-buttons: één-tap actie. Bel direct krijgt primary (groen)
  // styling want dat is de gevraagde actie, WhatsApp en Mail zijn neutrale
  // alternatieven. wa.me deeplink werkt cross-device, mailto idem.
  const actions = []
  if (phoneE164) {
    actions.push({
      type: 'button',
      text: { type: 'plain_text', text: '📞 Bel direct', emoji: true },
      url: `tel:${phoneE164}`,
      style: 'primary',
    })
    actions.push({
      type: 'button',
      text: { type: 'plain_text', text: '💬 WhatsApp', emoji: true },
      url: `https://wa.me/${phoneE164.replace(/^\+/, '')}`,
    })
  }
  if (p.email) {
    actions.push({
      type: 'button',
      text: { type: 'plain_text', text: '✉️ Mail', emoji: true },
      url: `mailto:${p.email}`,
    })
  }
  if (actions.length > 0) {
    lines.push({ type: 'actions', elements: actions })
  }

  lines.push({ type: 'divider' })

  // 6. Kwalificatie: score plus top 3 signal-labels. Frontend stuurt
  // signals nu als objecten met label-veld (zie buyingSignals SIGNAL_DEFS),
  // legacy string-arrays vallen terug op de id zodat oude betas niet breken.
  const qualParts = []
  if (typeof p.score === 'number') qualParts.push(`Score *${p.score}*`)
  if (signals.length > 0) {
    const labels = signals
      .slice(0, 3)
      .map((s) => (typeof s === 'string' ? s : s.label || s.id || ''))
      .filter(Boolean)
      .map(escapeMrkdwn)
    if (labels.length > 0) qualParts.push(`top: ${labels.join(', ')}`)
  }
  if (qualParts.length > 0) {
    lines.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: qualParts.join('  |  ') }],
    })
  }

  // 7. Footer met email, tijdstip en sessieID. De tijd-context (kantooruren
  // / avond / weekend) helpt sales prioriteren: een avond-aanvraag mag
  // tot ochtend wachten, een aanvraag midden in de werkdag verdient acute
  // opvolging. SessionID is afgekort tot 12 chars want alleen voor
  // admin-paneel filtering, full UUID is overbodig in de slack-preview.
  const footer = []
  if (p.email) footer.push(`✉️ ${escapeMrkdwn(p.email)}`)
  footer.push(`Aangevraagd ${formatRequestTime()}`)
  if (p.sessionId) {
    footer.push(`session \`${escapeMrkdwn(String(p.sessionId).slice(0, 12))}\``)
  }
  lines.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: footer.join('  |  ') }],
  })

  return lines
}

// Naam-fallback. Strip whitespace + rare chars en val terug op "Iemand"
// als er niets bruikbaars is. Voorkomt dat een lege string of "  " als
// naam in de header eindigt.
function cleanName(name) {
  const s = String(name || '').trim().replace(/[\x00-\x1f]/g, '')
  return s || 'Iemand'
}

// Naar E.164 vorm voor tel:- en wa.me-deeplinks. Nederlandse mobielnummers
// (06... of 0031 6...) krijgen +31 prefix, andere nummers blijven met +
// of 00 zoals ze zijn. Lege of niet-numerieke input retourneert lege string.
function toE164(phone) {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '')
  if (!cleaned) return ''
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('00')) return '+' + cleaned.slice(2)
  if (cleaned.startsWith('0')) return '+31' + cleaned.slice(1)
  return '+' + cleaned
}

// Display-formaat voor Nederlandse mobiele nummers met spaties tussen
// blokjes voor leesbaarheid in Slack. Buitenlandse of niet-herkende
// formaten retourneren we ongeformatteerd zodat sales 'em alsnog ziet.
function formatPhoneDisplay(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('06')) {
    return `06 ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
  }
  if (digits.length === 11 && digits.startsWith('316')) {
    return `+31 6 ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`
  }
  return phone || ''
}

// Tijdstip plus dag-context in NL. Vercel runtime is UTC dus we forceren
// Europe/Amsterdam timezone. Context kantooruren/avond/weekend helpt sales
// prioriteren. Zaterdag/zondag zijn weekend, 09-17 op werkdagen is
// kantooruren, daarbuiten avond of buiten kantooruren.
function formatRequestTime(now = new Date()) {
  // Aparte format-call voor enkel hour+weekday in en-US zodat we
  // betrouwbare keys hebben (Sat/Sun). NL-formatter doet de display.
  const en = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(now)
  const enHour = parseInt(en.find((x) => x.type === 'hour')?.value || '0', 10)
  const enDay = en.find((x) => x.type === 'weekday')?.value || ''
  const isWeekend = enDay === 'Sat' || enDay === 'Sun'

  let context = 'binnen kantooruren'
  if (isWeekend) context = 'weekend'
  else if (enHour < 9 || enHour >= 17) context = 'buiten kantooruren'

  const display = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now)

  return `${display} (${context})`
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
