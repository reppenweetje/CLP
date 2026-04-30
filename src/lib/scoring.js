// Score, persona en aankoopfase afleiden uit antwoorden.
// Voorbeeld: een sales-ready lead heeft followup ∈ {wa_nu, bel, plan}.

export function derivePersona(answers) {
  return answers.focus?.persona || answers.intent?.persona || 'onbekend'
}

export function computeScore(answers) {
  let s = 0
  if (answers.intent?.score) s += answers.intent.score
  if (answers.focus?.score) s += answers.focus.score
  if (answers.timeline?.score) s += answers.timeline.score
  if (answers.size?.score) s += answers.size.score
  if (answers.followup?.score) s += answers.followup.score
  if (answers.lead?.email) s += 10
  if (answers.lead?.phone) s += 25
  return s
}

export function deriveStage(answers) {
  const fu = answers.followup?.id
  if (fu === 'wa_nu' || fu === 'bel' || fu === 'plan') return 'sales_ready'

  const tl = answers.timeline?.id
  const intent = answers.intent?.id
  const sizeSpecific = answers.size?.id && answers.size.id !== 'weet_niet'

  if ((tl === 'zsm' || tl === '3mnd') && (sizeSpecific || intent === 'units_beschikbaar')) {
    return 'koopintentie'
  }

  if (intent === 'units_beschikbaar' || intent === 'prijzen_plattegronden') {
    if (tl === '3mnd' || tl === '6mnd' || tl === 'dit_jaar') return 'vergelijkend'
  }

  if (intent === 'kijkt_rond' && (!tl || tl === 'weet_niet')) return 'nieuwsgierig'

  if (answers.focus || answers.timeline) return 'orienterend'

  return 'nieuwsgierig'
}

export function deriveTemperature(stage) {
  switch (stage) {
    case 'sales_ready': return 'sales-ready'
    case 'koopintentie': return 'hot'
    case 'vergelijkend': return 'warm'
    case 'orienterend': return 'lukewarm'
    default: return 'cold'
  }
}

export const STAGE_LABEL = {
  nieuwsgierig: 'Nieuwsgierig',
  orienterend: 'Oriënterend',
  vergelijkend: 'Vergelijkend',
  koopintentie: 'Koopintentie',
  sales_ready: 'Sales-ready',
}

export const TEMPERATURE_LABEL = {
  cold: 'Cold',
  lukewarm: 'Warm-koel',
  warm: 'Warm',
  hot: 'Hot',
  'sales-ready': 'Sales-ready',
}

export const TEMPERATURE_COLOR = {
  cold: 'text-sky-300 bg-sky-500/10 border-sky-400/20',
  lukewarm: 'text-amber-200 bg-amber-500/10 border-amber-400/20',
  warm: 'text-orange-300 bg-orange-500/10 border-orange-400/20',
  hot: 'text-rose-300 bg-rose-500/10 border-rose-400/20',
  'sales-ready': 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20',
}
