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

// Project-agnostisch unit-recommendation. Gebruikt het `unit`-veld van de
// size-optie die de bezoeker heeft gekozen om de bijbehorende unit-type in
// project.units te vinden. Werkt voor elk project zolang de size-opties
// een `unit`-veld hebben (zie flow.questions.size.options voor De Hofman
// en project.flowOverrides.sizeQuestion.options voor andere projecten).
//
// Fallback-strategie:
//   1. Match op size.unit → primary
//   2. Geen match → eerste available unit als primary
//   3. fallback = eerste andere available unit, anders eerste niet-primary
//   4. note generated als primary state = coming_soon
export function recommendUnit(answers, project) {
  const units = project.units || []
  if (units.length === 0) return { primary: null, fallback: null, note: null }

  // 1. Probeer op basis van size.unit (de option-keuze van de bezoeker).
  const preferredType = answers.size?.unit
  let primary = preferredType ? units.find((u) => u.type === preferredType) : null

  // 2. Geen voorkeur of preferred type bestaat niet → eerste available.
  if (!primary) {
    primary = units.find((u) => u.state === 'available') || units[0]
  }

  // 3. Fallback = eerste andere available, anders eerste niet-primary unit.
  const fallback =
    units.find((u) => u !== primary && u.state === 'available') ||
    units.find((u) => u !== primary) ||
    null

  // 4. Note bij coming_soon zodat de bezoeker weet dat 't nog niet kan.
  let note = null
  if (primary?.state === 'coming_soon') {
    note = `${primary.type} volgt later in verkoop. We kunnen je op de interesselijst zetten.`
    if (fallback?.state === 'available') {
      note += ` Tot die tijd is de ${fallback.type}-unit het meest concreet beschikbaar.`
    }
  }

  return { primary, fallback, note }
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

export function recommendCopy(persona, project) {
  // Wanneer een project wordt meegegeven lezen we de copy uit
  // project.personaCopy, zodat dezelfde codepath voor elk project werkt.
  // Voor backwards-compat blijft een hardcoded fallback bestaan, maar nieuwe
  // call-sites moeten altijd `project` meegeven.
  if (project?.personaCopy) {
    const copy = project.personaCopy[persona] || project.personaCopy.onbekend
    if (copy?.recommendCopy) return copy.recommendCopy
  }
  if (persona === 'belegger') {
    return 'Voor jou tellen vooral verhuurbaarheid, schaarste en prijs per m².'
  }
  if (persona === 'eigen_gebruiker') {
    return 'Dan zijn vooral bereikbaarheid, parkeren en flexibele indeling belangrijk.'
  }
  if (persona === 'beide') {
    return 'Dan kijken we vanuit beide kanten.'
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
  const projectName = project.displayName || project.name
  const opener = name
    ? `Hoi REPP, ik ben ${name} en heb interesse in ${projectName}.`
    : `Hoi REPP, ik heb interesse in ${projectName}.`
  const text = encodeURIComponent(`${opener}${summary ? ' ' + summary : ''}`)
  return `https://wa.me/${num}?text=${text}`
}

// Bouwt een natuurlijk klinkende, klant-stem samenvatting van de gegeven
// antwoorden. Bedoeld voor het prefilled WhatsApp-bericht en voor de
// "Jouw interesse"-strook in de cta-card. Bewust geen interne taal als
// "lead", "match", "signaal" of "flow" — de bezoeker mag zichzelf nooit
// als lead zien. Wel persoonlijke ik-voorkeur.
//
// Optionele `project` arg laat een project zijn eigen waPhrase per persona
// opgeven via `project.personaCopy[persona].waPhrase`.
export function buildCustomerWaSummary(answers, project) {
  const persona = answers?.intent?.persona
  const sizeId = answers?.size?.id
  const tlId = answers?.timeline?.id

  const overridePhrase = project?.personaCopy?.[persona]?.waPhrase
  const personaPhrase = overridePhrase ||
    (persona === 'belegger'
      ? 'Ik kijk als belegger'
      : persona === 'eigen_gebruiker'
      ? 'Ik zoek voor mijn eigen bedrijf'
      : persona === 'beide'
      ? 'Ik kijk zowel voor eigen gebruik als belegging'
      : null)

  const sizePhrase =
    sizeId === 'tot_50'
      ? 'rond 50 m²'
      : sizeId === 'rond_100'
      ? 'rond 100 m²'
      : sizeId === 'meer_dan_100'
      ? 'groter dan 100 m²'
      : null

  const tlPhrase =
    tlId === 'zsm'
      ? 'zo snel mogelijk'
      : tlId === '3mnd'
      ? 'binnen 3 maanden'
      : tlId === '6mnd'
      ? 'binnen 6 maanden'
      : tlId === 'dit_jaar'
      ? 'later dit jaar'
      : null

  const trail = [sizePhrase, tlPhrase].filter(Boolean)

  if (personaPhrase && trail.length > 0) return `${personaPhrase}, ${trail.join(', ')}.`
  if (personaPhrase) return `${personaPhrase}.`
  if (trail.length > 0) return `Ik zoek ${trail.join(', ')}.`
  return ''
}

// Klant-stem samenvatting voor het afhaak-pad. Geen "niet matchend"-stempel.
export function customerAfhaakSummary(reasonId) {
  switch (reasonId) {
    case 'prijs':
      return 'De prijs past niet helemaal bij wat ik zoek.'
    case 'locatie':
      return 'De locatie past niet bij wat ik zoek.'
    case 'oppervlakte':
      return 'De oppervlakte past niet bij mijn behoefte.'
    case 'huur':
      return 'Ik zoek eerder huur dan koop.'
    case 'anders':
    default:
      return 'Mijn wensen passen denk ik niet helemaal bij dit project, maar ik denk graag mee.'
  }
}

// Klant-stem samenvatting voor het rent-match pad. Range-label wordt
// rechtstreeks overgenomen — die is al klant-leesbaar.
export function customerRentSummary(rangeLabel) {
  if (!rangeLabel) return 'Ik ben op zoek naar een huur unit in plaats van koop.'
  return `Ik ben op zoek naar een huur unit, rond ${rangeLabel.toLowerCase()} per m² per jaar.`
}
