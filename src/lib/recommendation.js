// welke contentcards welke unit welke salesactie passen bij dit profiel

export function recommendContentCards(answers, persona, project) {
  const ids = []
  ids.push('project', 'location')

  if (persona === 'belegger') {
    ids.push('investor', 'price', 'scarcity')
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
      note: 'xxl volgt later we kunnen je op de interesselijst zetten en tot die tijd is l het meest concreet beschikbaar',
    }
  }
  return { primary: L, fallback: XXL, note: null }
}

export function recommendCopy(persona) {
  if (persona === 'belegger') {
    return 'voor jou tellen vooral verhuur schaarste prijs per m² en kosten de hofman is kleinschalig nieuwbouw en ligt op een gevestigde bedrijvenlocatie in haarlem'
  }
  if (persona === 'eigen_gebruiker') {
    return 'dan zijn vooral bereikbaarheid overheaddeur parkeren en flexibele indeling belangrijk de hofman is ontworpen voor ondernemers die praktische ruimte combineren met een representatieve uitstraling'
  }
  return 'we zetten de juiste informatie voor je klaar brochure plattegronden prijzen en actuele beschikbaarheid'
}

export function recommendSalesAction(stage) {
  switch (stage) {
    case 'sales_ready': return 'whatsapp of bel binnen 5 minuten directe salesopvolging'
    case 'koopintentie': return 'whatsapp binnen 1 uur plan bezichtiging'
    case 'vergelijkend': return 'mail brochure plus plattegronden whatsapp nudge na 24 uur'
    case 'orienterend': return 'mail brochure plus meta retargeting whatsapp na 3 tot 5 dagen'
    case 'nieuwsgierig': return 'mail brochure plus retargeting geen actieve outreach'
    default: return 'mail brochure'
  }
}

export function thankYouCopy(stage, persona, name) {
  const lead = name ? `bedankt ${name.toLowerCase()}` : 'bedankt'
  switch (stage) {
    case 'sales_ready':
      return { lead, body: 'een collega neemt vandaag nog contact met je op je krijgt direct mail met brochure en plattegronden' }
    case 'koopintentie':
      return { lead, body: 'we sturen je nu brochure plattegronden en actuele beschikbaarheid een collega volgt binnenkort op via whatsapp' }
    case 'vergelijkend':
      return { lead, body: 'mail komt eraan met brochure plattegronden en prijsoverzicht vragen tussendoor whatsapp ons gerust' }
    case 'orienterend':
      return { lead, body: 'mail met brochure en projectoverzicht is onderweg we houden je op de hoogte van nieuwe beschikbaarheid' }
    default:
      return { lead, body: 'mail met brochure en projectoverzicht is onderweg geen druk wij melden ons als er iets relevants is' }
  }
}

export function whatsAppDeeplink(project, name, summary) {
  const num = (project.whatsappNumber || '').replace(/[^0-9]/g, '')
  const text = encodeURIComponent(
    `hi repp ik ben ${name || ''} en heb interesse in ${project.displayName || project.name}${summary ? ' ' + summary : ''}`,
  )
  return `https://wa.me/${num}?text=${text}`
}
