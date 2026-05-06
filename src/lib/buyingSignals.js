// Koopsignaal-engine. Bepaalt of de bezoeker zich gedraagt als warm of hot
// op basis van zowel gegeven antwoorden als gedragsdata (unit-views,
// calc-interacties, moreInfo-views). Levert ook een leaning af zodat de
// handoff-copy persona-aware is, zelfs als de bezoeker nog geen persona heeft
// gekozen.
//
// Pure functie. Geen localStorage, geen side-effects. Alle input via args.

const SIGNAL_DEFS = {
  // Universele engagement
  unit_detail_multi: { weight: 25, label: 'Meerdere units bekeken' },
  unit_detail_single: { weight: 8, label: 'Unit bekeken' },

  // Persona-onthullende interacties
  rentability_calc: { weight: 30, label: 'Rendement berekend', leaning: 'belegger' },
  mortgage_calc: { weight: 30, label: 'Maandlast berekend', leaning: 'eigen_gebruiker' },

  // Verdiepende engagement
  more_info_multi: { weight: 12, label: 'Meerdere infoblokken' },
  brochure_clicked: { weight: 6, label: 'Brochure geopend' },
  availability_yes: { weight: 5, label: 'Beschikbaarheid bekeken' },

  // Persona-specifieke moreInfo
  moreinfo_pricecompare: { weight: 8, label: 'Prijsvergelijking', leaning: 'belegger' },
  moreinfo_investor: { weight: 6, label: 'Belegger-info', leaning: 'belegger' },
  moreinfo_financing: { weight: 10, label: 'Financiering bekeken' },
  moreinfo_location: { weight: 5, label: 'Locatie verdiept', leaning: 'eigen_gebruiker' },
  moreinfo_siteplan: { weight: 4, label: 'Situatietekening' },

  // Stated intent
  timeline_zsm: { weight: 28, label: 'Zo snel mogelijk' },
  timeline_3mnd: { weight: 18, label: 'Binnen 3 maanden' },
  timeline_6mnd: { weight: 8, label: 'Binnen 6 maanden' },
  timeline_dit_jaar: { weight: 4, label: 'Later dit jaar' },

  // Concrete keuzes
  size_specific: { weight: 6, label: 'Concrete grootte' },
  size_xxl: { weight: 8, label: 'XXL gekozen' },

  // Commitment via lead
  lead_phone: { weight: 15, label: '06 gedeeld' },
  lead_complete: { weight: 8, label: 'Naam, mail en 06 compleet' },

  // Negatief
  afhaak: { weight: -25, label: 'Afhaak-reden' },
  timeline_unknown: { weight: -8, label: 'Timeline weet niet' },
  phone_declined: { weight: -10, label: 'Geen 06 gedeeld' },
}

export const TEMPERATURE_THRESHOLDS = { hot: 50, warm: 25 }

export const EMPTY_BEHAVIORS = {
  unitDetailOpens: 0,
  uniqueUnitsViewed: [],
  lastUnitViewed: null,
  rentabilityCalcInteracts: 0,
  mortgageCalcInteracts: 0,
  moreInfoViewCount: 0,
  moreInfoIds: [],
  brochureClicked: false,
  warmHandoffShown: false,
  warmHandoffOutcome: null,
}

