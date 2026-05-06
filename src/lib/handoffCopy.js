// Resolves de persona-aware copy voor de service-card en warm-handoff
// bubbels. Leest uit `project.personaCopy` en `project.salesTeam` zodat
// elk project deze teksten zelf kan invullen zonder dat we componenten
// hoeven aan te passen.
//
// Output is een gewone JS-object met {tag, headline, body, value, primaryCta}
// dat de bubbels direct renderen. Geen logica meer in de bubbels zelf.

export function buildHandoffCopy(persona, project, { signals = [], name = '', hasPhone = false, phoneDeclined = false } = {}) {
  const copy = project?.personaCopy?.[persona] || project?.personaCopy?.onbekend
  const handoff = copy?.handoff || {}
  const repName = project?.salesTeam?.rep?.name || 'een collega'

  const greet = name ? `${name}, ` : ''
  const signalIds = new Set(signals.map((s) => s.id))
  const hasCalc = signalIds.has('rentability_calc') || signalIds.has('mortgage_calc')
  const hasMultiUnit = signalIds.has('unit_detail_multi')
  const hasShortTimeline = signalIds.has('timeline_zsm') || signalIds.has('timeline_3mnd')

  const observations = handoff.observations || {}
  const observation = hasCalc
    ? observations.calc || observations.default || ''
    : hasMultiUnit
    ? observations.multiUnit || observations.default || ''
    : observations.default || ''

  const headline = hasShortTimeline && handoff.shortTimelineHeadline
    ? `${greet}${handoff.shortTimelineHeadline}`
    : observation
    ? `${greet}${observation}`
    : greet.trim() || 'Hulp op maat'

  const primaryCta = hasPhone
    ? `Laat ${repName} mij bellen`
    : phoneDeclined
    ? 'Plan een belmoment'
    : `Laat ${repName} mij bellen`

  return {
    tag: 'Hulp op maat',
    headline,
    body: handoff.body || '',
    value: handoff.valueBullets || [],
    primaryCta,
  }
}

// Resolved persona-microIntro na de intent-keuze.
export function resolveMicroIntro(persona, project) {
  const copy = project?.personaCopy?.[persona] || project?.personaCopy?.onbekend
  return copy?.microIntro || ''
}

// Resolved recommendCopy na de unit-aanbeveling op het niet-hot-pad.
export function resolveRecommendCopy(persona, project) {
  const copy = project?.personaCopy?.[persona] || project?.personaCopy?.onbekend
  return copy?.recommendCopy || ''
}

// WhatsApp persona-zin (eerste deel van het prefilled bericht).
export function resolveWaPhrase(persona, project) {
  const copy = project?.personaCopy?.[persona] || project?.personaCopy?.onbekend
  return copy?.waPhrase || ''
}
