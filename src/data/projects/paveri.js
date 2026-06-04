// Projectdata De Paveri (Assendelft). Sentence case + REPP en De Paveri in
// correcte caps. Schema gelijk aan dehofman.js zodat de hostname-loader 'm
// transparant kan switchen.
//
// Slug = `depaveri` omdat de bestaande koopomgeving op kopen.repp.nl/depaveri
// staat (en de subdomein dus depaveri.clp.repp.nl wordt).
//
// Portal-strategie: kopen-repp-redirect — geen eigen portal-site, lead gaat
// na CLP-chat direct naar https://kopen.repp.nl/depaveri.
export const project = {
  id: 'de-paveri',
  name: 'de paveri',
  displayName: 'De Paveri',
  tagline: 'Ondernemen in de Zaanstreek.',
  shortDescription: '16 casco bedrijfsunits aan de Industrieweg 9 in Assendelft.',
  hero: '/projects/depaveri/project.jpg',
  logo: '/projects/depaveri/logo.svg',
  exterior: '/projects/depaveri/project.jpg',

  // CRM-project key. Wordt als `source` meegestuurd naar Supabase lead-upsert,
  // clp-events en consent-log. Op basis van deze key kiest n8n de routing
  // (CRM-project, Brevo-list, WhatsApp-template) EN bepaalt de gemini-followup
  // Edge Function welk AI-prompt-template gebruikt wordt voor de eerste
  // bot-samenvatting per WhatsApp. Moet exact matchen met het bestaande
  // CRM-project — "Paveri BUnit" (mét spatie en hoofdletters) staat al
  // ingericht bij Tharwat; niet aanpassen zonder afstemming.
  crmProject: 'Paveri BUnit',

  // Portal-strategie. Voor De Paveri wijst de CLP-handoff naar het generieke
  // REPP-portaal (kopen.repp.nl/depaveri) ipv eigen subsite. Brevo stuurt
  // daardoor simpelere mail (geen portal-code), CtaBubble linkt direct door.
  // De actuele portalUrl + portalLabel staan verderop bij de externe-config
  // (rond regel 445) — bewust één bron van waarheid om mismatches te
  // voorkomen.
  portalStrategy: 'kopen-repp-redirect',

  // Gallery — vijf schone sfeerimpressies die de hero-carousel doorloopt.
  // Mix van wide-aerial, doorsnede, interieur en detail zodat bezoekers
  // direct een goed gevoel krijgen bij het project. locatie.jpg is een
  // kaart en hoort hier niet (die toont LocationBubble apart via aerialImage).
  gallery: [
    { src: '/projects/depaveri/project.jpg', alt: 'De Paveri exterieur overdag' },
    { src: '/projects/depaveri/avond.jpg', alt: 'De Paveri units in de avond' },
    { src: '/projects/depaveri/interieur.jpg', alt: 'Interieur Paveri unit met overheaddeur en trap' },
    { src: '/projects/depaveri/doorsnede.jpg', alt: 'Doorsnede De Paveri met drie lagen interieurs' },
    { src: '/projects/depaveri/detail.jpg', alt: 'De Paveri detail-gevel overdag' },
  ],

  // USP-cards voor de eerste micro-value moment.
  // Persona-aware ordering door uspCardOrder() per persona bepaald.
  uspCards: [
    {
      id: 'project',
      tag: 'Project',
      title: '16 bedrijfsunits in Assendelft',
      body: 'Hoogwaardige casco nieuwbouw op bedrijventerrein Assendelft Noord, geschikt voor ondernemers en beleggers.',
      image: '/projects/depaveri/project.jpg',
    },
    {
      id: 'location',
      tag: 'Locatie',
      title: 'Strategisch in de Zaanstreek',
      body: 'Bedrijventerrein Assendelft Noord, dicht bij N8 en N203. NS Krommenie-Assendelft op 5 minuten fietsen.',
      image: '/projects/depaveri/locatie.jpg',
    },
    {
      id: 'availability',
      tag: 'Beschikbaarheid',
      title: 'Nog 4 units beschikbaar',
      body: 'Type A en B uitverkocht. Type D bijna volledig vergeven. Vier Type C-units van 178 m² nog vrij.',
      image: '/projects/depaveri/avond.jpg',
    },
    {
      id: 'price',
      tag: 'Prijs',
      title: 'Vanaf €199.950 v.o.n. excl. btw',
      body: 'Type D van 112 m² vanaf €199.950, Type C van 178 m² voor €305.000. Vrij op naam, exclusief 21% btw.',
      image: '/projects/depaveri/doorsnede.jpg',
    },
    {
      id: 'unit-d',
      tag: 'Unit D',
      title: '112 m² over twee lagen',
      body: 'Compacte instapunit met overheaddeur 3 m breed en 2 eigen parkeerplaatsen direct voor de deur.',
      image: '/projects/depaveri/interieur.jpg',
    },
    {
      id: 'practical',
      tag: 'Praktisch',
      title: 'Overheaddeur en eigen parkeerplaats',
      body: 'Casco oplevering met meterkast, 3 x 25A elektra, riool, betonnen verdiepingsvloer en gasloze uitvoering.',
      image: '/projects/depaveri/praktisch.jpg',
    },
    {
      id: 'investor',
      tag: 'Belegging',
      title: 'Nieuwbouw in de Zaanstreek',
      body: 'Kleinschalig en flexibel indeelbaar. Bij belaste verhuur kunnen fiscale aandachtspunten spelen. Laat je daarover goed adviseren.',
      image: '/projects/depaveri/doorsnede.jpg',
    },
    {
      id: 'all-in',
      tag: 'Vrij op naam',
      title: 'Geen overdrachtsbelasting',
      body: 'Levering vrij op naam. Geen 10,4% overdrachtsbelasting. Basisnutsaansluitingen tot €2.850 inbegrepen.',
      image: '/projects/depaveri/detail.jpg',
    },
  ],

  location: {
    address: 'Industrieweg 9, Assendelft',
    city: 'Assendelft',
    district: 'Bedrijventerrein Assendelft Noord',
    aerialImage: '/projects/depaveri/locatie.jpg',
    mapsQuery: 'Industrieweg+9+Assendelft',
    mapsLink: 'https://www.google.com/maps?q=Industrieweg+9+Assendelft',
    // Reistijden vanaf Industrieweg 9 Assendelft (auto, normale verkeersomstandigheden).
    // Krommenie-Assendelft NS expliciet uit brochure: 5 min fietsen.
    travelTimes: [
      { to: 'N8 / N203', value: '2 min', mode: 'car' },
      { to: 'Krommenie-Assendelft NS', value: '5 min', mode: 'bike' },
      { to: 'Zaandam', value: '10 min', mode: 'car' },
      { to: 'Amsterdam', value: '20 min', mode: 'car' },
      { to: 'Haarlem', value: '20 min', mode: 'car' },
      { to: 'Alkmaar', value: '20 min', mode: 'car' },
    ],
    surroundings: [
      { icon: 'business', text: 'Bedrijventerrein Assendelft Noord, op een historische papierindustrielocatie' },
      { icon: 'train', text: 'NS Station Krommenie-Assendelft op 5 minuten fietsen' },
      { icon: 'parking', text: '2 of 3 eigen parkeerplaatsen per unit, direct voor de deur' },
      { icon: 'home', text: 'Woonkernen Assendelft, Krommenie en Wormerveer op fietsafstand' },
    ],
    highlights: [
      'Historie en modern ondernemerschap komen samen.',
      'Strategisch in het hart van de Zaanstreek.',
      'Op een gevestigd bedrijventerrein in Assendelft Noord.',
    ],
    scarcityNote: 'Beperkt aanbod nieuwbouw bedrijfsunits in de Zaanstreek. Van de 16 units in Fase 2 zijn er nog enkele Type C beschikbaar.',
  },

  status: {
    // 4 van 16 nog beschikbaar = 75% verkocht (10 sold + 2 sold_ov telt voor "weg").
    soldPercent: 75,
    headline: 'Circa 75% verkocht. Type A en B uitverkocht. Nog enkele Type C-units, Type D bijna vergeven.',
    units: {
      A: { label: 'Uitverkocht', state: 'sold_out' },
      B: { label: 'Uitverkocht', state: 'sold_out' },
      C: { label: 'Nog enkele beschikbaar', state: 'available' },
      D: { label: 'Bijna vergeven', state: 'available' },
    },
  },

  // 16 units site plan — L-shape layout matchend met officiële plattegrond
  // (zie /public/projects/depaveri/plattegrond.svg en kopen.repp.nl/depaveri).
  //
  // columns-schema = 2 onafhankelijke kolommen naast elkaar via CSS-grid:
  //   • LINKS (78%): 2 verticaal gestapelde sections, direct op elkaar
  //       - Section 1: 5× Type C (8,7,6,5,4) op rij
  //       - Section 2: 8× Type D (9-16) op rij
  //   • RECHTS (22%): 3 even hoge cellen die samen de hoogte van de linker-
  //     kolom matchen (CSS-grid items-stretch + minmax(0,1fr) rows)
  //       - Unit 1 (Type A) bovenaan
  //       - Unit 2 (Type B) in 't midden
  //       - Unit 3 (Type A) onderaan
  //
  // De rij-grenzen van rechts hoeven niet uit te lijnen met de section-
  // grenzen van links — dat klopt geometrisch met de echte plattegrond
  // waarop unit 2 deels langs C-rij en deels langs D-rij ligt.
  sitePlan: {
    columns: {
      leftFr: 78,
      rightFr: 22,
      left: {
        sections: [
          {
            cols: 5,
            aspect: 'portrait',
            units: [
              { number: 8, type: 'C', state: 'available' },
              { number: 7, type: 'C', state: 'available' },
              { number: 6, type: 'C', state: 'available' },
              { number: 5, type: 'C', state: 'available' },
              { number: 4, type: 'C', state: 'sold' },
            ],
          },
          {
            cols: 8,
            aspect: 'tall',
            units: [
              { number: 9, type: 'D', state: 'sold' },
              { number: 10, type: 'D', state: 'sold_ov' },
              { number: 11, type: 'D', state: 'sold' },
              { number: 12, type: 'D', state: 'sold' },
              { number: 13, type: 'D', state: 'sold_ov' },
              { number: 14, type: 'D', state: 'sold' },
              { number: 15, type: 'D', state: 'sold' },
              { number: 16, type: 'D', state: 'sold' },
            ],
          },
        ],
      },
      right: {
        units: [
          { number: 1, type: 'A', state: 'sold' },
          { number: 2, type: 'B', state: 'sold' },
          { number: 3, type: 'A', state: 'sold' },
        ],
      },
    },
    legend: [
      { state: 'available', label: 'Beschikbaar' },
      { state: 'sold_ov', label: 'Verkocht ov' },
      { state: 'sold', label: 'Verkocht' },
    ],
    cardinalLabels: {
      bottom: 'Assendelft Noord',
    },
  },

  units: [
    {
      type: 'D',
      size: 112,
      levels: 2,
      parking: 2,
      levelDetail: '56 m² begane grond plus 56 m² eerste verdieping',
      priceFrom: 199950,
      pricePerM2: 1785,
      state: 'available',
      stateLabel: 'Bijna vergeven',
      uses: ['Opslag', 'Werkplaats', 'Kantoor', 'Showroom'],
      image: '/projects/depaveri/interieur.jpg',
      pitch: 'Compacte instapunit van 112 m² over twee lagen. Geschikt voor opslag, werkplaats, showroom of kantoor.',
      specs: [
        '56 m² begane grond + 56 m² verdieping',
        'Overheaddeur 3,00 m breed × 3,50 m hoog',
        '2 eigen parkeerplaatsen',
        'Vloerbelasting BG 1.500 kg/m², verdieping 250 kg/m²',
      ],
    },
    {
      type: 'C',
      size: 178,
      levels: 2,
      parking: 2,
      levelDetail: '89 m² begane grond plus 89 m² eerste verdieping',
      priceFrom: 305000,
      pricePerM2: 1713,
      state: 'available',
      stateLabel: 'Nog enkele beschikbaar',
      uses: ['Opslag', 'Werkplaats', 'Kantoor', 'Showroom', 'Studio'],
      image: '/projects/depaveri/doorsnede.jpg',
      pitch: 'Royale unit van 178 m² over twee lagen. Ruimte voor opslag, werkplaats en een volwaardig kantoor op de verdieping.',
      specs: [
        '89 m² begane grond + 89 m² verdieping',
        'Overheaddeur 4,00 m breed × 3,50 m hoog',
        '2 eigen parkeerplaatsen',
        'Vloerbelasting BG 1.500 kg/m², verdieping 250 kg/m²',
      ],
    },
    {
      type: 'A',
      size: 208,
      levels: 3,
      parking: 3,
      levelDetail: '77 m² BG + 77 m² 1e + 54 m² 2e + dakterras ~19,7 m²',
      priceFrom: 360000,
      pricePerM2: 1731,
      state: 'sold_out',
      stateLabel: 'Uitverkocht',
      uses: ['3-laags bedrijfsunit', 'Dakterras', 'Kantoor of showroom op meerdere lagen'],
      image: '/projects/depaveri/avond.jpg',
      pitch: 'Drie lagen met dakterras en 3 eigen parkeerplaatsen. Inmiddels uitverkocht.',
      specs: [
        '208 m² verdeeld over 3 lagen',
        'Overheaddeur 4,00 m breed × 3,50 m hoog',
        'Dakterras circa 19,7 m² met rubber tegels en verzinkt hekwerk',
        '3 eigen parkeerplaatsen + eigen voorterrein',
      ],
    },
    {
      type: 'B',
      size: 208,
      levels: 3,
      parking: 3,
      levelDetail: '78 m² BG + 78 m² 1e + 54 m² 2e + dakterras ~23 m²',
      priceFrom: 349000,
      pricePerM2: 1678,
      state: 'sold_out',
      stateLabel: 'Uitverkocht',
      uses: ['3-laags bedrijfsunit', 'Dakterras'],
      image: '/projects/depaveri/avond.jpg',
      pitch: 'Drie lagen met groter dakterras (~23 m²) en 3 eigen parkeerplaatsen. Uitverkocht.',
      specs: [
        '208 m² verdeeld over 3 lagen',
        'Overheaddeur 4,00 m breed × 3,50 m hoog',
        'Dakterras circa 23 m² met rubber tegels en verzinkt hekwerk',
        '3 eigen parkeerplaatsen + eigen voorterrein',
      ],
    },
  ],

  features: [
    'Handbediende overheaddeur (elektrisch optioneel)',
    'Eigen parkeerplaatsen direct voor de deur',
    'Casco oplevering met meterkast en 3 x 25A elektra',
    'Gasloze uitvoering',
    'Units in overleg koppelbaar',
  ],

  // "Waarom De Paveri" — vijf echte USP's die de bedrijfsunits in Assendelft
  // onderscheiden van standaard bedrijfsverzamelgebouwen. Geen makelaarstaal,
  // ieder body één concreet feit waar de bezoeker iets aan heeft. "Bijna
  // uitverkocht" bewust niet als USP — schaarste hoort in de beschikbaarheid-
  // bubble en plattegrond-stats, niet onder de project-kwaliteiten.
  highlights: [
    { title: 'Vrij op naam', body: 'Geen 10,4% overdrachtsbelasting. Direct financieel voordeel ten opzichte van bestaande bouw.' },
    { title: 'Eigen parkeren', body: '2 of 3 plekken per unit, direct voor de deur. Geen gedeelde parkeerruimte.' },
    { title: 'NS op 5 minuten', body: 'Krommenie-Assendelft op fietsafstand. N8 en N203 op 2 minuten met de auto.' },
    { title: 'Casco met garanties', body: '1.500 kg/m² vloerbelasting, 3 × 25A elektra, gasloze uitvoering en nieuwbouwgaranties.' },
    { title: 'Koppelbaar', body: 'Units in overleg combineerbaar. Groeit mee als je bedrijf uitbreidt.' },
  ],

  audiences: [
    { id: 'eigenaar', title: 'Als eigenaar-gebruiker', body: 'Eigenaar van je eigen bedrijfsruimte op een gevestigde locatie in de Zaanstreek.' },
    { id: 'maker', title: 'Makers en praktische gebruikers', body: 'Installateurs, aannemers, interieurbouwers, webshops en servicebedrijven die werkplaats én kantoor willen.' },
    { id: 'kantoor', title: 'Kantoor en showroom', body: 'Zakelijke dienstverleners en creatieve bedrijven die showroom en opslag willen combineren.' },
    { id: 'belegger', title: 'Belegger', body: 'Nieuwbouwkwaliteit, eigen parkeerplaatsen en flexibele indeling voor verhuur of waardeontwikkeling.' },
  ],

  process: [
    { step: 1, title: 'Oriënteren', body: 'Brochure, plattegronden en prijslijst doornemen.' },
    { step: 2, title: 'Reserveren', body: 'Gewenste unit reserveren via de koopomgeving.' },
    { step: 3, title: 'Koopovereenkomst', body: 'Koopcontract en aannemingsovereenkomst opmaken.' },
    { step: 4, title: 'Notaris', body: 'Leveringsakte bij de notaris afronden.' },
    { step: 5, title: 'Bouw', body: 'Bouw is gestart, vordert via voortgangsupdates.' },
    { step: 6, title: 'Oplevering', body: 'Sleuteloverdracht inclusief opleverkeuring.' },
  ],

  // Bouw is gestart, omgevingsvergunning afgegeven. Exacte oplevering hangt
  // af van bouwvoortgang en koop-aannemingsovereenkomst. `current: true`
  // markeert welke fase nu actief is — PlanningBubble kleurt dat bolletje
  // blauw (de eerdere fases zijn done, latere nog future).
  planning: [
    { phase: 'Omgevingsvergunning', date: 'Afgegeven' },
    { phase: 'Start bouw',          date: 'Gestart', current: true },
    { phase: 'Oplevering',          date: 'TBD' },
  ],

  // m²-prijs vergelijking voor de Zaanstreek.
  // TODO: vergelijkingsdata Zaandam/Wormerveer/Krommenie aanvullen.
  priceComparison: {
    peildatum: '2026-05',
    rows: [
      { name: 'De Paveri C', price: 1713, isOurs: true },
      { name: 'De Paveri D', price: 1785, isOurs: true },
      // TODO: benchmark-units in Zaanstreek invullen
    ],
  },

  // Beleggers-data: TODO. Knowledge base noemt geen BAR-range of markthuur
  // voor Assendelft. Wachten op aanvulling van Flip voor RentabilityCalc.
  investor: {
    barRange: null,
    markthuurRange: null,
    markthuurAanname: null,
    kernfactoren: [
      'Nieuwbouwkwaliteit op een gevestigd bedrijventerrein.',
      'Eigen parkeerplaatsen, gasloze uitvoering en flexibele indeling.',
      'Verhuurbaarheid en waardeontwikkeling niet gegarandeerd — afhankelijk van markt, huurprijs en huurder.',
    ],
    cashflow: [
      'Initiële aanbetaling volgens reserveringsovereenkomst.',
      'Resterend bedrag in bouwtermijnen.',
      'Onderhoudsarm vastgoed.',
    ],
    fiscaal: [
      'Vrij op naam: geen overdrachtsbelasting van 10,4%.',
      'All-in koopsom: basisnutsaansluitingen tot €2.850 inbegrepen.',
      '21% btw bij verhuur of eigen gebruik vaak terugvorderbaar, fiscaal advies aanbevolen.',
    ],
  },

  investorBenefits: [
    'Nieuwbouwkwaliteit in de Zaanstreek.',
    'Eigen parkeerplaatsen direct voor de deur.',
    'Gasloze uitvoering, modern en duurzaam.',
    'Units in overleg koppelbaar voor verschillende huurprofielen.',
    'Casco oplevering — flexibel inrichtbaar per huurder.',
  ],

  financing: {
    partner: 'Company & Living Finance',
    description: 'Vrijblijvende financieringsscan via Company & Living Finance, financieringspartner van REPP.',
    bullets: [
      'Mkb-financiering en zakelijke hypotheek',
      'Standaard tot 75% financiering',
      'Maatwerk soms tot 100% mogelijk, afhankelijk van situatie',
    ],
  },

  contentCards: [
    {
      id: 'project',
      title: 'Het project',
      body: '16 casco bedrijfsunits aan de Industrieweg 9 in Assendelft. Hoogwaardige nieuwbouw in de Zaanstreek.',
      tag: 'Project',
    },
    {
      id: 'location',
      title: 'Locatie',
      body: 'Bedrijventerrein Assendelft Noord, vlak naast N8 en N203. NS station Krommenie-Assendelft op 5 minuten fietsen.',
      tag: 'Bereikbaarheid',
      image: '/projects/depaveri/locatie.jpg',
    },
    {
      id: 'price',
      title: 'Prijs',
      body: 'Vanaf €199.950 v.o.n. excl. btw voor Type D (112 m²). Type C (178 m²) voor €305.000.',
      tag: 'Prijs',
    },
    {
      id: 'scarcity',
      title: 'Beschikbaarheid',
      body: 'Circa 75% verkocht. Type A en B uitverkocht. Nog enkele Type C-units beschikbaar.',
      tag: 'Schaarste',
    },
    {
      id: 'features',
      title: 'Praktisch',
      body: 'Casco oplevering, overheaddeur, eigen parkeerplaatsen, 3×25A elektra, gasloos en in overleg koppelbaar.',
      tag: 'Specs',
    },
    {
      id: 'financing',
      title: 'Financiering',
      body: 'Vrijblijvende financieringsscan via Company & Living Finance. Standaard tot 75%, maatwerk soms tot 100%.',
      tag: 'Financiering',
    },
    {
      id: 'investor',
      title: 'Belegging',
      body: 'Nieuwbouwkwaliteit, eigen parkeerplaatsen en flexibele indeling. Rendement en verhuurbaarheid niet gegarandeerd.',
      tag: 'Belegger',
    },
  ],

  team: [
    { name: 'REPP', role: 'verkoop' },
  ],

  // WhatsApp en bel-nummer: identiek aan De Hofman (zelfde sales-team).
  // Header- en thankyou-CTA gebruiken phoneNumber voor uitbellen.
  whatsappNumber: '+31617192538',
  phoneNumber: '020-2610080',
  // Brochure + prijslijst: lokaal opgeslagen onder /public/projects/depaveri/.
  // Bewust niet naar repp.nl linken vanuit de CLP.
  brochureUrl: '/projects/depaveri/brochure.pdf',
  priceListUrl: '/projects/depaveri/prijslijst.pdf',
  // Externe portal: kopen-repp-redirect strategie. Lead gaat direct naar
  // het generieke REPP-portaal zonder portal-code of magic-link.
  portalUrl: 'https://kopen.repp.nl/depaveri',
  portalLabel: 'Bekijk koopomgeving De Paveri',
  // Webhook voor financiering-doorgeven aan Company & Living Finance.
  // Variabele-naam blijft credionWebhookUrl voor backwards-compat met
  // sendCredionLead() in lib/credion.js — alleen de waarde verschilt
  // per project. Zapier-trigger pikt de payload op en routeert door
  // naar Company & Living Finance.
  credionWebhookUrl: 'https://hooks.zapier.com/hooks/catch/2082653/uxf993u/',

  // Sales team — identiek aan De Hofman per instructie van Flip.
  salesTeam: {
    bot: { name: 'Jesse', org: 'REPP' },
    rep: { name: 'Jesse', context: 'Zaanstreek-markt' },
  },

  // Persona-aware copy. Identieke 4-buckets structuur als De Hofman,
  // tekst aangepast naar Paveri-context (Zaanstreek, Assendelft, casco).
  personaCopy: {
    eigen_gebruiker: {
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over De Paveri, zodat je een goed beeld krijgt van wat bij jouw wensen past.',
      recommendCopy: "Dan zijn vooral bereikbaarheid, parkeren en flexibele indeling belangrijk. De Paveri is casco opgeleverd zodat je 'm helemaal naar eigen behoefte inricht.",
      handoff: {
        observations: {
          calc: 'we zien dat je de maandlasten aan het uitrekenen bent',
          multiUnit: 'we zien dat je je in meerdere units verdiept',
          default: 'fijn dat je verder kijkt',
        },
        shortTimelineHeadline: 'met die timeline is een korte call vaak prettiger dan veel mailen',
        body:
          'Een bedrijfsunit voor je eigen bedrijf koop je niet elke dag. ' +
          'Ik denk graag tien minuten met je mee over indeling, ' +
          'financiering en de stap naar een bezichtiging.',
        valueBullets: [
          'Welke unit qua indeling en grootte past bij jouw bedrijf',
          'Bezichtigings­moment plannen als dat zinvol is',
          'Wat de stap naar financiering concreet inhoudt',
        ],
      },
      waPhrase: 'Ik zoek voor mijn eigen bedrijf',
    },
    belegger: {
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over De Paveri, met aandacht voor de cijfers en de markt.',
      recommendCopy: 'Voor jou tellen vooral verhuurbaarheid en prijs per m². De Paveri is kleinschalig, nieuwbouw en ligt op een gevestigd bedrijventerrein in de Zaanstreek.',
      handoff: {
        observations: {
          calc: 'we zien dat je in het rendement aan het rekenen bent',
          multiUnit: 'we zien dat je verschillende units met elkaar vergelijkt',
          default: 'fijn dat je verder kijkt',
        },
        shortTimelineHeadline: 'met deze timeline is even schakelen vaak handig',
        body:
          'Een bedrijfsunit als belegging koop je niet zomaar. ' +
          'Ik ken de markt in de Zaanstreek en kan in 10 minuten met je door de cijfers lopen ' +
          'en laten zien wat er nu nog beschikbaar is.',
        valueBullets: [
          'Verhuurbaarheid en rendementsindicatie voor De Paveri',
          'Welke units in De Paveri nog beschikbaar zijn en waarom',
          'Wat aankoop in privé of bv financieel-fiscaal verschilt',
        ],
      },
      waPhrase: 'Ik kijk als belegger',
    },
    beide: {
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over De Paveri, vanuit beide kanten: eigen gebruik én beleggingsperspectief.',
      recommendCopy: 'Dan kijken we vanuit beide kanten. De Paveri werkt voor ondernemers die zelf willen gebruiken én voor beleggers die nieuwbouw en locatie zoeken.',
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
          'Hoe collega-kopers in De Paveri dit aanpakken',
        ],
      },
      waPhrase: 'Ik kijk zowel voor eigen gebruik als belegging',
    },
    onbekend: {
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over De Paveri, zodat je een goed beeld krijgt van wat bij jouw wensen past.',
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
          'Wat De Paveri onderscheidt van andere bedrijfsunits in de Zaanstreek',
          'Welke unit past bij jouw situatie',
          'Wat de volgende stap concreet zou kunnen zijn',
        ],
      },
      waPhrase: '',
    },
  },

  // Flow-overrides — per-project label en chip-opties voor specifieke
  // vragen. App.jsx's getQuestion('size') merget deze met flow.questions.size.
  // Voor Paveri: andere m²-categorieën (112/178/208 ipv tot_50/rond_100/etc)
  // en andere vraag-formulering omdat units 2-laags zijn met BG = totaal/2.
  flowOverrides: {
    sizeQuestion: {
      label: 'Hoeveel m² zoek je?',
      // Alle opties wijzen naar Unit C als `unit`: bij De Paveri zijn dat
      // de enige units die nu nog concreet beschikbaar zijn (Type A en B
      // uitverkocht, Type D bijna vergeven met enkele sold-ov). De score
      // en option-id blijven verschillen zodat analytics ziet wat de
      // bezoeker oorspronkelijk koos. De getoonde bot-intro varieert via
      // `recommendIntroByChoice` hieronder — niet via een ander unit-type.
      options: [
        { id: 'around_112', label: '112 m²', score: 12, unit: 'C' },
        { id: 'around_178', label: '178 m²', score: 15, unit: 'C' },
        { id: 'around_208', label: '208 m²', score: 15, unit: 'C' },
        { id: 'weet_niet',  label: 'Weet ik nog niet', score: 5,  unit: 'C' },
      ],
    },
  },

  // Per-keuze intro-tekst die de standaard "Op basis van je antwoorden lijkt
  // vooral de X-unit interessant"-bubble overschrijft. Keyed op de id van de
  // size-optie. App.jsx kijkt hier eerst naar voordat het de generieke string
  // pakt. Alleen gedefinieerd voor projecten waar een eerlijke disclosure
  // nodig is (uitverkochte types, schaarste, etc.). Voor De Paveri sturen we
  // alle keuzes naar Unit C maar geven we per gekozen oppervlak een eigen
  // toelichting waarom — voorkomt dat de bezoeker denkt "huh, ik vroeg om
  // 208 m² en krijg 178 m² terug zonder uitleg".
  recommendIntroByChoice: {
    // 208 m² → Type A is uitverkocht. Korte, eerlijke verwijzing naar C.
    around_208: 'Op basis van de beschikbaarheid is Unit C de meest passende optie voor je.',
    // 112 m² → Type D is bijna vergeven (2 sold-ov). We houden de deur open
    // voor terugkomers maar wijzen op de concreet beschikbare Unit C.
    around_112: 'Voor Type D zijn alleen nog enkele units verkocht onder voorbehoud. Komen die alsnog vrij, dan nemen we contact met je op. Voor nu zijn de Type C-units concreet beschikbaar.',
    // 178 m² → exact wat Unit C biedt. Natuurlijke fit, geen disclaimer.
    around_178: 'Op basis van je antwoorden past Unit C goed bij wat je zoekt.',
    // Geen voorkeur → toon Unit C als concrete vertrekpunt.
    weet_niet: 'Op basis van de beschikbaarheid is Unit C de meest concrete optie om mee te starten.',
  },
}

// Volgorde van USP-cards aangepast aan persona.
// Belegger ziet beleggings-info eerder; eigen gebruiker ziet praktische zaken eerder.
export function uspCardOrder(persona) {
  const ids =
    persona === 'belegger'
      ? ['project', 'investor', 'all-in', 'price', 'location', 'unit-c']
      : persona === 'beide'
      ? ['project', 'location', 'investor', 'price', 'unit-c', 'all-in']
      : persona === 'eigen_gebruiker'
      ? ['project', 'location', 'availability', 'price', 'unit-c', 'practical']
      : ['project', 'location', 'availability', 'price', 'unit-c', 'practical']
  return ids
    .map((id) => project.uspCards.find((c) => c.id === id))
    .filter(Boolean)
}
