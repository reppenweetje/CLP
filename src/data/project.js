// Projectdata De Hofman. Sentence case + REPP en De Hofman in correcte caps.
// Vervangbaar voor andere REPP-projecten — behoud dezelfde shape.
export const project = {
  id: 'de-hofman',
  name: 'de hofman',
  displayName: 'De Hofman',
  tagline: 'Omdat Haarlem werkt.',
  shortDescription: '14 hoogwaardige bedrijfsunits in Haarlem Waarderpolder.',
  hero: '/images/hero.jpg',
  logo: '/images/logo.svg',
  exterior: '/images/exterieur.jpg',

  // Gallery wisselt visueel tussen exterieur en interieur shots zodat de
  // hero-carousel duidelijk transformeert, niet twee bijna-identieke avond-shots.
  gallery: [
    { src: '/images/hero.jpg', alt: 'De Hofman exterieur in de avond' },
    { src: '/images/showroom.jpg', alt: 'Unit ingericht als showroom' },
    { src: '/images/exterieur.jpg', alt: 'De Hofman vanuit de straat' },
    { src: '/images/unit-l.jpg', alt: 'Unit ingericht als kantoor' },
    { src: '/images/werkplaats.jpg', alt: 'Unit ingericht als werkplaats' },
    { src: '/images/unit-studio.jpg', alt: 'Unit ingericht als fotostudio' },
  ],

  // USP-cards voor de eerste micro-value moment.
  // Elke card is zelfstandig leesbaar: tag + titel + body + image. Persona-aware
  // ordering wordt door uspCardOrder() per persona bepaald.
  uspCards: [
    {
      id: 'project',
      tag: 'Project',
      title: '14 bedrijfsunits in Haarlem',
      body: 'Hoogwaardige nieuwbouwunits in de Waarderpolder, geschikt voor ondernemers en beleggers.',
      image: '/images/exterieur.jpg',
    },
    {
      id: 'location',
      tag: 'Locatie',
      title: '3 minuten van de A9',
      body: 'Goed bereikbaar richting Haarlem, Amsterdam, Schiphol en Alkmaar.',
      image: '/images/hero.jpg',
    },
    {
      id: 'availability',
      tag: 'Beschikbaarheid',
      title: '50% verkocht',
      body: 'XL is uitverkocht. Nog enkele L-units beschikbaar. XXL volgt later.',
      image: '/images/unit-l.jpg',
    },
    {
      id: 'price',
      tag: 'Prijs',
      title: 'Vanaf €239.500 v.o.n. excl. btw',
      body: 'Scherpe m²-prijs voor nieuwbouw in de Waarderpolder.',
      image: '/images/unit-studio.jpg',
    },
    {
      id: 'unit-l',
      tag: 'Unit L',
      title: 'Circa 105 m² over twee lagen',
      body: 'Praktisch voor opslag, werkplaats, kantoor, showroom of studio.',
      image: '/images/showroom.jpg',
    },
    {
      id: 'practical',
      tag: 'Praktisch',
      title: 'Overheaddeur en eigen parkeerplaats',
      body: 'Ontworpen voor ondernemers die functionele ruimte zoeken met representatieve uitstraling.',
      image: '/images/werkplaats.jpg',
    },
    {
      id: 'investor',
      tag: 'Belegging',
      title: 'Schaarste en verhuurbaarheid',
      body: 'Kleinschalig, nieuwbouw en op een gevestigde bedrijvenlocatie in Haarlem. Bij belaste verhuur kunnen fiscale aandachtspunten spelen. Laat je daarover goed adviseren.',
      image: '/images/exterieur.jpg',
    },
  ],

  location: {
    address: 'A. Hofmanweg, Waarderpolder, Haarlem',
    city: 'Haarlem',
    district: 'Waarderpolder',
    aerialImage: '/images/exterieur.jpg',
    travelTimes: [
      { to: 'A9', value: '3 min' },
      { to: 'Amsterdam', value: '25 min' },
      { to: 'Schiphol', value: '25 min' },
      { to: 'Alkmaar', value: '25 min' },
    ],
    highlights: [
      'Rust aan het water, reuring om de hoek.',
      'Gevestigde bedrijvenlocatie in Haarlem.',
      'In de Metropoolregio Amsterdam.',
    ],
  },

  status: {
    soldPercent: 50,
    headline: 'Circa 50% verkocht. XL uitverkocht. Nog enkele L-units. XXL volgt.',
    units: {
      L: { label: 'Nog enkele beschikbaar', state: 'available' },
      XL: { label: 'Uitverkocht', state: 'sold_out' },
      XXL: { label: 'Volgt later in verkoop', state: 'coming_soon' },
    },
  },

  // 14 units site plan met actuele beschikbaarheid uit kopen.repp.nl.
  // 2 rijen van 7. XL op de hoeken, XXL op de uiteinden, L in het midden.
  sitePlan: {
    rows: [
      { units: [
        { number: 1, type: 'XL', state: 'sold' },
        { number: 2, type: 'L', state: 'sold' },
        { number: 3, type: 'L', state: 'sold' },
        { number: 4, type: 'L', state: 'available' },
        { number: 5, type: 'L', state: 'sold_ov' },
        { number: 6, type: 'L', state: 'available' },
        { number: 7, type: 'XXL', state: 'coming_soon' },
      ]},
      { units: [
        { number: 8, type: 'XL', state: 'sold' },
        { number: 9, type: 'L', state: 'sold' },
        { number: 10, type: 'L', state: 'sold' },
        { number: 11, type: 'L', state: 'sold_ov' },
        { number: 12, type: 'L', state: 'available' },
        { number: 13, type: 'L', state: 'available' },
        { number: 14, type: 'XXL', state: 'coming_soon' },
      ]},
    ],
    legend: [
      { state: 'available', label: 'Beschikbaar' },
      { state: 'sold_ov', label: 'Verkocht ov' },
      { state: 'sold', label: 'Verkocht' },
      { state: 'coming_soon', label: 'Later in verkoop' },
    ],
  },

  units: [
    {
      type: 'L',
      size: 105,
      levels: 2,
      parking: 1,
      levelDetail: '52,5 m² begane grond plus 52,5 m² eerste verdieping',
      priceFrom: 239500,
      pricePerM2: 2281,
      pricePerM2EarlyBird: 2233,
      state: 'available',
      stateLabel: 'Nog enkele beschikbaar',
      uses: ['Opslag', 'Werkplaats', 'Kantoor', 'Showroom', 'Studio'],
      image: '/images/unit-l.jpg',
      pitch: 'Praktisch, twee lagen. Geschikt voor opslag, werkplaats, showroom, kantoor of studio.',
      specs: [
        'Circa 105 m² over twee lagen',
        'Elektrische overheaddeur 4 m breed, 3,50 m hoog',
        'Eigen parkeerplaats',
        'Afgewerkt; cv en pantry plaatsbaar',
      ],
    },
    {
      type: 'XL',
      size: 113,
      levels: 2,
      parking: 1,
      priceFrom: 259500,
      pricePerM2: 2296,
      state: 'sold_out',
      stateLabel: 'Uitverkocht',
      uses: ['Werkplaats', 'Showroom', 'Combinatie'],
      image: '/images/exterieur.jpg',
      pitch: 'Iets ruimere variant op de hoeken. Inmiddels uitverkocht.',
      specs: [
        'Circa 113 m² over twee lagen',
        'Elektrische overheaddeur',
        'Eigen parkeerplaats',
      ],
    },
    {
      type: 'XXL',
      size: 191,
      levels: 3,
      parking: 2,
      priceFrom: 515500,
      pricePerM2: 2698,
      state: 'coming_soon',
      stateLabel: 'Volgt later in verkoop',
      uses: ['3-laags bedrijfsunit', 'Variant met bedrijfsgebonden woning'],
      image: '/images/xxl-woning.jpg',
      pitch: 'Drie lagen. Mogelijk met bedrijfsgebonden woning en eigen dakterras. Volgt later in verkoop.',
      specs: [
        'Circa 191 m² over drie lagen',
        'Optie bedrijfsgebonden woning',
        'Eigen dakterras',
        'Elektrische overheaddeur',
      ],
    },
  ],

  features: [
    'Elektrische overheaddeur 4 m breed, 3,50 m hoog',
    'Eigen parkeerplaats op eigen terrein',
    'Nutsaansluitingen',
    'Nieuwbouwgaranties',
    'Koppelbare units mogelijk',
  ],

  highlights: [
    { title: 'Kleinschalig', body: '14 units, representatief en op menselijke schaal.' },
    { title: 'Representatief', body: 'Hoogwaardige uitstraling van architect en ontwikkelaar.' },
    { title: 'Verkoeling op niveau', body: 'Rust aan het water terwijl reuring om de hoek zit.' },
    { title: 'Koppelbaar', body: 'Meerdere units combineren als je groeit, of beleggers vraagt.' },
    { title: 'Praktisch', body: 'Overheaddeur, eigen parkeerplaats, nutsaansluitingen.' },
    { title: 'Gewilde locatie', body: 'Gevestigde bedrijvenlocatie in Waarderpolder.' },
    { title: 'Mkb-proof', body: 'Geschikt voor opslag, werkplaats, showroom, kantoor en woning.' },
    { title: 'Belegging waardig', body: 'Schaarste, verhuurbaarheid en scherpe m²-prijs.' },
  ],

  audiences: [
    { id: 'eigenaar', title: 'Als eigenaar-gebruiker', body: 'Eigenaar zijn van je eigen bedrijfspand met representatieve uitstraling en flexibele indeling.' },
    { id: 'innovator', title: 'Creatieve ondernemers', body: 'Studio, kantoor, showroom of werkplaats in een sfeervol ontwikkelde plek.' },
    { id: 'mkb', title: 'Mkb dat groeit', body: 'Koppelbaar als je groeit, zodat je niet hoeft te verhuizen.' },
    { id: 'belegger', title: 'Belegger', body: 'Kleinschalige nieuwbouw, schaarste en gevraagde locatie voor belegging of verhuur.' },
  ],

  process: [
    { step: 1, title: 'Oriënteren', body: 'Brochure, plattegronden en prijslijst doornemen.' },
    { step: 2, title: 'Reserveren', body: 'Gewenste unit reserveren onder reservering.' },
    { step: 3, title: 'Koopovereenkomst', body: 'Koopcontract en aannemingsovereenkomst opmaken.' },
    { step: 4, title: 'Notaris', body: 'Leveringsakte bij de notaris afronden.' },
    { step: 5, title: 'Bouw', body: 'Bouw vordert via voortgangsupdates.' },
    { step: 6, title: 'Oplevering', body: 'Sleuteloverdracht inclusief opleverkeuring.' },
  ],

  planning: [
    { phase: 'Start verkoop', date: 'Gestart' },
    { phase: 'Start bouw', date: 'December 2024' },
    { phase: 'Ruwbouw', date: 'Voorjaar 2025' },
    { phase: 'Oplevering', date: 'Eind 2025 indicatief' },
  ],

  investorBenefits: [
    'Kleinschalig nieuwbouw, schaars aanbod.',
    'Gevestigde bedrijvenlocatie in Waarderpolder.',
    'Verhuurbaarheid voor mkb in de regio.',
    'Koppelbaar voor verschillende huurprofielen.',
    'Hoogwaardige afwerking en nieuwbouwgaranties.',
  ],

  financing: {
    partner: 'Credion',
    description: 'Vrijblijvende financieringsscan via Credion, onze financieringspartner.',
    bullets: [
      'Mkb-financieringsspecialist',
      'Onafhankelijk advies over zakelijke financiering',
      'Snelle scan op haalbaarheid en condities',
    ],
  },

  contentCards: [
    {
      id: 'project',
      title: 'Het project',
      body: '14 hoogwaardige bedrijfsunits in Haarlem Waarderpolder. Kleinschalig, nieuwbouw en representatief.',
      tag: 'Project',
    },
    {
      id: 'location',
      title: 'Locatie',
      body: 'Waarderpolder, 3 minuten van de A9. Snelle verbindingen naar Amsterdam, Schiphol en Alkmaar.',
      tag: 'Bereikbaarheid',
      image: '/images/exterieur.jpg',
    },
    {
      id: 'price',
      title: 'Prijs',
      body: 'Vanaf circa €239.500 v.o.n. excl. btw. Scherpe m²-prijs in de Waarderpolder.',
      tag: 'Prijs',
    },
    {
      id: 'scarcity',
      title: 'Beschikbaarheid',
      body: 'Circa 50% verkocht. XL uitverkocht. Nog enkele L-units. XXL volgt later.',
      tag: 'Schaarste',
    },
    {
      id: 'features',
      title: 'Praktisch',
      body: 'Overheaddeur, eigen parkeerplaats, koppelbaar, nieuwbouwgaranties en flexibele indeling.',
      tag: 'Specs',
    },
    {
      id: 'financing',
      title: 'Financiering',
      body: 'Vrijblijvende financieringsscan via Credion. We brengen je in contact als je wilt.',
      tag: 'Financiering',
    },
    {
      id: 'investor',
      title: 'Belegging',
      body: 'Verhuurbaarheid, schaarste en prijs per m². Bij belaste verhuur kunnen fiscale aandachtspunten relevant zijn. Laat je daarover goed adviseren.',
      tag: 'Belegger',
    },
  ],

  team: [
    { name: 'REPP', role: 'verkoop' },
    { name: 'Reno', role: 'ontwikkelaar' },
    { name: 'Project R', role: 'projectteam' },
  ],

  whatsappNumber: '+31612345678',
  brochureUrl: '/brochure.pdf',
}

// Volgorde van USP-cards aangepast aan persona.
// Belegger ziet beleggings-info eerder; eigen gebruiker ziet praktische zaken eerder.
export function uspCardOrder(persona) {
  const ids =
    persona === 'belegger'
      ? ['project', 'location', 'availability', 'price', 'investor', 'practical']
      : persona === 'beide'
      ? ['project', 'location', 'availability', 'price', 'unit-l', 'investor']
      : persona === 'eigen_gebruiker'
      ? ['project', 'location', 'availability', 'price', 'unit-l', 'practical']
      : ['project', 'location', 'availability', 'price', 'unit-l', 'practical']
  return ids
    .map((id) => project.uspCards.find((c) => c.id === id))
    .filter(Boolean)
}
