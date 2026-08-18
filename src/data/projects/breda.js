// Projectdata BREDA — marktpeiling (geen verkoop-CLP).
//
// BELANGRIJK: dit is een KORTE vraaggerichte peiling, geen aanbodpagina.
// De flow mag NIETS prijsgeven over locatie, plan, units of prijzen. We
// peilen alleen de vraagzijde: wat zoekt de ondernemer in de regio Breda.
//
// Slug = `breda`. Subdomein = breda.clp.repp.nl.
//
// De hele afwijkende flow zit achter flowOverrides.surveyFlow. Zonder dat
// object valt de app terug op de standaard verkoop-flow (zoals de andere
// vier tenants). App.jsx / flow.js / ChatThread.jsx zijn zo gated dat de
// bestaande projecten byte-voor-byte identiek blijven wanneer surveyFlow
// ontbreekt.
//
// Bewust WEGGELATEN (peiling heeft geen aanbod om te tonen):
//   sitePlan, location, priceComparison, financing, investor*, planning,
//   process, gallery. units = [] en brochureUrl = '#' (schakelt brochure uit).
//   disabledTopics dekt elk moreInfo-onderwerp af zodat er nooit iets
//   projectspecifieks kan renderen.
export const project = {
  id: 'breda',
  name: 'breda',
  displayName: 'Ondernemen in omgeving Breda',
  tagline: 'We peilen de vraag naar bedrijfsruimte in de regio.',
  shortDescription: 'Korte marktpeiling onder ondernemers in de omgeving Breda.',

  // Header-subtitel onder de projectnaam. Default (andere tenants) is
  // 'exclusief in verkoop bij REPP'; een peiling verkoopt niks, dus een
  // neutrale verkenning-subtitel.
  headerSubtitle: 'marktverkenning door REPP',

  // Geen hero-asset aangeleverd: null houdt BrochureBubble/IntroScreen
  // veilig (geen missende-file 404). Brochure staat sowieso uit.
  hero: null,
  logo: '/logo.svg',

  // CRM-project key. Moet EXACT matchen met de Supabase projects-tabel.
  // Registreer 'Breda BUnit' backend-zijde voordat leads binnenkomen.
  crmProject: 'Breda BUnit',

  portalStrategy: 'none',

  // Geen offer-content. Alle onderstaande velden bewust leeg/veilig zodat
  // de gedeelde componenten die er guarded naar grijpen niet crashen.
  gallery: [],
  uspCards: [],
  units: [],
  contentCards: [],
  personaCopy: {},

  whatsappNumber: '+31617192538',

  // Brochure uitgeschakeld: '#' zorgt dat een eventuele brochure-trigger
  // nergens naartoe linkt. In de peiling-flow wordt de brochure sowieso
  // nooit aangeboden.
  brochureUrl: '#',

  salesTeam: {
    bot: { name: 'Jesse', org: 'REPP' },
    rep: { name: 'Jesse', context: 'REPP / regio Breda' },
  },

  // Elk moreInfo-onderwerp uit MORE_INFO_DEFS uitgeschakeld. De peiling
  // routeert nooit naar moreInfo, dit is een extra vangnet zodat er niets
  // projectspecifieks (locatie/prijs/plattegrond) kan verschijnen.
  disabledTopics: [
    'location', 'sitePlan', 'gallery', 'highlights', 'price',
    'priceCompare', 'planning', 'process', 'brochure', 'investor', 'financing',
  ],

  flowOverrides: {
    // Aanwezigheid van dit object schakelt de peiling-sequencer in
    // (zie App.jsx). Ontbreekt het, dan draait de standaard verkoop-flow.
    surveyFlow: {
      // Intro-bubbles na de begroeting "Hoi, ik ben Jesse van REPP.".
      // Echo de ad: eigen bedrijfsruimte in de omgeving Breda.
      intro: [
        'Je zoekt een eigen bedrijfsruimte in de omgeving Breda.',
        'Een paar korte vragen, zodat we weten wat je zoekt.',
      ],
      // Bot-tekst vlak voor het lead-formulier.
      leadIntro: 'Tot slot je gegevens, dan houden we je op de hoogte.',
      // Opt-in intro (2 bubbles) vlak vóór het lead-formulier, ná de
      // wanneer-vraag. De peiling captured de lead nu halverwege (opt-in),
      // waarna budget, financiering en de locaties-multiselect volgen.
      optInIntro: [
        'Er zijn ontwikkelingsplannen die passen bij wat je zoekt.',
        'Laat je gegevens achter, dan houden we je op de hoogte.',
      ],
      // Cross-sell-intro die de financiering-handler emit vlak vóór de
      // locaties-multiselect. Was voorheen de tweede closeBubble.
      crossSellIntro: 'REPP ontwikkelt op meer plekken kleinschalige bedrijfsruimte, dus je hoort ook van vergelijkbare kansen in de regio.',
      // Definitieve afsluit-bubble ná de locaties-multiselect. {firstName}
      // wordt ingevuld (valt netjes weg als de naam leeg is).
      finalBubble: 'Dank, {firstName}. We houden je op de hoogte zodra er meer bekend is.',
      // Behouden voor compatibiliteit; niet langer gebruikt door finishLead
      // (die captured nu halverwege en eindigt via finalBubble na locaties).
      closeBubbles: [
        'Dank, {firstName}. We houden je als eerste op de hoogte zodra er meer bekend is.',
        'REPP ontwikkelt op meer plekken kleinschalige bedrijfsruimte, dus je hoort ook van vergelijkbare kansen in de regio.',
      ],
    },
  },
}

// Peiling toont geen USP-cards. Lege lijst zodat de hostname-loader een
// geldige named-export vindt (uspCardOrder wordt elders unguarded verwacht).
export function uspCardOrder() {
  return []
}
