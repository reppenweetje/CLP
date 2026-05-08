// Resolves de persona-aware copy voor de service-card en warm-handoff
// bubbels. Leest uit `project.personaCopy` en `project.salesTeam` zodat
// elk project deze teksten zelf kan invullen zonder dat we componenten
// hoeven aan te passen.
//
// Output is een gewone JS-object met {tag, headline, body, value, primaryCta}
// dat de bubbels direct renderen. Geen logica meer in de bubbels zelf.

export function buildHandoffCopy(persona, project, { signals = [], name = '', hasPhone = false, phoneDeclined = false, directContact = false } = {}) {
  const copy = project?.personaCopy?.[persona] || project?.personaCopy?.onbekend
  const handoff = copy?.handoff || {}

  // Bewust generiek: "de makelaar" in plaats van een naam. De repName komt
  // pas weer in beeld in de outcome-strip ("Ik bel je vandaag terug", eerste
  // persoon want het is dezelfde Jesse die ook de chat doet). Dit voorkomt
  // dat een naam (Jann/Jesse/...) uit het niets in de chip-tekst opduikt
  // voor wie de personalia nog niet plaatst.
  const primaryCta = phoneDeclined ? 'Plan een belmoment' : 'Laat de makelaar mij bellen'
  const greet = name ? `${name}, ` : ''

  // Direct-contact pad: bezoeker vroeg expliciet om contact via de "Even
  // contact opnemen" macro-chip. We slaan de observatie-gebaseerde copy
  // over (het is geen soft-overgang vanaf gedrag, maar een directe
  // aanvraag) en geven een korte neutrale variant terug. Geen value-
  // bullets want de bezoeker vraagt om actie, niet om een verkoop-pitch
  // over wat een gesprek allemaal kan opleveren.
  if (directContact) {
    const headlineRaw = name
      ? `${name}, hoe wil je het liefst contact?`
      : 'Hoe wil je het liefst contact?'
    return {
      tag: 'Contact',
      headline: headlineRaw,
      body: '',
      value: [],
      primaryCta,
    }
  }

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
    : greet.trim() || 'Even kort schakelen'

  return {
    // Tag is bewust een neutrale "wat is dit"-marker, niet een marketing-claim.
    // De warm-handoff bubble moet aanvoelen als logische voortzetting van het
    // gesprek. Marketing-tags ("hulp op maat") triggeren wantrouwen.
    tag: 'Kort overleg',
    headline,
    body: handoff.body || '',
    value: handoff.valueBullets || [],
    primaryCta,
  }
}

// Brug-zin die VOOR de warm-handoff bubble verschijnt om de overgang van
// "vragen stellen" naar "wil je gebeld worden" zacht te maken. Persoonlijk
// gemaakt door observatie van het sterkste signaal, met optionele naam-aanhef.
//
// Doel: bezoeker voelt herkenning ("ze zien wat ik doe") in plaats van een
// abrupte verkoop-pop-up. Dit maakt het verschil tussen "marketing-bubble"
// en "logische volgende stap".
export function buildHandoffBridge(persona, project, { signals = [], name = '' } = {}) {
  const copy = project?.personaCopy?.[persona] || project?.personaCopy?.onbekend
  const handoff = copy?.handoff || {}
  const observations = handoff.observations || {}

  const signalIds = new Set(signals.map((s) => s.id))
  const hasCalc = signalIds.has('rentability_calc') || signalIds.has('mortgage_calc')
  const hasMultiUnit = signalIds.has('unit_detail_multi')
  const hasShortTimeline = signalIds.has('timeline_zsm') || signalIds.has('timeline_3mnd')

  const obsRaw = hasCalc
    ? observations.calc || observations.default
    : hasMultiUnit
    ? observations.multiUnit || observations.default
    : hasShortTimeline
    ? 'je timeline is helder'
    : observations.default || 'je hebt al rondgekeken'

  const obsLower = obsRaw.charAt(0).toLowerCase() + obsRaw.slice(1)
  const obsUpper = obsRaw.charAt(0).toUpperCase() + obsRaw.slice(1)
  const lead = name ? `${name}, ${obsLower}` : obsUpper
  return `${lead}. Op zo'n moment helpt het meestal om kort even te schakelen.`
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
