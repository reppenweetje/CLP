// projectdata de hofman tone of voice geen leestekens lowercase
// vervangbaar voor andere repp projecten alle content uit de officiele brochure
export const project = {
  id: 'de-hofman',
  name: 'de hofman',
  displayName: 'De Hofman',
  tagline: 'omdat haarlem werkt',
  shortDescription: '14 hoogwaardige bedrijfsunits in haarlem waarderpolder',
  hero: '/images/hero.jpg',
  logo: '/images/logo.svg',
  exterior: '/images/exterieur.jpg',

  // afbeeldingen voor gallery en rich bubbles
  gallery: [
    { src: '/images/hero.jpg', alt: 'de hofman exterieur in de avond' },
    { src: '/images/exterieur.jpg', alt: 'de hofman vanuit de straat' },
    { src: '/images/showroom.jpg', alt: 'unit ingericht als showroom' },
    { src: '/images/werkplaats.jpg', alt: 'unit ingericht als werkplaats' },
    { src: '/images/unit-l.jpg', alt: 'unit ingericht als kantoor' },
    { src: '/images/unit-studio.jpg', alt: 'unit ingericht als fotostudio' },
  ],

  location: {
    address: 'a hofmanweg waarderpolder haarlem',
    city: 'haarlem',
    district: 'waarderpolder',
    aerialImage: '/images/exterieur.jpg',
    travelTimes: [
      { to: 'a9', value: '3 min' },
      { to: 'amsterdam', value: '25 min' },
      { to: 'schiphol', value: '25 min' },
      { to: 'alkmaar', value: '25 min' },
    ],
    highlights: [
      'rust aan het water reuring om de hoek',
      'gevestigde bedrijvenlocatie in haarlem',
      'in de metropoolregio amsterdam',
    ],
  },

  status: {
    soldPercent: 50,
    headline: 'circa 50 procent verkocht xl uitverkocht l nog enkele beschikbaar xxl volgt',
    units: {
      L: { label: 'nog enkele beschikbaar', state: 'available' },
      XL: { label: 'uitverkocht', state: 'sold_out' },
      XXL: { label: 'volgt later in verkoop', state: 'coming_soon' },
    },
  },

  // 14 units site plan (situatietekening)
  // posities zijn schematisch 2 rijen van 7 of vergelijkbaar voor het demo grid
  sitePlan: {
    rows: [
      { units: [
        { id: 'u01', type: 'L', state: 'sold' },
        { id: 'u02', type: 'L', state: 'sold' },
        { id: 'u03', type: 'L', state: 'available' },
        { id: 'u04', type: 'L', state: 'available' },
        { id: 'u05', type: 'L', state: 'reserved' },
        { id: 'u06', type: 'L', state: 'sold' },
        { id: 'u07', type: 'L', state: 'available' },
      ]},
      { units: [
        { id: 'u08', type: 'XL', state: 'sold' },
        { id: 'u09', type: 'XL', state: 'sold' },
        { id: 'u10', type: 'XL', state: 'sold' },
        { id: 'u11', type: 'XL', state: 'sold' },
        { id: 'u12', type: 'XXL', state: 'coming_soon' },
        { id: 'u13', type: 'XXL', state: 'coming_soon' },
        { id: 'u14', type: 'XXL', state: 'coming_soon' },
      ]},
    ],
    legend: [
      { state: 'available', label: 'beschikbaar' },
      { state: 'reserved', label: 'in optie' },
      { state: 'sold', label: 'verkocht' },
      { state: 'coming_soon', label: 'later in verkoop' },
    ],
  },

  units: [
    {
      type: 'L',
      size: 105,
      levels: 2,
      levelDetail: '52,5 m² begane grond plus 52,5 m² eerste verdieping',
      priceFrom: 239500,
      pricePerM2: 2281,
      pricePerM2EarlyBird: 2233,
      state: 'available',
      stateLabel: 'nog enkele beschikbaar',
      uses: ['opslag', 'werkplaats', 'kantoor', 'showroom', 'studio'],
      image: '/images/unit-l.jpg',
      pitch: 'praktisch twee lagen geschikt voor opslag werkplaats showroom kantoor of studio',
      specs: [
        'circa 105 m² over twee lagen',
        'elektrische overheaddeur 4 m breed 3,50 m hoog',
        'eigen parkeerplaats',
        'afgewerkte cv en pantry plaatsbaar',
      ],
    },
    {
      type: 'XL',
      size: 134,
      levels: 2,
      state: 'sold_out',
      stateLabel: 'uitverkocht',
      uses: ['werkplaats', 'showroom', 'combinatie'],
      image: '/images/exterieur.jpg',
      pitch: 'grotere variant inmiddels volledig verkocht',
      specs: [
        'circa 134 m² over twee lagen',
        'elektrische overheaddeur',
        'eigen parkeerplaats',
      ],
    },
    {
      type: 'XXL',
      size: 191.4,
      levels: 3,
      state: 'coming_soon',
      stateLabel: 'volgt later in verkoop',
      uses: ['3-laagse bedrijfsunit', 'variant met bedrijfsgebonden woning'],
      image: '/images/xxl-woning.jpg',
      pitch: 'drie lagen mogelijk met bedrijfsgebonden woning en eigen dakterras volgt later in verkoop',
      specs: [
        'circa 191 m² over drie lagen',
        'optie bedrijfsgebonden woning',
        'eigen dakterras',
        'elektrische overheaddeur',
      ],
    },
  ],

  features: [
    'elektrische overheaddeur 4 m breed 3,50 m hoog',
    'eigen parkeerplaats op eigen terrein',
    'nutsaansluitingen',
    'nieuwbouwgaranties',
    'koppelbare units mogelijk',
  ],

  // 8 highlights uit de brochure samengevat
  highlights: [
    { title: 'kleinschalig', body: '14 units representatief en op menselijke schaal' },
    { title: 'representatief', body: 'hoogwaardige uitstraling van architect en ontwikkelaar' },
    { title: 'verkoeling op niveau', body: 'rust aan het water terwijl reuring om de hoek zit' },
    { title: 'koppelbaar', body: 'meerdere units combineren als je groeit of beleggers vraagt' },
    { title: 'praktisch', body: 'overheaddeur eigen parkeerplaats nutsaansluitingen' },
    { title: 'gewilde locatie', body: 'gevestigde bedrijvenlocatie in waarderpolder' },
    { title: 'mkb proof', body: 'geschikt voor opslag werkplaats showroom kantoor en woning' },
    { title: 'belegging waardig', body: 'schaarste verhuurbaarheid en scherpe m² prijs' },
  ],

  // doelgroepen voor wie de hofman geschikt is
  audiences: [
    { id: 'eigenaar', title: 'als eigenaar gebruiker', body: 'eigenaar zijn van je eigen bedrijfspand met representatieve uitstraling en flexibele indeling' },
    { id: 'innovator', title: 'creatieve ondernemers', body: 'studio kantoor showroom of werkplaats in een sfeervol ontwikkelde plek' },
    { id: 'mkb', title: 'mkb dat groeit', body: 'koppelbaar als je groeit zodat je niet hoeft te verhuizen' },
    { id: 'belegger', title: 'belegger', body: 'kleinschalige nieuwbouw schaarste en gevraagde locatie voor belegging of verhuur' },
  ],

  // 6 stappen aankoopproces
  process: [
    { step: 1, title: 'oriënteren', body: 'brochure plattegronden en prijslijst doornemen' },
    { step: 2, title: 'reserveren', body: 'gewenste unit reserveren onder reservering' },
    { step: 3, title: 'koopovereenkomst', body: 'koopcontract en aannemingsovereenkomst opmaken' },
    { step: 4, title: 'notaris', body: 'leveringsakte bij de notaris afronden' },
    { step: 5, title: 'bouw', body: 'bouw vordert via voortgangsupdates' },
    { step: 6, title: 'oplevering', body: 'sleuteloverdracht inclusief opleverkeuring' },
  ],

  // indicatieve planning
  planning: [
    { phase: 'start verkoop', date: 'gestart' },
    { phase: 'start bouw', date: 'december 2024' },
    { phase: 'ruwbouw', date: 'voorjaar 2025' },
    { phase: 'oplevering', date: 'eind 2025 indicatief' },
  ],

  // belegger voordelen specifiek
  investorBenefits: [
    'kleinschalig nieuwbouw schaarse aanbod',
    'gevestigde bedrijvenlocatie in waarderpolder',
    'verhuurbaarheid voor mkb in de regio',
    'koppelbaar voor verschillende huurprofielen',
    'hoogwaardige afwerking en nieuwbouwgaranties',
  ],

  financing: {
    partner: 'credion',
    description: 'vrijblijvende financieringsscan via credion onze financieringspartner',
    bullets: [
      'mkb financiering specialist',
      'onafhankelijk advies van zakelijke financiering',
      'snelle scan op haalbaarheid en condities',
    ],
  },

  contentCards: [
    {
      id: 'project',
      title: 'het project',
      body: '14 hoogwaardige bedrijfsunits in haarlem waarderpolder kleinschalig nieuwbouw representatief',
      tag: 'project',
    },
    {
      id: 'location',
      title: 'locatie',
      body: 'waarderpolder 3 minuten van de a9 snelle verbindingen naar amsterdam schiphol en alkmaar',
      tag: 'bereikbaarheid',
      image: '/images/exterieur.jpg',
    },
    {
      id: 'price',
      title: 'prijs',
      body: 'vanaf circa 239.500 euro v o n exclusief btw scherpe m² prijs in waarderpolder',
      tag: 'prijs',
    },
    {
      id: 'scarcity',
      title: 'beschikbaarheid',
      body: 'circa 50 procent verkocht xl uitverkocht nog enkele l units xxl volgt later',
      tag: 'schaarste',
    },
    {
      id: 'features',
      title: 'praktisch',
      body: 'overheaddeur eigen parkeerplaats koppelbaar nieuwbouwgaranties flexibele indeling',
      tag: 'specs',
    },
    {
      id: 'financing',
      title: 'financiering',
      body: 'vrijblijvende financieringsscan via credion we brengen je in contact als je wilt',
      tag: 'financiering',
    },
    {
      id: 'investor',
      title: 'belegging',
      body: 'verhuurbaarheid schaarste prijs per m² bij belaste verhuur kunnen fiscale aandachtspunten relevant zijn laat je daarover goed adviseren',
      tag: 'belegger',
    },
  ],

  team: [
    { name: 'repp', role: 'verkoop' },
    { name: 'reno', role: 'ontwikkelaar' },
    { name: 'project r', role: 'projectteam' },
  ],

  whatsappNumber: '+31612345678',
}
