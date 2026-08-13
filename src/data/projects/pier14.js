// Projectdata PIER14 (Zwijndrecht, voormalig Schokbeton-terrein).
// 26 bedrijfsunits aan de Oude Maas, specifiek voor maritieme/nautische
// ondernemers. Schema gelijk aan dehofman.js + paveri.js zodat de
// hostname-loader 'm transparant kan switchen.
//
// Slug = `pier14`. Subdomein = pier14.clp.repp.nl.
//
// Portal-strategie: kopen-repp-redirect, geen eigen portal-site,
// lead gaat na CLP-chat direct naar https://kopen.repp.nl/pier14.
//
// UNIEK voor PIER14:
//  1. Branche-gate na intent-vraag: "Ben je een nautisch ondernemer?"
//     (zie flowOverrides.nauticGate). Niet-nautisch → exit-flow.
//  2. Beleggers-route uitgeschakeld, beleggers kunnen geen unit kopen
//     voor PIER14. project.financing-config blijft staan voor Credion
//     maar persona-flow stuurt belegger naar afhaak.
//  3. priceComparison NIET ingevuld, nautische units zijn te uniek
//     voor zinvolle benchmarks per m².
export const project = {
  id: 'pier14',
  name: 'pier14',
  displayName: 'PIER14',
  tagline: 'De thuishaven voor maritieme ondernemers.',
  shortDescription: '26 bedrijfsunits aan de Oude Maas, nautisch-maritiem bedrijventerrein.',
  hero: '/projects/pier14/beschikbaarheid.png',
  logo: '/projects/pier14/logo.svg',
  // Wordmark (PIER14 letterlogo SVG) voor de IntroScreen hero-overlay. Als
  // dit veld gezet is rendert IntroScreen.jsx een <img> ipv plain displayName-
  // tekst. Andere projecten zonder wordmark vallen terug op tekst.
  wordmark: '/projects/pier14/wordmark.svg',
  exterior: '/projects/pier14/beschikbaarheid.png',

  // CRM-project key. Moet EXACT matchen met Tharwats Supabase projects-tabel.
  // PIER14 in caps + spatie + "BUnit", niet aanpassen zonder afstemming.
  crmProject: 'PIER14 BUnit',

  // Portal-strategie. PIER14 gaat via kopen.repp.nl/pier14 (geen eigen
  // portal-site zoals dehofman.nl). Brevo stuurt simpelere mail, CtaBubble
  // linkt direct door.
  portalStrategy: 'kopen-repp-redirect',

  // Gallery = HeroCarousel op IntroScreen (eerste pagina). Strikt twee
  // hi-res beelden uit de officiële render-set: intro-rendering (rooftop-
  // view rendering) + intro-drone (top-down luchtfoto kavel). Earlier
  // gebruikte project.png / luchtfoto-haven.png waren te onscherp op groot
  // formaat — dit zijn de scherpste varianten die we hebben.
  gallery: [
    { src: '/projects/pier14/intro-rendering.jpg', alt: 'PIER14 rooftop-view rendering' },
    { src: '/projects/pier14/intro-drone.png',     alt: 'PIER14 kavel aan de Oude Maas (drone)' },
  ],

  // Sfeerbeelden-bubble in de chat krijgt een uitgebreidere set. Begint
  // met dezelfde 2 scherpe als de IntroScreen en breidt uit met de overige
  // exterieur-foto's. Renderings die niet scherp genoeg zijn voor het hero-
  // formaat zijn hier wel acceptabel op de kleinere carousel-thumbnail.
  // App.jsx GalleryBubble valt terug op project.gallery als project.sfeerbeelden
  // niet bestaat — andere projecten hoeven dus niet aangepast.
  sfeerbeelden: [
    { src: '/projects/pier14/intro-rendering.jpg', alt: 'PIER14 rooftop-view rendering' },
    { src: '/projects/pier14/intro-drone.png',     alt: 'PIER14 kavel aan de Oude Maas (drone)' },
    { src: '/projects/pier14/sfeer-straat.jpg',    alt: 'PIER14 straatzijde rendering overdag' },
    { src: '/projects/pier14/sfeer-facade.jpg',    alt: 'PIER14 façade close-up bij schemering' },
    { src: '/projects/pier14/project.png',         alt: 'PIER14 luchtaanzicht units (rendering)' },
    { src: '/projects/pier14/pier-overview.png',   alt: 'PIER14 overview met pier en haven' },
    { src: '/projects/pier14/praktisch.png',       alt: 'PIER14 interieur Schokbeton-loods' },
  ],

  // USP-cards voor het eerste micro-value moment.
  uspCards: [
    {
      id: 'project',
      tag: 'Project',
      title: '26 bedrijfsunits aan de Oude Maas',
      body: 'Hoogwaardige nieuwbouw + gerenoveerde Schokbeton-loodsen op kavel 11. 7 unit-types van 108 tot 784 m², koppelbaar.',
      image: '/projects/pier14/project.png',
    },
    {
      id: 'location',
      tag: 'Locatie',
      title: 'Direct aan het water in Zwijndrecht',
      body: 'A16 op 3 minuten, Zwijndrecht NS 7 minuten fietsen, geplande waterbushalte richting Rotterdam en Dordrecht.',
      image: '/projects/pier14/locatie.png',
    },
    {
      id: 'maritime',
      tag: 'Maritieme cluster',
      title: 'Buren in scheepvaart en watersport',
      body: 'Deen Shipping, Aqualiner, Vos Sliedrecht, EMS/Oechies, Bode Packaging zijn al verbonden aan PIER14.',
      image: '/projects/pier14/luchtfoto-haven.png',
    },
    {
      id: 'availability',
      tag: 'Beschikbaarheid',
      title: 'Nog 3 units beschikbaar',
      body: '88% verkocht. Nog beschikbaar: 1 Nautic (108 m²), 1 Harbor+ (289 m²) en 1 Anchor (298 m²).',
      image: '/projects/pier14/beschikbaarheid.png',
    },
    {
      id: 'price',
      tag: 'Prijs',
      title: 'Vanaf €242.500 excl. btw',
      body: 'Nautic-units vanaf €242.500. Anchor-units €635.500. Casco oplevering, koper richt zelf de unit in.',
      image: '/projects/pier14/prijs.png',
    },
    {
      id: 'practical',
      tag: 'Praktisch',
      title: 'Casco unit met overheaddeur',
      body: 'Royale overheaddeur per unit, 3x35A tot 3x80A elektra, 2,5 m³/u water, glasvezel tot in de meterkast.',
      // Eerder de Schokbeton-interior (praktisch.png) — die industriële
      // betonpilaren-look paste niet bij de positionering, vooral niet voor
      // beleggers. project.png (rooftop-view rendering) toont de échte
      // unit-architectuur op straat-niveau.
      image: '/projects/pier14/project.png',
    },
    {
      id: 'history',
      tag: 'Historie',
      title: 'Voormalig Schokbeton-terrein',
      body: 'PIER14 ligt op de plek waar Schokbeton, pionier in prefab-betonbouw, jarenlang gevestigd was. Drie loodsen worden gerenoveerd.',
      image: '/projects/pier14/praktisch.png',
    },
    {
      id: 'all-in',
      tag: 'Vrij op naam',
      title: 'Casco oplevering',
      body: 'Eigen meterkast met basisvoorzieningen voor water en elektra inbegrepen. Geen VvE-lasten voor de unit zelf.',
      image: '/projects/pier14/project.png',
    },
  ],

  location: {
    address: 'Lindtsedijk 14, Zwijndrecht',
    city: 'Zwijndrecht',
    district: 'PIER14, voormalig Schokbeton-terrein, industrieterrein Groote Lindt',
    aerialImage: '/projects/pier14/locatie.png',
    // Default pulse-marker positie; user kan later via screenshot van de
    // gerenderde locatie-image bijschaven (zie Paveri-les: pin op tip van
    // ingetekende drop-pin → pinPosition: null).
    pinPosition: null,
    mapsQuery: 'Lindtsedijk+14+Zwijndrecht',
    mapsLink: 'https://www.google.com/maps?q=Lindtsedijk+14+Zwijndrecht',
    // Reistijden uit brochure pag. 4. A16 + treinstation + bushalte
    // hard onderbouwd; waterbus is gepland, dus markeer als "via waterbus"
    // zonder concrete tijd tot dat operationeel is.
    travelTimes: [
      { to: 'A16',                      value: '3 min',  mode: 'car' },
      { to: 'Zwijndrecht NS',           value: '7 min',  mode: 'bike' },
      { to: 'Dichtstbijzijnde bushalte', value: '15 min', mode: 'walk' },
      { to: 'Rotterdam',                value: '20 min', mode: 'car' },
      { to: 'Dordrecht',                value: '10 min', mode: 'car' },
      { to: 'Rotterdam-The Hague Airport', value: '30 min', mode: 'car' },
    ],
    surroundings: [
      { icon: 'water',    text: 'Direct aan de Oude Maas met eigen pier en geplande horecapaviljoen' },
      { icon: 'business', text: 'Maritieme buren: Deen Shipping, Aqualiner, Vos Sliedrecht, EMS/Oechies, Bode Packaging' },
      { icon: 'water',    text: 'Twee insteekhavens op het terrein: Uilenhaven en Schokhaven' },
      { icon: 'train',    text: 'Geplande waterbushalte naar Rotterdam en Dordrecht' },
      { icon: 'parking',  text: 'Eigen parkeerplaatsen per unit op een ruim opgezet terrein' },
    ],
    highlights: [
      'Aan de zuidzijde van Zwijndrecht, omsloten door Oude Maas, Uilenhaven en Schokhaven.',
      'Historisch terrein van Schokbeton, drie loodsen worden gerenoveerd.',
      'Specifiek aangewezen door de gemeente voor nautisch gerelateerde bedrijven.',
    ],
    scarcityNote: 'PIER14 ligt midden in de maritieme hub van de Drechtsteden, met directe aansluiting op de Oude Maas en korte routes naar Rotterdam en Dordrecht. Een logische plek voor nautische bedrijven die water-toegang en regio-bereik combineren.',
  },

  // Status per type aggregeert uit sitePlan.sections hierboven (schema-rename
  // van layoutRows → sections; layoutRows-renderer verwachtte nested
  // left/right-structuur die PIER14 niet heeft, gaf daarom "0 units").
  //
  // Status van het project. soldPercent is een schatting, moet door
  // user bijgewerkt worden zodra de exacte beschikbaarheid bekend is.
  status: {
    soldPercent: 88,
    headline: 'Circa 88% verkocht. Nog 3 units beschikbaar: 1 Nautic (108 m²), 1 Harbor+ (289 m²) en 1 Anchor (298 m²). Stern, Marina, Tidal, Bow en Harbor- uitverkocht.',
    units: {
      Stern:  { label: 'Uitverkocht', state: 'sold_out' },
      Marina: { label: 'Uitverkocht', state: 'sold_out' },
      Nautic: { label: 'Nog 1 beschikbaar', state: 'available' },
      Tidal:  { label: 'Uitverkocht', state: 'sold_out' },
      Harbor: { label: 'Harbor+ beschikbaar (Harbor- uitverkocht)', state: 'available' },
      Anchor: { label: 'Nog 1 beschikbaar', state: 'available' },
      Bow:    { label: 'Uitverkocht', state: 'sold_out' },
    },
  },

  // Plattegrond, uit Situatietekening (brochure pag. 8/18). 26 units verspreid
  // over drie clusters. TODO: user stuurt SVG met exacte unit-coordinaten zoals
  // bij Paveri (PLATTEGROND De Paveri.svg). Dan switch ik naar het `svg`-schema
  // via SitePlanPolygonBubble voor pixel-precieze layout. Tot dan gebruik ik
  // een vereenvoudigde rows-layout op basis van de brochure-screenshot.
  //
  // Cluster-indeling (uit brochure pag. 8):
  //   Top-rij:     26 (Bow), 25 (Anchor), 1 (Stern), 2 (Marina), 3-9 (Nautic)
  //   Middel-rij:  10-15 (Nautic)
  //   Sub-cluster: 19 (Harbor), 17 (Tidal), 20a-b, 16a-b (Nautic)
  //   Onderaan:    23-24 (Anchor), 22, 21 (Anchor), 18 (Harbor)
  sitePlan: {
    // 'svg' schema: exacte unit-coordinaten uit officiele SVG PIER14
    // (viewBox 0 0 1497.8 897.9). SitePlanPolygonBubble.jsx rendert per
    // unit een <rect> of <polygon> op deze coordinaten zodat de vorm
    // 1-op-1 klopt met de brochure-situatietekening. Door state-attribuut
    // per unit krijgt 'ie de juiste kleur (available groen, sold grijs).
    //
    // Telling: 26 units, met 16 (16a+16b) en 20 (20a+20b) elk als 1 unit
    // (sub-splits worden gecombineerd in 1 rect zodat countSitePlanUnits
    // op 26 uitkomt zoals de brochure-administratie aangeeft).
    svg: {
      viewBox: '0 0 1497.8 897.9',
      // Terrein-omtrek als achtergrondvlak (volledige viewBox).
      background: '0,0 1497.8,0 1497.8,897.9 0,897.9',
      // Type-label onder elk nummer aan-uit: voor PIER14 uit want alle
      // 26 units delen 5 types, dat geeft visueel te druk in zo'n klein grid.
      showUnitType: false,
      units: [
        // Top-rij links: grote sold units (26, 25, 24, 23, 22).
        { number: 26, type: 'Bow',    state: 'sold',      rect: { x: 71,     y: 268.2, w: 344.4, h: 177.8 } },
        { number: 25, type: 'Anchor', state: 'sold',      rect: { x: 420.3,  y: 268.2, w: 180.7, h: 213.3 } },
        { number: 24, type: 'Anchor', state: 'sold',      rect: { x: 605.8,  y: 268.2, w: 113.2, h: 213.3 } },
        { number: 23, type: 'Anchor', state: 'sold',      rect: { x: 723.8,  y: 268.2, w: 113.2, h: 213.3 } },
        { number: 22, type: 'Anchor', state: 'sold',      rect: { x: 841.8,  y: 268.2, w: 113.2, h: 213.3 } },
        // Top-rij midden: small sold Nautics (12-15).
        { number: 12, type: 'Nautic', state: 'sold',      rect: { x: 959.8,  y: 268.1, w: 55.9,  h: 139.3 } },
        { number: 13, type: 'Nautic', state: 'sold',      rect: { x: 1020.5, y: 268.1, w: 55.9,  h: 139.3 } },
        { number: 14, type: 'Nautic', state: 'sold',      rect: { x: 1081.2, y: 268,   w: 55.9,  h: 139.3 } },
        { number: 15, type: 'Nautic', state: 'sold',      rect: { x: 1141.8, y: 268.2, w: 55.9,  h: 139.3 } },
        // Top-rechts: 19 (Harbor+ beschikbaar) wide rect.
        { number: 19, type: 'Harbor', state: 'available', rect: { x: 1201.8, y: 268.1, w: 231.9, h: 109.2 }, price: 699000 },
        // 18 (Harbor- sold) is een L-shape: smal voet-stuk onder 20+16 dat
        // doorloopt in een breder dak boven 16+17 (onder unit 19). Polygon-
        // hoekpunten uit het originele SVG-pad (afgeronde hoeken weggelaten,
        // levert visueel verschil < 1px op deze schaal).
        { number: 18, type: 'Harbor', state: 'sold', polygon: '1080,412.3 1080,481.6 1433.7,481.6 1433.7,382.1 1201.8,382.1 1201.8,412.3' },
        // Front-rij links: grote sold units (1, 2).
        { number: 1,  type: 'Stern',  state: 'sold',      rect: { x: 71,     y: 450.7, w: 193.3, h: 180.8 } },
        { number: 2,  type: 'Marina', state: 'sold',      rect: { x: 269.4,  y: 450.8, w: 145.7, h: 180.8 } },
        // Front-rij midden: 3-11 (Nautic; 7 beschikbaar — rest sold).
        { number: 3,  type: 'Nautic', state: 'sold',      rect: { x: 420.3,  y: 486.2, w: 55.3,  h: 145.4 } },
        { number: 4,  type: 'Nautic', state: 'sold',      rect: { x: 480.2,  y: 486.2, w: 55.3,  h: 145.4 } },
        { number: 5,  type: 'Nautic', state: 'sold',      rect: { x: 540.2,  y: 486.1, w: 55.3,  h: 145.4 } },
        { number: 6,  type: 'Nautic', state: 'sold',      rect: { x: 600.1,  y: 486.1, w: 55.3,  h: 145.4 } },
        { number: 7,  type: 'Nautic', state: 'available', rect: { x: 660,    y: 486.2, w: 55.3,  h: 145.4 }, price: 242500 },
        { number: 8,  type: 'Nautic', state: 'sold',      rect: { x: 719.9,  y: 486.2, w: 55.3,  h: 145.4 } },
        { number: 9,  type: 'Nautic', state: 'sold',      rect: { x: 779.8,  y: 486.1, w: 55.3,  h: 145.4 } },
        { number: 10, type: 'Nautic', state: 'sold',      rect: { x: 839.8,  y: 486.1, w: 55.3,  h: 145.4 } },
        { number: 11, type: 'Nautic', state: 'sold',      rect: { x: 899.7,  y: 486.2, w: 55.3,  h: 145.4 } },
        // 21 (Anchor beschikbaar) midden, breder dan Nautics.
        { number: 21, type: 'Anchor', state: 'available', rect: { x: 959.9,  y: 412.2, w: 115.4, h: 219.3 }, price: 635500 },
        // 20 (a+b samen) en 16 (a+b samen): elk gecombineerd uit 2 sub-rects.
        { number: 20, type: 'Nautic', state: 'sold',      rect: { x: 1081.2, y: 486.3, w: 116.5, h: 145.4 } },
        { number: 16, type: 'Nautic', state: 'sold',      rect: { x: 1202.5, y: 486.2, w: 116.5, h: 145.4 } },
        // 17 (Tidal sold) rechts.
        { number: 17, type: 'Tidal',  state: 'sold',      rect: { x: 1323.8, y: 486.2, w: 109.9, h: 145.4 } },
      ],
    },
    legend: [
      { state: 'available', label: 'Beschikbaar' },
      { state: 'sold',      label: 'Verkocht' },
    ],
    cardinalLabels: {
      bottom: 'Oude Maas',
    },
  },

  // 7 unit-types. Prijzen en m² uit brochure-prijslijst (pag. 18 screenshot).
  units: [
    {
      type: 'Nautic',
      size: 108,
      levels: 2,
      parking: 2,
      levelDetail: '54 m² begane grond + 54 m² eerste verdieping',
      priceFrom: 242500,
      pricePerM2: 2245,
      state: 'available',
      stateLabel: 'Nog enkele beschikbaar',
      uses: ['Opslag', 'Werkplaats', 'Kantoor', 'Showroom', 'Combinatie werk + opslag'],
      image: '/projects/pier14/prijs.png',
      pitch: 'Compacte unit van 108 m² over twee lagen. Standaardtype, meest beschikbaar.',
      specs: [
        '54 m² BG + 54 m² verdieping',
        'Royale overheaddeur',
        '2 eigen parkeerplaatsen',
        'Vloerbelasting BG ca. 1.000 kg/m²',
      ],
    },
    {
      type: 'Tidal',
      size: 214,
      levels: 2,
      parking: 2,
      levelDetail: '106 m² BG + 108 m² verdieping',
      priceFrom: null,
      pricePerM2: null,
      state: 'sold_out',
      stateLabel: 'Uitverkocht',
      uses: ['Bedrijfsruimte', 'Werkplaats + kantoor'],
      image: '/projects/pier14/prijs.png',
      pitch: 'Middelgrote unit van 214 m², Tidal-type. Inmiddels uitverkocht.',
      specs: [
        '106 m² BG + 108 m² verdieping',
        '2 eigen parkeerplaatsen',
      ],
    },
    {
      type: 'Marina',
      size: 232,
      levels: 2,
      parking: 2,
      levelDetail: '153 m² BG + 79 m² verdieping',
      priceFrom: null,
      pricePerM2: null,
      state: 'sold_out',
      stateLabel: 'Uitverkocht',
      uses: ['Bedrijfsruimte met opslag'],
      image: '/projects/pier14/prijs.png',
      pitch: 'Middelgrote unit van 232 m², Marina-type. Inmiddels uitverkocht.',
      specs: [
        '153 m² BG + 79 m² verdieping',
        '2 eigen parkeerplaatsen',
      ],
    },
    {
      type: 'Harbor',
      // Harbor+ (289 m²) is de beschikbare variant — unit 19 op situatietekening.
      // Harbor- (340 m²) is uitverkocht (unit 18). Type-detail beschrijft de
      // Harbor+ omdat dat is wat sales nu aanbeveelt; de groter Harbor- staat
      // alleen ter context erbij in de specs.
      size: 289,
      levels: 2,
      parking: 6,
      levelDetail: '193 m² BG + 96 m² verdieping (Harbor+); Harbor- variant 340 m² is uitverkocht.',
      priceFrom: 699000,
      pricePerM2: 2418,
      state: 'available',
      stateLabel: 'Harbor+ beschikbaar',
      uses: ['Werkplaats', 'Productie', 'Opslag met kantoor'],
      image: '/projects/pier14/prijs.png',
      pitch: 'Harbor+ (289 m²) voor productie of opslag, met hoge overheaddeur en tussenbordestrap. De grotere Harbor- (340 m²) is uitverkocht.',
      specs: [
        '193 m² BG + 96 m² verdieping (Harbor+)',
        'Hoge overheaddeur (extra hoog)',
        '6 eigen parkeerplaatsen',
        'Vloerbelasting BG ca. 1.500 kg/m²',
      ],
    },
    {
      type: 'Anchor',
      size: 298,
      levels: 2,
      parking: 4,
      levelDetail: '190 m² BG + 108 m² verdieping',
      priceFrom: 635500,
      pricePerM2: 2132,
      state: 'available',
      stateLabel: 'Nog enkele beschikbaar',
      uses: ['Werkplaats', 'Bedrijfsruimte met kantoor', 'Productie'],
      image: '/projects/pier14/prijs.png',
      pitch: 'Anchor-unit van 298 m². Ruimte voor werkplaats én volwaardig kantoor.',
      specs: [
        '190 m² BG + 108 m² verdieping',
        'Royale overheaddeur',
        '4 eigen parkeerplaatsen',
        'Vloerbelasting BG ca. 1.000 kg/m²',
      ],
    },
    {
      type: 'Stern',
      size: 416,
      levels: 2,
      parking: 4,
      levelDetail: '278 m² BG + 138 m² verdieping',
      priceFrom: null,
      pricePerM2: null,
      state: 'sold_out',
      stateLabel: 'Uitverkocht',
      uses: ['Grote bedrijfsruimte'],
      image: '/projects/pier14/prijs.png',
      pitch: 'Stern-unit van 416 m². Inmiddels uitverkocht.',
      specs: [
        '278 m² BG + 138 m² verdieping',
        '4 eigen parkeerplaatsen',
        'Vloerbelasting BG ca. 1.500 kg/m²',
      ],
    },
    {
      type: 'Bow',
      size: 784,
      levels: 2,
      parking: 10,
      levelDetail: '431 m² BG + 353 m² verdieping',
      priceFrom: null,
      pricePerM2: null,
      state: 'sold_out',
      stateLabel: 'Uitverkocht',
      uses: ['Grote bedrijfsruimte met werkplaats én kantoor'],
      image: '/projects/pier14/prijs.png',
      pitch: 'Grootste unit van 784 m², Bow-type. Inmiddels uitverkocht.',
      specs: [
        '431 m² BG + 353 m² verdieping',
        'Hoge overheaddeur met tussenbordestrap',
        '10 eigen parkeerplaatsen',
        'Vloerbelasting BG ca. 1.500 kg/m²',
      ],
    },
  ],

  features: [
    'Royale elektrische overheaddeur per unit',
    'Elektra-aansluiting 3x35A tot 3x80A',
    'Wateraansluiting 2,5 m³/u',
    'Glasvezel tot in de meterkast',
    'Casco oplevering, koper richt zelf in',
    'Units in overleg koppelbaar',
    'Eigen parkeerplaatsen direct voor de deur',
    'Vloerbelasting BG 1.000–1.500 kg/m²',
    'Verdiepingsvloer in kanaalplaat',
    'VvE voor algemene voorzieningen (terrein, gevelsporen, hemelwater)',
  ],

  // "Waarom PIER14", vijf scherpe USPs over wat PIER14 onderscheidt.
  // Bewust water + maritiem voorop, daarna bereikbaarheid + kwaliteit.
  highlights: [
    { title: 'Aan het water',         body: 'Direct aan de Oude Maas, met eigen pier en twee insteekhavens (Uilenhaven en Schokhaven). Uniek voor PIER14.' },
    { title: 'Maritieme cluster',     body: 'Buren als Deen Shipping, Aqualiner, Vos Sliedrecht, EMS/Oechies, Bode Packaging. Specifiek bedrijventerrein voor de nautische sector.' },
    { title: 'Drie verbindingen',     body: 'A16 op 3 minuten, Zwijndrecht NS op 7 minuten fietsen, geplande waterbushalte naar Rotterdam en Dordrecht.' },
    { title: 'Koppelbare units',      body: '7 unit-types van 108 tot 784 m². Twee of meer units koppelbaar zodat de ruimte meegroeit.' },
    { title: 'Hoogwaardige basis',    body: '3x80A elektra, 2,5 m³/u water, glasvezel, vloerbelasting tot 1.500 kg/m². Casco oplevering naar eigen wens in te delen.' },
    { title: 'Historische context',   body: 'Voormalig Schokbeton-terrein, pionier in prefab-betonbouw. Drie loodsen worden gerenoveerd.' },
  ],

  audiences: [
    { id: 'maritime',  title: 'Maritieme ondernemer',  body: 'Scheepvaart, jachtbouw, watersport, scheepsreparatie, maritieme dienstverlening, direct aan het water.' },
    { id: 'service',   title: 'Toeleverancier maritiem', body: 'Bedrijven die maritieme klanten bedienen: techniek, logistiek, onderdelen, opslag.' },
    { id: 'workplace', title: 'Werkplaats + showroom', body: 'Casco-opzet met hoge overheaddeur, werkplaats op BG, kantoor of showroom op verdieping.' },
    { id: 'investor',  title: 'Belegger', body: 'NB: PIER14 is een KOOPproject voor maritieme ondernemers. Beleggers kunnen geen unit kopen voor verhuur.' },
  ],

  process: [
    { step: 1, title: 'Oriënteren',          body: 'Brochure, plattegronden en prijslijst doornemen.' },
    { step: 2, title: 'Reserveren',          body: 'Gewenste unit reserveren via de koopomgeving.' },
    { step: 3, title: 'Inschrijving',        body: 'Markeer favoriete unit + bespreking met REPP over wensen.' },
    { step: 4, title: 'Koopovereenkomst',    body: 'Onderteken koopovereenkomst, opstart bouwfase.' },
    { step: 5, title: 'Bouwfase',            body: 'Renovatie Schokbeton-loodsen + nieuwbouw. Status: bouw gestart.' },
    { step: 6, title: 'Oplevering',          body: 'Casco oplevering, koper richt zelf in.' },
  ],

  // Bouw is gestart, omgevingsvergunning afgegeven. Oplevering begin
  // december 2026 conform laatste planning van de ontwikkelaar.
  planning: [
    { phase: 'Omgevingsvergunning', date: 'Afgegeven' },
    { phase: 'Start bouw',          date: 'Gestart', current: true },
    { phase: 'Oplevering',          date: 'Begin december 2026' },
  ],

  // priceComparison: bewust uitgeschakeld voor PIER14, nautische units
  // zijn te uniek (water-locatie, branche-specifiek) voor zinvolle
  // benchmarks tegen reguliere bedrijfsunits in Drechtsteden/Rotterdam-Zuid.
  // PriceCompareBubble wordt niet getoond in de moreInfo-pool als er geen
  // rows zijn. Wanneer relevante benchmark-data komt, vul je deze in.
  priceComparison: {
    peildatum: '2026-06',
    rows: [],
  },

  investor: {
    // Beleggers-route is uitgeschakeld voor PIER14, beleggers kunnen geen
    // unit kopen. We laten de BAR-config wel staan zodat de rendement-calc
    // technisch werkt voor wie 'em opent, maar persona-flow voor belegger/
    // beide krijgt een nautisch-gate exit. NB: de financing-partner Credion
    // is wel ingericht voor de maandlast-calc (eigen-gebruiker pad).
    barRange: 'tot 7%',
    barSlider: { min: 3, max: 7, default: 7 },
    markthuurRange: null,
    markthuurAanname: null,
    kernfactoren: [
      'NB: PIER14 is een koopproject voor eigen gebruik door maritieme ondernemers.',
      'Beleggers kunnen geen unit kopen voor verhuur.',
    ],
    cashflow: [],
    fiscaal: [
      'BTW terugvorderbaar voor ondernemers (21% over bouwsom).',
      'Overdrachtsbelasting alleen over grondwaarde (45% van koopsom).',
      'Geen VvE-lasten voor unit zelf (wel voor algemene terrein-voorzieningen).',
    ],
  },

  investorBenefits: [],

  financing: {
    // Op verzoek geen partner-merknaam in bezoeker-copy: gebruik consistent
    // 'onze bedrijfs- en vastgoedfinanciering partner' in alle bot-strings.
    // App.jsx leest project.financing.partner als generic-replacer voor
    // {financePartner}-templates dus deze waarde verschijnt in copy.
    partner: 'onze bedrijfs- en vastgoedfinanciering partner',
    description: 'Vrijblijvende financieringsscan via onze bedrijfs- en vastgoedfinanciering partner.',
    bullets: [
      'Onafhankelijk advies over zakelijke financiering',
      'Bedrijfsfinanciering tot circa 70% van de koopsom',
      'Snelle scan op haalbaarheid',
    ],
  },

  contentCards: [
    {
      id: 'project',
      title: 'Het project',
      body: '26 bedrijfsunits op kavel 11 van PIER14 in Zwijndrecht. 5.775 m² totaal, hoogwaardige nieuwbouw plus gerenoveerde Schokbeton-loodsen.',
      tag: 'Project',
      image: '/projects/pier14/pier-overview.png',
    },
    {
      id: 'location',
      title: 'Locatie',
      body: 'Aan de zuidzijde van Zwijndrecht, omsloten door Oude Maas, Uilenhaven en Schokhaven. A16 op 3 minuten.',
      tag: 'Bereikbaarheid',
      image: '/projects/pier14/locatie.png',
    },
    {
      id: 'price',
      title: 'Prijs',
      body: 'Vanaf €242.500 excl. btw voor een Nautic (108 m²). Anchor-units €635.500. Casco oplevering.',
      tag: 'Prijs',
      image: '/projects/pier14/prijs.png',
    },
    {
      id: 'scarcity',
      title: 'Beschikbaarheid',
      body: 'Veel units zijn al verkocht. Stern, Marina, Tidal, Harbor (kleine variant) en Bow zijn uitverkocht. Alleen enkele Nautic en Anchor nog beschikbaar.',
      tag: 'Schaarste',
      image: '/projects/pier14/luchtfoto-detail.png',
    },
    {
      id: 'features',
      title: 'Praktisch',
      body: 'Casco oplevering, royale overheaddeur, eigen parkeerplaatsen, 3x80A elektra, glasvezel, vloerbelasting tot 1.500 kg/m².',
      tag: 'Specs',
    },
    {
      id: 'financing',
      title: 'Financiering',
      body: 'Vrijblijvende financieringsscan via onze bedrijfs- en vastgoedfinanciering partner. Tot circa 70% van de koopsom is gangbaar.',
      tag: 'Financiering',
    },
    {
      id: 'maritime',
      title: 'Maritieme buren',
      body: 'Deen Shipping, Aqualiner, Vos Sliedrecht, EMS/Oechies, Bode Packaging zijn al verbonden aan PIER14.',
      tag: 'Cluster',
      image: '/projects/pier14/huidige-situatie.png',
    },
  ],

  team: [
    { name: 'REPP', role: 'verkoop' },
    { name: 'FRED Developers', role: 'ontwikkelaar' },
    { name: 'Nautisch Maritiem Zwijndrecht Beheer', role: 'opdrachtgever' },
  ],

  whatsappNumber: '+31617192538',
  phoneNumber: '020-2610080',
  // Brochure 29.07.2026 op WordPress repp.nl — één bron voor zowel CLP als
  // de externe knowledge bot (Reppit) zodat updates centraal gebeuren.
  // Knowledge-bot doc verwijst naar dezelfde URL.
  brochureUrl: 'https://repp.nl/wp-content/uploads/2026/08/29.07.2026-Brochure-PIER14-BVG.pdf',
  priceListUrl: '/projects/pier14/prijslijst.pdf',
  portalUrl: 'https://kopen.repp.nl/pier14',
  portalLabel: 'Bekijk PIER14 website',
  // Zapier-webhook voor Credion financierings-aanvraag (uit intake).
  credionWebhookUrl: 'https://hooks.zapier.com/hooks/catch/2082653/4b7r5qv/',

  salesTeam: {
    bot: { name: 'Jesse', org: 'REPP' },
    rep: { name: 'Jesse', context: 'PIER14 / Drechtsteden' },
  },

  // Persona-aware copy. Aangepast voor PIER14's maritieme positionering,
  // "thuishaven" + water-context. eigen_gebruiker = maritieme ondernemer
  // is de hoofd-route. belegger/beide → bij flowOverrides.nauticGate al
  // gevangen, dus deze copy is een safety-net voor wie alsnog daar
  // doorheen komt (bv. test-flow zonder gate).
  personaCopy: {
    eigen_gebruiker: {
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over PIER14, speciaal voor maritieme ondernemers aan de Oude Maas.',
      recommendCopy: 'Dan zijn vooral de werkplaats-mogelijkheden, bereikbaarheid en de maritieme cluster belangrijk. PIER14 is casco opgeleverd zodat je de unit naar eigen behoefte inricht.',
      waPhrase: 'Ik zoek voor mijn maritieme bedrijf',
    },
    belegger: {
      microIntro: 'Helemaal goed. NB: PIER14 is een koopproject voor maritieme ondernemers, beleggers kunnen geen unit kopen voor verhuur.',
      recommendCopy: 'Ben je zelf actief in de maritieme sector? Dan ben je welkom als koper-gebruiker. Anders kunnen we je doorverwijzen naar andere REPP-projecten waar belegging wel kan.',
      waPhrase: 'Ik kijk als belegger',
    },
    beide: {
      microIntro: 'Helemaal goed. PIER14 is primair voor maritieme ondernemers die zelf de unit gaan gebruiken.',
      recommendCopy: 'Voor eigen gebruik is dit project ideaal als je in de maritieme sector zit. Voor pure belegging is PIER14 niet geschikt, beleggers kunnen geen unit kopen voor verhuur.',
      waPhrase: 'Ik kijk vanuit beide perspectieven',
    },
    onbekend: {
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over PIER14, bedrijfsunits voor maritieme ondernemers aan de Oude Maas.',
      recommendCopy: 'PIER14 is ontwikkeld voor de maritieme sector. Als je in scheepvaart, watersport of een aanverwante branche zit, kijken we graag mee.',
      waPhrase: 'Ik wil graag meer weten',
    },
  },

  flowOverrides: {
    // Pin de intent-vraag op de open "Waarom"-variant. Default zit in een
    // A/B test (a = "Waarom ben je op zoek...", b = "Eigen gebruik of belegging?")
    // en de B-variant landt te smal voor PIER14 omdat we daar de extra
    // nauticGate-vraag al achteraan zetten — twee binaire vragen op rij
    // voelt verhoor-achtig. Open framing wint hier.
    intentLabel: 'Waarom ben je op zoek naar een bedrijfsunit?',

    // Branche-gate aan voor PIER14: na de intent-vraag krijgt elke
    // bezoeker de extra vraag "Ben je een nautisch ondernemer?". Niet-
    // nautische leads worden via een exit-flow doorverwezen naar andere
    // REPP-projecten. Dit voorkomt dat de sales-tijd verdund wordt door
    // leads die het project nooit kunnen kopen (gemeente-vereiste:
    // alleen nautisch gerelateerde bedrijven).
    nauticGate: {
      enabled: true,
      // Array-vorm: elke string = één bot-bubble. \n binnen een string geeft
      // paragraaf-break ín de bubble (rendert dankzij whitespace-pre-line in
      // BotMessage). Op verzoek 2 bubbles met ruimte tussen de zinnen ipv
      // 3 losse bubbles.
      explanation: [
        'Een nautisch ondernemer is iemand met een bedrijf in de scheepvaart, watersport, jachtbouw, scheepsreparatie, maritieme dienstverlening of een aanverwante sector.\n\nDenk aan rederijen, jachthavens, scheepstoelevering, watersportwinkels, bootverhuur of bedrijven die direct met de maritieme keten samenwerken.',
        'Levert je bedrijf vooral aan nautische klanten, of bestaat het merendeel van je klanten uit de nautische sector?\n\nDan tel je ook mee als nautisch ondernemer.',
      ],
      exitMessage: 'Helaas past PIER14 dan niet bij jou, dit project is door de gemeente specifiek aangewezen voor nautisch gerelateerde bedrijven.',
      exitReferral: 'We kunnen je doorverwijzen naar andere REPP-bedrijfsunit-projecten in Nederland waar je wél terecht kunt. Laat hieronder je gegevens achter, dan nemen we contact op.',
    },

    // Belegger-route: bezoeker hoeft niet zelf nautisch te zijn, maar moet
    // er wel een nautische huurder in plaatsen. App.jsx detecteert dit
    // explainer-veld en slaat de nauticGate voor belegger/beide-intent
    // over: ipv de gate-vraag krijgt 'ie de regel uitgelegd + door naar
    // USP-cards + availabilityCheck.
    beleggerExplainer: [
      'Let op: huurders en kopers voor PIER14 moeten nautisch zijn. Als belegger mag je een unit kopen, mits je er een nautische huurder in plaatst. Hier kunnen we je eventueel bij helpen.',
      'Hier wat meer over het project.',
    ],

    sizeQuestion: {
      label: 'Hoe groot wil je dat de unit ongeveer is?',
      // Labels expliciet op type-naam zodat de bezoeker meteen weet welk
      // unit-type hij krijgt aanbevolen. Geen tilde-prefix want de exacte
      // m² staan in de prijslijst en unit-card. Vierde optie 'koppelen'
      // routeert naar de Anchor-aanbeveling met aangepaste copy in
      // recommendIntroByChoice (gekoppelde units vereisen persoonlijk
      // gesprek met sales over beschikbaarheid).
      options: [
        { id: 'nautic',   label: '108 m² Nautic',            score: 12, unit: 'Nautic' },
        { id: 'harbor',   label: '289 m² Harbor +',          score: 15, unit: 'Harbor' },
        { id: 'anchor',   label: '298 m² Anchor',            score: 15, unit: 'Anchor' },
        { id: 'koppelen', label: 'Ik wil units koppelen',     score: 15, unit: 'Anchor' },
      ],
    },
  },

  // Onderwerpen die voor PIER14 niet in de moreInfo-chips komen.
  // priceComparison heeft lege rows (nautische units zijn te uniek voor
  // benchmark) — de chip zou een leeg scherm geven, dus uitschakelen.
  // 'investor' (Belegger voordelen) is uit voor PIER14 omdat beleggers
  // hier alleen mogen kopen mits nautische huurder; de algemene BAR-
  // belegger-tegel past niet bij die boodschap.
  disabledTopics: ['priceCompare', 'investor'],

  // Project-specifieke exit-intent reasons. Voegt de PIER14-relevante
  // "Niet nautisch" reden toe aan de standaard-set. ExitIntentPrompt
  // valt terug op een ingebouwde default als deze niet gezet is.
  exitIntentReasons: [
    { id: 'prijs',         label: 'Prijs te hoog' },
    { id: 'locatie',       label: 'Locatie past niet' },
    { id: 'oppervlakte',   label: 'Oppervlakte past niet' },
    { id: 'huur',          label: 'Liever huren' },
    { id: 'tijd',          label: 'Geen tijd nu' },
    { id: 'not_branche',   label: 'Niet nautisch' },
    { id: 'anders',        label: 'Iets anders' },
  ],

  recommendIntroByChoice: {
    nautic:   'Op basis van je antwoorden past een Nautic-unit (108 m²) goed bij wat je zoekt.',
    harbor:   'De Harbor-units (289 m²) bieden hoge overheaddeuren en zijn geschikt voor productie of grotere werkplaatsen.',
    anchor:   'De Anchor-units (298 m²) zijn een goede match: ruime werkplaats op de begane grond en kantoor op de verdieping.',
    koppelen: 'Voor gekoppelde units adviseren we een gesprek, dan kunnen we kijken welke beschikbare units naast elkaar liggen en het beste passen. Als basis nemen we Anchor (298 m²) als startpunt.',
  },
}

// Volgorde van USP-cards aangepast per persona. Voor PIER14 maritiem-eerst.
// Net als Paveri/Elster: resolveer ID's naar volledige card-objecten zodat
// UspCardsBubble direct .image/.tag/.title kan lezen. Zonder deze .map-stap
// krijgt de carousel kale grijze placeholders ipv echte foto's.
export function uspCardOrder(persona) {
  // 'history' card weggehaald op verzoek: voegt te weinig waarde toe naast
  // 'project'+'maritime' die het Schokbeton-verhaal al aanstippen.
  const ids =
    persona === 'belegger' || persona === 'beide'
      ? ['project', 'maritime', 'price', 'location', 'practical']
      : ['project', 'maritime', 'location', 'availability', 'practical']
  return ids
    .map((id) => project.uspCards.find((c) => c.id === id))
    .filter(Boolean)
}
