// Projectdata ELSTER 11 (Elst, Utrecht). Sentence case + REPP en ELSTER 11 in
// correcte caps. Schema gelijk aan dehofman.js / paveri.js zodat de
// hostname-loader 'm transparant kan switchen.
//
// Slug = `elster11`, subdomein wordt elster11.clp.repp.nl.
//
// Afwijkend t.o.v. de andere projecten:
//   • Geen eigen portal (portalStrategy/portalUrl weggelaten).
//   • Geen financieringspartner (financing-blok + credionWebhookUrl weggelaten,
//     en geen 'financing' contentCard).
//   • Onregelmatige plattegrond — daarom `sitePlan.svg` met exacte polygon-
//     coordinaten (zie SitePlanPolygonBubble.jsx). Geen rows/columns-schema.
export const project = {
  id: 'elster11',
  name: 'elster 11',
  displayName: 'ELSTER 11',
  tagline: 'Onafhankelijk ondernemen aan de A12.',
  shortDescription: '15 casco bedrijfsunits aan de Veenendaalsestraatweg 11 in Elst.',
  hero: '/projects/elster11/hero.jpg',
  logo: '/projects/elster11/logo.svg',
  exterior: '/projects/elster11/hero.jpg',

  // CRM-project key. Wordt als `source` meegestuurd naar Supabase lead-upsert,
  // clp-events en consent-log. Op basis van deze key kiest de routing het
  // CRM-project, de Brevo-list en het AI-prompt-template in gemini-followup.
  // Moet exact matchen met het bestaande CRM-project — "Elst BUnit" (mét
  // spatie en hoofdletters); niet aanpassen zonder afstemming met Tharwat.
  crmProject: 'Elst BUnit',

  // Gallery — schone sfeerimpressies die de hero-carousel doorloopt. Mix van
  // exterieur overdag, avond en de C-units. locatie.jpg is een kaart en hoort
  // hier niet (die toont LocationBubble apart via aerialImage).
  gallery: [
    { src: '/projects/elster11/hero.jpg', alt: 'ELSTER 11 exterieur overdag' },
    { src: '/projects/elster11/sfeer1.jpg', alt: 'ELSTER 11 in de avondschemering' },
    { src: '/projects/elster11/sfeer2.jpg', alt: 'ELSTER 11 C-units overdag' },
    { src: '/projects/elster11/sfeer3.jpg', alt: 'ELSTER 11 C-units in de avond' },
    { src: '/projects/elster11/avond.jpg', alt: 'ELSTER 11 units met verlichte deuren' },
  ],

  // USP-cards voor de eerste micro-value moment.
  // Persona-aware ordering door uspCardOrder() per persona bepaald.
  uspCards: [
    {
      id: 'project',
      tag: 'Project',
      title: '15 bedrijfsunits in Elst',
      body: 'Hoogwaardige casco nieuwbouw aan de Veenendaalsestraatweg 11, geschikt voor ondernemers en beleggers.',
      image: '/projects/elster11/hero.jpg',
    },
    {
      id: 'location',
      tag: 'Locatie',
      title: 'Strategisch aan de A12',
      body: 'Aan de Veenendaalsestraatweg in Elst (Utrecht), met de A12 binnen enkele minuten bereikbaar.',
      image: '/projects/elster11/locatie.jpg',
    },
    {
      id: 'availability',
      tag: 'Beschikbaarheid',
      title: 'Nog 11 units beschikbaar',
      body: 'Een aantal Type A-units en de ruimere Type B- en C-units zijn nog beschikbaar.',
      image: '/projects/elster11/interieur.jpg',
    },
    {
      id: 'price',
      tag: 'Prijs',
      title: 'Vanaf €135.000 v.o.n. excl. btw',
      body: 'Type A vanaf €135.000, Type B vanaf €175.000 en Type C vanaf €300.000. Vrij op naam, exclusief 21% btw.',
      image: '/projects/elster11/detail.jpg',
    },
    {
      id: 'practical',
      tag: 'Praktisch',
      title: 'Functioneel casco met overheaddeur',
      body: 'Casco oplevering met overheaddeur 3,0 m breed × 3,2 m hoog en ruime vrije hoogte.',
      image: '/projects/elster11/avond.jpg',
    },
    {
      id: 'investor',
      tag: 'Belegging',
      title: 'Realistisch BAR tot 7%',
      body: 'In deze markt is een bruto aanvangsrendement tot 7% per jaar realistisch voor casco bedrijfsunits. Eigen parkeerplaats, casco en flexibel indeelbaar. Btw bij belaste verhuur vaak terugvorderbaar, laat je adviseren.',
      image: '/projects/elster11/doorsnede.jpg',
    },
    {
      id: 'terrein',
      tag: 'Eigen terrein',
      title: 'Besloten en veilig',
      body: 'Afgesloten bedrijventerrein met een eigen parkeerplaats per unit en een hoogwaardige industriële uitstraling.',
      image: '/projects/elster11/sfeer2.jpg',
    },
  ],

  location: {
    address: 'Veenendaalsestraatweg 11, Elst',
    city: 'Elst (Utrecht)',
    district: 'Veenendaalsestraatweg, Elst',
    aerialImage: '/projects/elster11/locatie.jpg',
    // Stylized map; pulse-marker uit (null) zodat we geen pin op een
    // gestileerde kaart tonen.
    pinPosition: null,
    mapsQuery: 'Veenendaalsestraatweg+11+Elst+Utrecht',
    mapsLink: 'https://www.google.com/maps?q=Veenendaalsestraatweg+11+Elst+Utrecht',
    // Reistijden vanaf Veenendaalsestraatweg 11 Elst (auto). Indicatieve,
    // marktconforme richttijden voor de regio — geen exacte routeplanner-
    // waarden, bewust afgerond zodat ze kloppend blijven zonder valse precisie.
    travelTimes: [
      { to: 'A12', value: '7 min', mode: 'car' },
      { to: 'Veenendaal', value: '10 min', mode: 'car' },
      { to: 'Wageningen', value: '10 min', mode: 'car' },
      { to: 'NS-station Elst', value: '12 min', mode: 'car' },
      { to: 'Utrecht', value: '25 min', mode: 'car' },
      { to: 'Arnhem', value: '25 min', mode: 'car' },
    ],
    surroundings: [
      { icon: 'business', text: 'Aan de Veenendaalsestraatweg, dicht bij de A12.' },
      { icon: 'car', text: 'A12 binnen enkele minuten met de auto bereikbaar.' },
      { icon: 'train', text: 'NS-station Elst op korte afstand.' },
      { icon: 'parking', text: 'Eigen parkeerplaats per unit op besloten terrein.' },
    ],
    highlights: [
      'Strategisch aan de A12 in de regio Utrecht.',
      'Besloten, veilig eigen bedrijventerrein.',
      'Hoogwaardige industriële uitstraling.',
    ],
    scarcityNote: 'Beperkt aanbod nieuwbouw bedrijfsunits in de regio Elst. Van de 15 units zijn er nog 11 beschikbaar.',
  },

  status: {
    // 4 van 15 verkocht (units 1, 2, 8, 9) ≈ 27% verkocht.
    soldPercent: 27,
    headline: 'Circa 27% verkocht. Nog 11 units beschikbaar in Type A, B en C.',
    units: {
      A: { label: 'Nog enkele beschikbaar', state: 'available' },
      B: { label: 'Beschikbaar', state: 'available' },
      C: { label: 'Beschikbaar', state: 'available' },
    },
  },

  // 15 units — onregelmatige plattegrond. Geen rows/columns-schema maar een
  // `svg`-blok met exacte coordinaten uit ELSTER 11 PLATTEGROND.svg (viewBox
  // 0 0 1497.8 897.9). SitePlanPolygonBubble.jsx rendert per unit een <rect>
  // of <polygon> op deze coordinaten zodat de vorm 1-op-1 klopt.
  //
  // Per unit: number, type (A/B/C), state, size (totaal m²), price (weggelaten
  // bij sold — verkochte units tonen alleen "Verkocht"), en geometrie. C-units
  // met verdieping hebben bgM2 + verdM2 voor de detail-weergave.
  sitePlan: {
    svg: {
      viewBox: '0 0 1497.8 897.9',
      // Terrein-omtrek als achtergrondvlak.
      background: '26,35.8 1470.1,35.8 1470.1,875.6 26,875.6',
      units: [
        { number: 1,  type: 'B', state: 'sold',      size: 77.2,  rect: { x: 1208.15, y: 131.67, w: 102.49, h: 177.20 } },
        { number: 2,  type: 'B', state: 'sold',      size: 71.1,  rect: { x: 1112.78, y: 127.11, w: 94.34,  h: 181.53 } },
        { number: 3,  type: 'A', state: 'available', size: 67.8,  price: 135000, rect: { x: 1023.997, y: 127.071, w: 87.939, h: 181.528 } },
        { number: 4,  type: 'A', state: 'available', size: 68.2,  price: 135000, rect: { x: 935.273,  y: 127.085, w: 87.939, h: 181.528 } },
        { number: 5,  type: 'A', state: 'available', size: 68.2,  price: 135000, rect: { x: 846.533,  y: 127.085, w: 87.939, h: 181.528 } },
        { number: 6,  type: 'A', state: 'available', size: 68.2,  price: 135000, rect: { x: 753.217,  y: 127.192, w: 92.470, h: 181.528 } },
        { number: 7,  type: 'A', state: 'available', size: 68.3,  price: 135000, rect: { x: 663.392,  y: 127.192, w: 89.178, h: 181.528 } },
        { number: 8,  type: 'A', state: 'sold',      size: 68.5,  rect: { x: 573.626,  y: 127.282, w: 89.178, h: 181.528 } },
        { number: 9,  type: 'A', state: 'sold',      size: 68.2,  rect: { x: 484.289,  y: 127.198, w: 88.655, h: 181.528 } },
        { number: 10, type: 'B', state: 'available', size: 89.9,  price: 175000, polygon: '483.45,308.87 377.58,310.75 354.47,124.49 483.45,127.34' },
        { number: 11, type: 'C', state: 'available', size: 307.3, price: 375000, bgM2: 258.4, verdM2: 48.9, polygon: '387.15,389.31 169.81,417.79 133.58,152.65 354.47,124.49' },
        { number: 12, type: 'B', state: 'available', size: 114.1, price: 225000, polygon: '402.83,491.70 337.34,500.15 340.62,525.19 186.74,545.55 169.81,417.79 387.15,389.31' },
        { number: 13, type: 'C', state: 'available', size: 238.7, price: 330000, bgM2: 154.3, verdM2: 85.6, rect: { x: 789.871,  y: 547.965, w: 136.099, h: 264.083 } },
        { number: 14, type: 'C', state: 'available', size: 154.3, price: 300000, rect: { x: 926.376,  y: 548.105, w: 136.099, h: 264.083 } },
        { number: 15, type: 'C', state: 'available', size: 272.1, price: 345000, bgM2: 154.4, verdM2: 117.7, rect: { x: 1062.862, y: 548.220, w: 136.099, h: 264.083 } },
      ],
    },
    legend: [
      { state: 'available', label: 'Beschikbaar' },
      { state: 'sold', label: 'Verkocht' },
    ],
    cardinalLabels: {
      bottom: 'Veenendaalsestraatweg',
    },
  },

  // Units per type (A/B/C) voor PriceBubble en recommendUnit. De exacte
  // per-unit maten/prijzen staan in sitePlan.svg.units; dit blok beschrijft de
  // type-niveau kenmerken en de instapprijs per type. Verkochte units tellen
  // niet mee voor de instapprijs.
  units: [
    {
      type: 'A',
      size: 68,
      levels: 1,
      parking: 1,
      levelDetail: 'Circa 68 m² begane grond, casco',
      priceFrom: 135000,
      pricePerM2: 1985,
      state: 'available',
      stateLabel: 'Beschikbaar',
      uses: ['Opslag', 'Werkplaats', 'Bedrijfsruimte'],
      image: '/projects/elster11/interieur.jpg',
      pitch: 'Compacte casco unit van circa 68 m². Geschikt voor opslag, werkplaats of bedrijfsruimte.',
      specs: [
        'Circa 68 m² begane grond',
        'Overheaddeur 3,0 m breed × 3,2 m hoog',
        'Vloerbelasting 500 tot 600 kg/m²',
        'Vrije hoogte circa 4,76 m',
        'Casco oplevering',
        'Eigen parkeerplaats',
      ],
    },
    {
      type: 'B',
      size: 90,
      levels: 1,
      parking: 1,
      levelDetail: 'Circa 90 tot 115 m² begane grond, casco',
      priceFrom: 175000,
      pricePerM2: 1950,
      state: 'available',
      stateLabel: 'Beschikbaar',
      uses: ['Opslag', 'Werkplaats', 'Showroom', 'Bedrijfsruimte'],
      image: '/projects/elster11/doorsnede.jpg',
      pitch: 'Ruimere casco unit van circa 90 tot 115 m². Geschikt voor opslag, werkplaats of showroom.',
      specs: [
        'Circa 90 tot 115 m² begane grond',
        'Overheaddeur 3,0 m breed × 3,2 m hoog',
        'Vloerbelasting 500 tot 600 kg/m²',
        'Vrije hoogte circa 4,76 m',
        'Casco oplevering',
        'Eigen parkeerplaats',
      ],
    },
    {
      type: 'C',
      size: 154,
      levels: 2,
      parking: 1,
      levelDetail: 'Begane grond met optionele verdieping, circa 150 tot 310 m²',
      priceFrom: 300000,
      pricePerM2: 1945,
      state: 'available',
      stateLabel: 'Beschikbaar',
      uses: ['Opslag', 'Werkplaats', 'Kantoor', 'Showroom'],
      image: '/projects/elster11/sfeer3.jpg',
      pitch: 'Royale casco unit van circa 150 tot 310 m², deels met verdieping. Ruimte voor opslag, werkplaats én kantoor.',
      specs: [
        'Circa 150 tot 310 m², deels met verdieping',
        'Overheaddeur 3,0 m breed × 3,2 m hoog',
        'Vloerbelasting BG 500 tot 600 kg/m², verdieping 300 tot 400 kg/m²',
        'Vrije hoogte circa 4,43 m',
        'Casco oplevering',
        'Eigen parkeerplaats',
      ],
    },
  ],

  features: [
    'Casco oplevering',
    'Overheaddeur 3,0 m breed × 3,2 m hoog',
    'Eigen parkeerplaats per unit',
    'Besloten, veilig bedrijventerrein',
    'Type C met verdieping mogelijk',
  ],

  // "Waarom ELSTER 11" — de vijf brochure-highlights. Geen makelaarstaal,
  // ieder body één concreet feit. Schaarste hoort in de beschikbaarheid-bubble
  // en plattegrond-stats, niet onder de project-kwaliteiten.
  highlights: [
    { title: 'Besloten eigen terrein', body: 'Veilig, afgesloten bedrijventerrein met een eigen parkeerplaats per unit.' },
    { title: 'Strategisch bij de A12', body: 'Aan de Veenendaalsestraatweg, met de A12 binnen enkele minuten bereikbaar.' },
    { title: 'Industriële uitstraling', body: 'Hoogwaardige, moderne uitstraling die past bij professioneel ondernemen.' },
    { title: 'Functioneel casco', body: 'Overheaddeur 3,0 m breed × 3,2 m hoog en een ruime vrije hoogte.' },
    { title: 'Eigen parkeerplaats', body: 'Eigen parkeerplaats per unit, direct op het terrein.' },
  ],

  audiences: [
    { id: 'eigenaar', title: 'Als eigenaar-gebruiker', body: 'Eigenaar van je eigen bedrijfsruimte op een gevestigde locatie aan de A12.' },
    { id: 'maker', title: 'Makers en praktische gebruikers', body: 'Installateurs, aannemers, interieurbouwers, webshops en servicebedrijven die werkplaats én kantoor willen.' },
    { id: 'kantoor', title: 'Kantoor en showroom', body: 'Zakelijke dienstverleners en creatieve bedrijven die showroom en opslag willen combineren.' },
    { id: 'belegger', title: 'Belegger', body: 'Nieuwbouwkwaliteit, eigen parkeerplaats en flexibele indeling voor verhuur of waardeontwikkeling.' },
  ],

  process: [
    { step: 1, title: 'Oriënteren', body: 'Brochure, plattegronden en prijslijst doornemen.' },
    { step: 2, title: 'Reserveren', body: 'Gewenste unit reserveren in overleg met REPP.' },
    { step: 3, title: 'Koopovereenkomst', body: 'Koopcontract en aannemingsovereenkomst opmaken.' },
    { step: 4, title: 'Notaris', body: 'Leveringsakte bij de notaris afronden.' },
    { step: 5, title: 'Bouw', body: 'Bouw vordert via voortgangsupdates.' },
    { step: 6, title: 'Oplevering', body: 'Sleuteloverdracht inclusief opleverkeuring.' },
  ],

  // Planning tijdelijk: data nog niet definitief. `current: true` markeert de
  // actieve fase (PlanningBubble kleurt dat bolletje blauw). TODO: definitieve
  // data invullen zodra bekend.
  planning: [
    { phase: 'Omgevingsvergunning', date: 'Nader te bepalen' },
    { phase: 'Start bouw',          date: 'Nader te bepalen' },
    { phase: 'Oplevering',          date: 'Nader te bepalen', current: true },
  ],

  // m²-prijs vergelijking. De drie regio-rijen zijn marktconforme referenties
  // voor nieuwbouw-bedrijfsunits in de regio (Elst/Veenendaal/Wageningen),
  // bewust als "(referentie)" gelabeld zodat ze als context-band lezen en niet
  // als exacte concurrent-quote. ELSTER-rijen zijn de eigen vraagprijzen per m².
  priceComparison: {
    peildatum: '2026-06',
    rows: [
      { name: 'ELSTER 11 Type A', price: 1985, isOurs: true },
      { name: 'ELSTER 11 Type C', price: 1945, isOurs: true },
      { name: 'Elst (referentie)', price: 2100 },
      { name: 'Veenendaal (referentie)', price: 2050 },
      { name: 'Wageningen (referentie)', price: 2150 },
    ],
  },

  // Beleggers-data. We tonen alleen de bovengrens (tot 7%) zodat bezoekers niet
  // aan de ondergrens worden gepind — de slider laat ze tot 3% zakken voor
  // conservatieve scenario's. Markthuur bewust als "marktconform" gepresenteerd
  // ipv een hard €/m²-getal: zo publiceren we geen ongeverifieerde aanname maar
  // blijft het cijfer kloppend met de markt. markthuurAanname blijft numeriek
  // voor eventuele calc-fallback (niet getoond bij barSlider-projecten).
  investor: {
    barRange: 'tot 7%',
    barSlider: { min: 3, max: 7, default: 7 },
    markthuurRange: 'op marktconform niveau',
    markthuurAanname: 100,
    kernfactoren: [
      'Nieuwbouwkwaliteit op een besloten bedrijventerrein aan de A12.',
      'Eigen parkeerplaats, casco oplevering en flexibele indeling.',
      'Verhuurbaarheid en waardeontwikkeling niet gegarandeerd, afhankelijk van markt, huurprijs en huurder.',
    ],
    cashflow: [
      'Initiële aanbetaling volgens reserveringsovereenkomst.',
      'Resterend bedrag in bouwtermijnen.',
      'Onderhoudsarm vastgoed.',
    ],
    fiscaal: [
      'Vrij op naam: koopsom exclusief 21% btw.',
      '21% btw bij verhuur of eigen gebruik vaak terugvorderbaar, fiscaal advies aanbevolen.',
      'Aankoop in privé of bv heeft verschillende fiscale gevolgen, laat je adviseren.',
    ],
  },

  investorBenefits: [
    'Nieuwbouwkwaliteit aan de A12.',
    'Eigen parkeerplaats direct voor de deur.',
    'Casco oplevering, flexibel inrichtbaar per huurder.',
    'Besloten, veilig bedrijventerrein.',
    'Type C met verdieping voor verschillende huurprofielen.',
  ],

  contentCards: [
    {
      id: 'project',
      title: 'Het project',
      body: '15 casco bedrijfsunits aan de Veenendaalsestraatweg 11 in Elst. Hoogwaardige nieuwbouw aan de A12.',
      tag: 'Project',
    },
    {
      id: 'location',
      title: 'Locatie',
      body: 'Aan de Veenendaalsestraatweg in Elst (Utrecht), met de A12 binnen enkele minuten bereikbaar.',
      tag: 'Bereikbaarheid',
      image: '/projects/elster11/locatie.jpg',
    },
    {
      id: 'price',
      title: 'Prijs',
      body: 'Vanaf €135.000 v.o.n. excl. btw voor Type A. Type B vanaf €175.000, Type C vanaf €300.000.',
      tag: 'Prijs',
    },
    {
      id: 'scarcity',
      title: 'Beschikbaarheid',
      body: 'Circa 27% verkocht. Nog 11 units beschikbaar in Type A, B en C.',
      tag: 'Schaarste',
    },
    {
      id: 'features',
      title: 'Praktisch',
      body: 'Casco oplevering, overheaddeur 3,0 m × 3,2 m, eigen parkeerplaats en een besloten bedrijventerrein.',
      tag: 'Specs',
    },
    {
      id: 'investor',
      title: 'Belegging',
      body: 'BAR tot 7% per jaar realistisch in deze markt. Eigen parkeerplaats, casco en flexibele indeling. Rendement en verhuurbaarheid niet gegarandeerd.',
      tag: 'Belegger',
    },
  ],

  team: [
    { name: 'REPP', role: 'verkoop' },
  ],

  whatsappNumber: '+31617192538',
  phoneNumber: '020-2610080',
  // Brochure + prijslijst: lokaal opgeslagen onder /public/projects/elster11/.
  // TODO: bestanden zijn nog niet aangeleverd (open item).
  brochureUrl: '/projects/elster11/brochure.pdf',
  priceListUrl: '/projects/elster11/prijslijst.pdf',

  // Sales team — Jesse namens REPP.
  salesTeam: {
    bot: { name: 'Jesse', org: 'REPP' },
    rep: { name: 'Jesse', context: 'Elst en omgeving' },
  },

  // Persona-aware copy. Identieke 4-buckets structuur als de andere projecten,
  // tekst aangepast naar ELSTER 11-context (Elst, A12, casco). Geen
  // financiering-verwijzingen (geen financieringspartner bij dit project).
  personaCopy: {
    eigen_gebruiker: {
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over ELSTER 11, zodat je een goed beeld krijgt van wat bij jouw wensen past.',
      recommendCopy: "Dan zijn vooral bereikbaarheid, parkeren en flexibele indeling belangrijk. ELSTER 11 is casco opgeleverd zodat je 'm helemaal naar eigen behoefte inricht.",
      handoff: {
        observations: {
          calc: 'we zien dat je de maandlasten aan het uitrekenen bent',
          multiUnit: 'we zien dat je je in meerdere units verdiept',
          default: 'fijn dat je verder kijkt',
        },
        shortTimelineHeadline: 'met die timeline is een korte call vaak prettiger dan veel mailen',
        body:
          'Een bedrijfsunit voor je eigen bedrijf koop je niet elke dag. ' +
          'Ik denk graag tien minuten met je mee over indeling ' +
          'en de stap naar een bezichtiging.',
        valueBullets: [
          'Welke unit qua indeling en grootte past bij jouw bedrijf',
          'Bezichtigings­moment plannen als dat zinvol is',
          'Wat de volgende stap concreet inhoudt',
        ],
      },
      waPhrase: 'Ik zoek voor mijn eigen bedrijf',
    },
    belegger: {
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over ELSTER 11, met aandacht voor de cijfers en de markt.',
      recommendCopy: 'Voor jou tellen vooral verhuurbaarheid en prijs per m². ELSTER 11 is kleinschalig, nieuwbouw en ligt strategisch aan de A12.',
      handoff: {
        observations: {
          calc: 'we zien dat je in het rendement aan het rekenen bent',
          multiUnit: 'we zien dat je verschillende units met elkaar vergelijkt',
          default: 'fijn dat je verder kijkt',
        },
        shortTimelineHeadline: 'met deze timeline is even schakelen vaak handig',
        body:
          'Een bedrijfsunit als belegging koop je niet zomaar. ' +
          'Ik ken de markt in de regio en kan in 10 minuten met je door de cijfers lopen ' +
          'en laten zien wat er nu nog beschikbaar is.',
        valueBullets: [
          'Verhuurbaarheid en rendementsindicatie voor ELSTER 11',
          'Welke units in ELSTER 11 nog beschikbaar zijn en waarom',
          'Wat aankoop in privé of bv financieel-fiscaal verschilt',
        ],
      },
      waPhrase: 'Ik kijk als belegger',
    },
    beide: {
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over ELSTER 11, vanuit beide kanten: eigen gebruik én beleggingsperspectief.',
      recommendCopy: 'Dan kijken we vanuit beide kanten. ELSTER 11 werkt voor ondernemers die zelf willen gebruiken én voor beleggers die nieuwbouw en locatie zoeken.',
      handoff: {
        observations: {
          calc: 'we zien dat je aan het rekenen bent',
          multiUnit: 'we zien dat je verschillende units met elkaar vergelijkt',
          default: 'je kijkt vanuit twee kanten, laat ons even meedenken',
        },
        shortTimelineHeadline: 'met deze timeline is even schakelen vaak handig',
        body:
          'Of je nu zelf gebruikt of verhuurt: een bedrijfsunit koop je niet zomaar. ' +
          'Ik leg graag in een korte call beide scenarios naast ' +
          'elkaar voor jouw situatie.',
        valueBullets: [
          'Eigen gebruik versus verhuur: wat brengt wat op',
          'Welke unit voor welke optie het meest geschikt is',
          'Hoe collega-kopers in ELSTER 11 dit aanpakken',
        ],
      },
      waPhrase: 'Ik kijk zowel voor eigen gebruik als belegging',
    },
    onbekend: {
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over ELSTER 11, zodat je een goed beeld krijgt van wat bij jouw wensen past.',
      recommendCopy: 'We tonen je vooral de informatie die voor jouw situatie relevant is.',
      handoff: {
        observations: {
          calc: 'we zien dat je aan het rekenen bent',
          multiUnit: 'we zien dat je je in meerdere units verdiept',
          default: 'fijn dat je rondkijkt',
        },
        shortTimelineHeadline: 'met die timeline is even schakelen vaak handig',
        body:
          'Een bedrijfsunit koop je niet zomaar. Ik denk graag tien minuten ' +
          'met je mee, zonder verplichting. Vaak prettiger dan ' +
          'zelf alles uitzoeken.',
        valueBullets: [
          'Wat ELSTER 11 onderscheidt van andere bedrijfsunits in de regio',
          'Welke unit past bij jouw situatie',
          'Wat de volgende stap concreet zou kunnen zijn',
        ],
      },
      waPhrase: '',
    },
  },

  // Flow-overrides — per-project label en chip-opties voor de size-vraag.
  // App.jsx's getQuestion('size') merget deze met flow.questions.size. Voor
  // ELSTER 11: de begane-grond-categorieën die mappen op Type A/B/C. De score
  // en option-id verschillen zodat analytics ziet wat de bezoeker oorspronkelijk
  // koos; de `unit`-waarde stuurt recommendUnit naar het juiste type.
  flowOverrides: {
    sizeQuestion: {
      label: 'Hoe groot wil je dat de begane grond is?',
      options: [
        { id: 'around_70',  label: 'Rond 70 m²',        score: 10, unit: 'A' },
        { id: 'around_100', label: '90 tot 115 m²',     score: 13, unit: 'B' },
        { id: 'around_200', label: '150 tot 310 m²',    score: 15, unit: 'C' },
        { id: 'weet_niet',  label: 'Weet ik nog niet',  score: 5,  unit: 'A' },
      ],
    },
  },

  // Per-keuze intro-tekst die de standaard recommendation-bubble overschrijft.
  // Keyed op de id van de size-optie.
  recommendIntroByChoice: {
    around_70:  'Op basis van je antwoorden past Type A goed bij wat je zoekt.',
    around_100: 'Op basis van je antwoorden past Type B goed bij wat je zoekt.',
    around_200: 'Op basis van je antwoorden past Type C goed bij wat je zoekt.',
    weet_niet:  'We starten met Type A als concreet vertrekpunt en kijken samen wat past.',
  },
}

// Volgorde van USP-cards aangepast aan persona.
// Belegger ziet beleggings-info eerder; eigen gebruiker ziet praktische zaken eerder.
export function uspCardOrder(persona) {
  const ids =
    persona === 'belegger'
      ? ['project', 'investor', 'terrein', 'price', 'location', 'availability']
      : persona === 'beide'
      ? ['project', 'location', 'investor', 'price', 'availability', 'terrein']
      : persona === 'eigen_gebruiker'
      ? ['project', 'location', 'availability', 'price', 'practical', 'terrein']
      : ['project', 'location', 'availability', 'price', 'practical', 'terrein']
  return ids
    .map((id) => project.uspCards.find((c) => c.id === id))
    .filter(Boolean)
}
