// Welke contentcards, welke unit, welke salesactie passen bij dit profiel.

export function recommendContentCards(answers, persona, project) {
  const ids = []
  ids.push('project', 'location')

  if (persona === 'belegger') {
    ids.push('investor', 'price', 'scarcity')
  } else if (persona === 'beide') {
    ids.push('features', 'price', 'investor', 'scarcity')
  } else {
    ids.push('features', 'price', 'scarcity')
  }

  if (answers.timeline?.id === 'zsm' || answers.timeline?.id === '3mnd') {
    ids.push('financing')
  }

  const seen = new Set()
  return ids
    .filter((id) => (seen.has(id) ? false : seen.add(id)))
    .map((id) => project.contentCards.find((c) => c.id === id))
    .filter(Boolean)
}

export function recommendUnit(answers, project) {
  const sizeId = answers.size?.id
  const L = project.units.find((u) => u.type === 'L')
  const XXL = project.units.find((u) => u.type === 'XXL')

  if (sizeId === 'meer_dan_100' || sizeId === 'zo_groot') {
    return {
      primary: XXL,
      fallback: L,
      note: 'XXL volgt later in verkoop. We kunnen je op de interesselijst zetten. Tot die tijd is de L-unit het meest concreet beschikbaar.',
    }
  }
  return { primary: L, fallback: XXL, note: null }
}

// Hoeveel signalen heeft de bezoeker gegeven? Bepaalt of we stellig
// adviseren of juist een algemener overzicht laten zien.
export function leadConfidence(answers) {
  const known = ['intent', 'timeline', 'size'].filter((k) => {
    const v = answers[k]
    return v && v.id !== 'weet_niet'
  })
  return known.length
}

export function recommendCopy(persona) {
  if (persona === 'belegger') {
    return 'Voor jou tellen vooral verhuurbaarheid, schaarste en prijs per m². De Hofman is kleinschalig, nieuwbouw en ligt op een gevestigde bedrijvenlocatie in Haarlem.'
  }
  if (persona === 'eigen_gebruiker') {
    return 'Dan zijn vooral bereikbaarheid, parkeren en flexibele indeling belangrijk. De Hofman is ontworpen voor ondernemers die praktische ruimte combineren met een representatieve uitstraling.'
  }
  if (persona === 'beide') {
    return 'Dan kijken we vanuit beide kanten. De Hofman werkt voor ondernemers die zelf willen gebruiken én voor beleggers die schaarste en locatie zoeken.'
  }
  return 'We tonen je vooral de informatie die voor jouw situatie relevant is.'
}

export function recommendSalesAction(stage) {
  switch (stage) {
    case 'sales_ready': return 'WhatsApp of bel binnen 5 minuten. Directe salesopvolging.'
    case 'koopintentie': return 'WhatsApp binnen 1 uur, plan bezichtiging.'
    case 'vergelijkend': return 'Mail brochure en plattegronden, WhatsApp nudge na 24 uur.'
    case 'orienterend': return 'Mail brochure, retargeting via Meta, WhatsApp na 3 tot 5 dagen.'
    case 'nieuwsgierig': return 'Mail brochure en retargeting, geen actieve outreach.'
    default: return 'Mail brochure.'
  }
}

export function thankYouCopy(stage, persona, name) {
  const greet = name ? `Bedankt, ${name}.` : 'Bedankt.'
  switch (stage) {
    case 'sales_ready':
      return { lead: greet, body: 'Een collega neemt vandaag nog contact met je op. Je krijgt direct mail met de brochure en plattegronden.' }
    case 'koopintentie':
      return { lead: greet, body: 'We sturen je nu de brochure, plattegronden en actuele beschikbaarheid. Een collega volgt binnenkort op via WhatsApp.' }
    case 'vergelijkend':
      return { lead: greet, body: 'De mail komt eraan met brochure, plattegronden en prijsoverzicht. Vragen tussendoor? WhatsApp ons gerust.' }
    case 'orienterend':
      return { lead: greet, body: 'De mail met brochure en projectoverzicht is onderweg. We houden je op de hoogte van nieuwe beschikbaarheid.' }
    default:
      return { lead: greet, body: 'De mail met brochure en projectoverzicht is onderweg. Geen druk; we melden ons als er iets relevants is.' }
  }
}

export function whatsAppDeeplink(project, name, summary) {
  const num = (project.whatsappNumber || '').replace(/[^0-9]/g, '')
  const text = encodeURIComponent(
    `Hoi REPP, ik ben ${name || ''} en heb interesse in ${project.displayName || project.name}.${summary ? ' ' + summary : ''}`,
  )
  return `https://wa.me/${num}?text=${text}`
}