// Hoofdberekening. Geeft een snapshot van waar de bezoeker staat.
export function computeBuyingSignals(answers = {}, behaviors = EMPTY_BEHAVIORS) {
  const signals = []
  const leaning = { belegger: 0, eigen_gebruiker: 0 }

  const push = (id) => {
    const def = SIGNAL_DEFS[id]
    if (!def) return
    signals.push({ id, ...def })
    if (def.leaning) leaning[def.leaning] += Math.abs(def.weight)
  }

  // Engagement: unit-detail views
  const unitOpens = behaviors.unitDetailOpens || 0
  const uniqueCount = (behaviors.uniqueUnitsViewed || []).length
  if (unitOpens >= 2 || uniqueCount >= 2) push('unit_detail_multi')
  else if (unitOpens >= 1) push('unit_detail_single')

  // Calc-interacties zijn de duidelijkste persona-onthullers
  if ((behaviors.rentabilityCalcInteracts || 0) > 0) push('rentability_calc')
  if ((behaviors.mortgageCalcInteracts || 0) > 0) push('mortgage_calc')

  // MoreInfo verdieping
  const moreInfoIds = behaviors.moreInfoIds || []
  if (moreInfoIds.length >= 2) push('more_info_multi')
  if (moreInfoIds.includes('priceCompare')) push('moreinfo_pricecompare')
  if (moreInfoIds.includes('investor')) push('moreinfo_investor')
  if (moreInfoIds.includes('financing')) push('moreinfo_financing')
  if (moreInfoIds.includes('location')) push('moreinfo_location')
  if (moreInfoIds.includes('sitePlan')) push('moreinfo_siteplan')

  if (behaviors.brochureClicked) push('brochure_clicked')
  if (answers.availabilityCheck?.id === 'ja') push('availability_yes')

  // Timeline
  switch (answers.timeline?.id) {
    case 'zsm': push('timeline_zsm'); break
    case '3mnd': push('timeline_3mnd'); break
    case '6mnd': push('timeline_6mnd'); break
    case 'dit_jaar': push('timeline_dit_jaar'); break
    case 'weet_niet': push('timeline_unknown'); break
  }

  // Size
  if (answers.size?.id === 'meer_dan_100') push('size_xxl')
  else if (answers.size && answers.size.id !== 'weet_niet') push('size_specific')

  // Lead-commitment
  if (answers.lead?.phone) push('lead_phone')
  if (answers.lead?.firstName && answers.lead?.email && answers.lead?.phone) push('lead_complete')

  // Negatief
  if (answers.afhaakReason) push('afhaak')

  const score = signals.reduce((sum, s) => sum + s.weight, 0)

  let temperature = 'cold'
  if (score >= TEMPERATURE_THRESHOLDS.hot) temperature = 'hot'
  else if (score >= TEMPERATURE_THRESHOLDS.warm) temperature = 'warm'

  const declaredPersona = answers.intent?.persona || 'onbekend'
  let inferredPersona = declaredPersona
  if (declaredPersona === 'onbekend' || !answers.intent) {
    if (leaning.belegger > leaning.eigen_gebruiker) inferredPersona = 'belegger'
    else if (leaning.eigen_gebruiker > leaning.belegger) inferredPersona = 'eigen_gebruiker'
  }

  return {
    temperature,
    score,
    signals,
    declaredPersona,
    inferredPersona,
    leaning,
  }
}

// Time-of-day-aware terugbel-belofte. Bewust open gehouden ("zo snel
// mogelijk") in plaats van een harde deadline. We willen geen belofte
// doen die we niet kunnen waarmaken bij piek-aanvragen — beter een
// realistisch verwachtings-frame dan een gemiste deadline.
export function getTimeContext(now = new Date()) {
  const day = now.getDay()
  const hour = now.getHours()
  const isWeekend = day === 0 || day === 6
  if (isWeekend) return 'weekend'
  if (hour >= 9 && hour < 17) return 'office_hours'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

export function getCallbackPromise(timeContext) {
  switch (timeContext) {
    case 'office_hours': return 'zo snel mogelijk vandaag'
    case 'evening':      return 'zo snel mogelijk, morgen tijdens kantooruren'
    case 'weekend':      return 'zo snel mogelijk, maandag tijdens kantooruren'
    case 'night':        return 'zo snel mogelijk, morgen tijdens kantooruren'
    default:             return 'zo snel mogelijk binnen kantooruren'
  }
}

// Utility voor de admin-view: snel begrijpelijk overzicht.
export function temperatureLabel(t) {
  switch (t) {
    case 'hot': return 'Hot'
    case 'warm': return 'Warm'
    default: return 'Cold'
  }
}
