// projectdata de hofman tone of voice geen leestekens lowercase
// vervangbaar voor andere repp projecten
export const project = {
  id: 'de-hofman',
  name: 'de hofman',
  displayName: 'De Hofman',
  tagline: 'omdat haarlem werkt',
  shortDescription: '14 hoogwaardige bedrijfsunits in haarlem waarderpolder',
  hero: '/images/hero.jpg',
  logo: '/images/logo.svg',
  exterior: '/images/exterieur.jpg',

  location: {
    address: 'a hofmanweg waarderpolder haarlem',
    highlights: [
      '3 minuten van de a9',
      'snel naar amsterdam schiphol en alkmaar',
      'rust aan het water reuring om de hoek',
    ],
  },

  status: {
    soldPercent: 50,
    headline: 'circa 50% verkocht xl is uit l nog enkele beschikbaar xxl volgt',
    units: {
      L: { label: 'nog enkele beschikbaar', state: 'available' },
      XL: { label: 'uitverkocht', state: 'sold_out' },
      XXL: { label: 'volgt later in verkoop', state: 'coming_soon' },
    },
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
    },
    {
      type: 'XL',
      size: 150,
      levels: 2,
      state: 'sold_out',
      stateLabel: 'uitverkocht',
      uses: ['werkplaats', 'showroom', 'combinatie'],
      image: '/images/exterieur.jpg',
      pitch: 'grotere variant inmiddels volledig verkocht',
    },
    {
      type: 'XXL',
      size: 191.4,
      levels: 3,
      state: 'coming_soon',
      stateLabel: 'volgt later in verkoop',
      uses: ['3-laagse bedrijfsunit', 'variant met bedrijfsgebonden woning'],
      image: '/images/unit-xxl.jpg',
      pitch: 'drie lagen mogelijk met bedrijfsgebonden woning volgt later in verkoop',
    },
  ],

  features: [
    'elektrische overheaddeur 4 m breed 3,50 m hoog',
    'eigen parkeerplaats op eigen terrein',
    'nutsaansluitingen',
    'nieuwbouwgaranties',
    'koppelbare units mogelijk',
  ],

  financing: {
    partner: 'credion',
    description: 'vrijblijvende financieringsscan via credion',
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

  whatsappNumber: '+31612345678',
}
