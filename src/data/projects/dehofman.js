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

  // CRM-project key — bestaande productie-waarde van de Hofman, gebruikt
  // door Tharwats n8n-routing, Brevo en de gemini-followup Edge Function.
  // Komt overeen met de Vercel-env VITE_CLP_SOURCE die nu prod heeft —
  // door 't ook hier expliciet te zetten worden beide projecten op één
  // Vercel-project (dehofman + depaveri) automatisch correct getagd
  // op basis van de hostname.
  crmProject: 'clp_dehofman',

  // Gallery wisselt visueel tussen exterieur en interieur shots zodat de
  // hero-carousel duidelijk transformeert, niet twee bijna-identieke avond-shots.
  gallery: [
    { src: '/images/sfeer-1.jpg', alt: 'De Hofman vanaf de straat overdag' },
    { src: '/images/sfeer-2.jpg', alt: 'De Hofman in de avond met verlichte units' },
    { src: '/images/sfeer-3.jpg', alt: 'Unit ingericht als kantoor en showroom' },
    { src: '/images/sfeer-4.jpg', alt: 'Unit ingericht als directiekantoor' },
    { src: '/images/sfeer-5.jpg', alt: 'Unit ingericht als werkplaats' },
    { src: '/images/sfeer-6.jpg', alt: 'Unit ingericht voor opslag en techniek' },
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
      image: '/images/project-2026.jpg',
    },
    {
      id: 'location',
      tag: 'Locatie',
      title: '3 minuten van de A9',
      body: 'Goed bereikbaar richting Haarlem, Amsterdam, Schiphol en Alkmaar.',
      // Timelapse-video van de rit vanaf de A9 naar de Hofman, zodat bezoekers
      // de bereikbaarheid visueel ervaren ipv alleen lezen. Image-veld blijft
      // als poster: eerste frame is direct zichtbaar tot de video laadt.
      image: '/images/hero.jpg',
      video: '/videos/a9-haarlem.mp4',
    },
    {
      id: 'availability',
      tag: 'Beschikbaarheid',
      title: '70% verkocht',
      body: 'XL is uitverkocht. Nog enkele L-units beschikbaar. De ruime XXL-units zijn nu ook in de verkoop.',
      image: '/images/availability-2026.jpg',
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
      image: '/images/praktisch-2026.jpg',
    },
    {
      id: 'investor',
      tag: 'Belegging',
      title: 'Schaarste en verhuurbaarheid',
      body: 'Kleinschalig, nieuwbouw en op een gevestigde bedrijvenlocatie in Haarlem. Bij belaste verhuur kunnen fiscale aandachtspunten spelen. Laat je daarover goed adviseren.',
      image: '/images/werkplaats.jpg',
    },
    // Beleggers-specifieke kaarten op basis van het projectinformatie- en marktindicatie-document.
    {
      id: 'bar',
      tag: 'Rendement',
      title: 'Indicatief 6,7% tot 9,0% BAR',
      body: 'Bruto aanvangsrendement op basis van een markthuur van €150 tot €200 per m² per jaar in de Waarderpolder. Indicatief, geen prognose.',
      image: '/images/xxl-woning.jpg',
    },
    {
      id: 'schaarste-pro',
      tag: 'Schaarste',
      title: 'Beperkt aanbod in Waarderpolder',
      body: 'Ruim duizend bedrijven gevestigd, weinig nieuwe bouwgrond. Vergelijkbare units komen slechts beperkt beschikbaar.',
      image: '/images/combi.jpg',
    },
    {
      id: 'all-in',
      tag: 'Vrij op naam',
      title: 'Geen overdrachtsbelasting',
      body: 'Levering vrij op naam. Geen 10,4% overdrachtsbelasting. Aansluitkosten water en elektra inbegrepen in de koopsom.',
      image: '/images/showroom.jpg',
    },
  ],

  location: {
    address: 'A. Hofmanweg 23-27, Waarderpolder, Haarlem',
    city: 'Haarlem',
    district: 'Waarderpolder',
    aerialImage: '/images/exterieur.jpg',
    mapsQuery: 'A.+Hofmanweg+Haarlem',
    mapsLink: 'https://www.google.com/maps?q=A.+Hofmanweg+Haarlem',
    travelTimes: [
      { to: 'A9', value: '3 min', mode: 'car' },
      { to: 'Haarlem CS', value: '6 min', mode: 'car' },
      { to: 'Schalkwijk', value: '5 min', mode: 'car' },
      { to: 'Schiphol', value: '25 min', mode: 'car' },
      { to: 'Amsterdam', value: '25 min', mode: 'car' },
      { to: 'Alkmaar', value: '25 min', mode: 'car' },
    ],
    surroundings: [
      { icon: 'business', text: 'Gevestigde bedrijvenlocatie met meer dan duizend ondernemingen' },
      { icon: 'water', text: 'Direct aan het Spaarne, met groen op loopafstand' },
      { icon: 'home', text: 'Woonwijk Schalkwijk en Haarlem-Oost op fietsafstand' },
      { icon: 'parking', text: 'Eigen parkeerplaats per unit, ruim voldoende bezoekersparkeren' },
      { icon: 'lunch', text: 'Lunch en koffie binnen de Polder op loopafstand' },
    ],
    highlights: [
      'Rust aan het water, reuring om de hoek.',
      'Gevestigde bedrijvenlocatie in Haarlem.',
      'In de Metropoolregio Amsterdam.',
    ],
    scarcityNote: 'Schaarste in Haarlem. Binnen de stadsgrenzen is dit een van de laatste nieuwbouw-locaties voor bedrijfsunits.',
  },

  status: {
    soldPercent: 70,
    headline: 'Circa 70% verkocht. XL uitverkocht. Nog enkele L-units. XXL nu in de verkoop.',
    units: {
      L: { label: 'Nog enkele beschikbaar', state: 'available' },
      XL: { label: 'Uitverkocht', state: 'sold_out' },
      XXL: { label: 'Nu in de verkoop', state: 'available' },
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
        { number: 5, type: 'L', state: 'available' },
        { number: 6, type: 'L', state: 'sold_ov' },
        { number: 7, type: 'XXL', state: 'available' },
      ]},
      { units: [
        { number: 8, type: 'XL', state: 'sold' },
        { number: 9, type: 'L', state: 'sold' },
        { number: 10, type: 'L', state: 'sold' },
        { number: 11, type: 'L', state: 'sold' },
        { number: 12, type: 'L', state: 'sold_ov' },
        { number: 13, type: 'L', state: 'sold_ov' },
        { number: 14, type: 'XXL', state: 'available' },
      ]},
    ],
    legend: [
      { state: 'available', label: 'Beschikbaar' },
      { state: 'sold_ov', label: 'Verkocht ov' },
      { state: 'sold', label: 'Verkocht' },
    ],
    // Orientatie-labels die SitePlanBubble rondom de tegelgrid toont.
    cardinalLabels: {
      east: 'A. Hofmanweg',
      eastAdjacent: 'Recreatie',
      bottom: 'Waarderpolder',
    },
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
      parking: 1,
      priceFrom: 515500,
      pricePerM2: 2698,
      state: 'available',
      stateLabel: 'Nu in de verkoop',
      uses: ['3-laags bedrijfsunit', 'Variant met bedrijfsgebonden woning'],
      image: '/images/xxl-unit.jpg',
      pitch: 'Drie lagen. Mogelijk met bedrijfsgebonden woning en eigen dakterras. Nu in de verkoop.',
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

  // Planning is indicatief — bouw-traject afhankelijk van vergunningen,
  // weersomstandigheden en aannemerscapaciteit. PlanningBubble toont een
  // expliciete "Indicatieve planning"-noot zodat dat duidelijk is.
  planning: [
    { phase: 'Start verkoop', date: 'Gestart' },
    { phase: 'Start bouw', date: 'Q4 2026' },
    { phase: 'Bouwfase', date: '9 tot 12 maanden' },
    { phase: 'Oplevering', date: 'Q3 2027' },
  ],

  // m²-prijs vergelijking met andere bedrijfsunits in de Waarderpolder.
  // Bron: openbare verkoopdata, gepubliceerd op repp.nl/dehofman/prijs.
  priceComparison: {
    peildatum: '26 maart 2026',
    rows: [
      { name: 'De Hofman L', price: 2281, isOurs: true },
      { name: 'Wateringweg', tag: 'Bestaand 2022', price: 2375 },
      { name: 'Nijverheidsweg', tag: 'Nieuwbouw', price: 2500 },
      { name: 'Beijnesweg', tag: 'Nieuwbouw', price: 2533 },
      { name: 'Enschedéweg', tag: 'Bestaand 2022', price: 2539 },
    ],
  },

  // Beleggers-data uit het projectinformatie-document (BAR 6,7-9% bij €150-200 markthuur).
  investor: {
    barRange: '6,7% tot 9,0%',
    markthuurRange: '€150 tot €200 per m² per jaar',
    markthuurAanname: '€175 per m² per jaar',
    kernfactoren: [
      'Structurele schaarste binnen een gevestigd bedrijventerrein.',
      'Een instapprijs onder het huidige nieuwbouwniveau.',
      'Courante units met potentie voor stabiele verhuur.',
    ],
    cashflow: [
      'Initiële aanbetaling circa 5% bij reservering.',
      'Resterend bedrag in bouwtermijnen van 20 tot 25% per fase.',
      'Onderhoudsarm vastgoed, geen erfpacht.',
    ],
    fiscaal: [
      'Vrij op naam: geen overdrachtsbelasting van 10,4%.',
      'All-in koopsom: aansluitkosten water en elektra inbegrepen.',
      '21% btw bij verhuur of eigen gebruik vaak terugvorderbaar, fiscaal advies aanbevolen.',
    ],
  },

  investorBenefits: [
    'Kleinschalig nieuwbouw, schaars aanbod.',
    'Gevestigde bedrijvenlocatie in Waarderpolder.',
    'Verhuurbaarheid voor mkb in de regio.',
    'Koppelbaar voor verschillende huurprofielen.',
    'Hoogwaardige afwerking en nieuwbouwgaranties.',
  ],

  // Financiering / Credion bewust uitgeschakeld voor De Hofman. Zonder
  // het `financing`-object verbergt MortgageCalc de financieringsscan-CTA
  // en valt de financing-contentCard weg uit recommendContentCards().
  // De moreInfo-chip 'financing' wordt via disabledTopics (onderaan) ook
  // verborgen, en zonder credionWebhookUrl is sendCredionLead inert.
  disabledTopics: ['financing'],

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
      body: 'Circa 70% verkocht. XL uitverkocht. Nog enkele L-units. De ruime XXL-units zijn nu ook in de verkoop.',
      tag: 'Schaarste',
    },
    {
      id: 'features',
      title: 'Praktisch',
      body: 'Overheaddeur, eigen parkeerplaats, koppelbaar, nieuwbouwgaranties en flexibele indeling.',
      tag: 'Specs',
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

  whatsappNumber: '+31617192538',
  // Outbound bel-nummer voor de header- en thankyou-CTA.
  phoneNumber: '020-2610080',
  brochureUrl: '/brochure.pdf',
  // Externe portal: live plattegrond + actuele beschikbaarheid + alle units.
  // Komt als tertiaire CTA in de wrap-up bubble zodat bezoekers die voldoende
  // hebben gezien direct kunnen doorklikken naar het officiele kanaal.
  portalUrl: 'https://dehofman.nl',
  portalLabel: 'Bekijk op dehofman.nl',

  // Sales team. Bot is de chat-persona (kop van elk bot-bericht); rep is de
  // mens die belt. Bewust DEZELFDE persoon — Jesse begint de chat en Jesse
  // belt later terug — zodat de bezoeker niet ineens met een onbekende naam
  // ("Jann") geconfronteerd wordt. Handoff-copy spreekt daarom in eerste
  // persoon ("ik denk graag mee") in plaats van "mijn collega ...".
  salesTeam: {
    bot: { name: 'Jesse', org: 'REPP' },
    rep: { name: 'Jesse', context: 'Waarderpolder-markt' },
  },

  // Persona-aware copy. Elke persona heeft vier buckets: microIntro
  // (direct na de intent-keuze), recommendCopy (na de unit-aanbeveling op
  // het niet-hot-pad), handoff (de service-card en warm-handoff teksten),
  // en waPhrase (de eerste zin in het prefilled WhatsApp-bericht).
  //
  // Voor template-projecten: deze kun je per project geheel overschrijven.
  // Refereer in body of valueBullets gerust naar project-specifieke
  // kenmerken; geen placeholders, gewoon volledige zinnen.
  personaCopy: {
    eigen_gebruiker: {
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over De Hofman, zodat je een goed beeld krijgt van wat bij jouw wensen past.',
      recommendCopy: 'Dan zijn vooral bereikbaarheid, parkeren en flexibele indeling belangrijk. De Hofman is ontworpen voor ondernemers die praktische ruimte combineren met een representatieve uitstraling.',
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
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over De Hofman, met aandacht voor de cijfers en de markt.',
      recommendCopy: 'Voor jou tellen vooral verhuurbaarheid, schaarste en prijs per m². De Hofman is kleinschalig, nieuwbouw en ligt op een gevestigde bedrijvenlocatie in Haarlem.',
      handoff: {
        observations: {
          calc: 'we zien dat je in het rendement aan het rekenen bent',
          multiUnit: 'we zien dat je verschillende units met elkaar vergelijkt',
          default: 'fijn dat je verder kijkt',
        },
        shortTimelineHeadline: 'met deze timeline is even schakelen vaak handig',
        body:
          'Een bedrijfsunit als belegging koop je niet zomaar. ' +
          'Ik ken de Waarderpolder-markt en kan in 10 minuten met je door de cijfers ' +
          'lopen en laten zien wat er nu nog beschikbaar is.',
        valueBullets: [
          "BAR-scenario's op basis van actuele markthuur Waarderpolder",
          'Welke units in De Hofman het hardst lopen en waarom',
          'Wat aankoop in privé of bv financieel-fiscaal verschilt',
        ],
      },
      waPhrase: 'Ik kijk als belegger',
    },
    beide: {
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over De Hofman, vanuit beide kanten: eigen gebruik én beleggingsperspectief.',
      recommendCopy: 'Dan kijken we vanuit beide kanten. De Hofman werkt voor ondernemers die zelf willen gebruiken én voor beleggers die schaarste en locatie zoeken.',
      handoff: {
        observations: {
          calc: 'we zien dat je aan het rekenen bent',
          multiUnit: 'we zien dat je verschillende units met elkaar vergelijkt',
          default: 'je kijkt vanuit twee kanten, laat ons even meedenken',
        },
        shortTimelineHeadline: 'met deze timeline is even schakelen vaak handig',
        body:
          'Of je nu zelf gebruikt of verhuurt: een bedrijfsunit koop je niet zomaar. ' +
          "Ik leg graag in een korte call beide scenario's naast " +
          'elkaar voor jouw situatie.',
        valueBullets: [
          'Eigen gebruik versus verhuur: wat brengt wat op',
          'Welke unit voor welke optie het meest geschikt is',
          'Hoe collega-kopers in De Hofman dit aanpakken',
        ],
      },
      waPhrase: 'Ik kijk zowel voor eigen gebruik als belegging',
    },
    onbekend: {
      microIntro: 'Helemaal goed. Dan ga ik je wat meer laten zien over De Hofman, zodat je een goed beeld krijgt van wat bij jouw wensen past.',
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
          'Wat De Hofman onderscheidt van andere bedrijfsunits in Haarlem',
          'Welke unit past bij jouw situatie',
          'Wat de volgende stap concreet zou kunnen zijn',
        ],
      },
      waPhrase: '',
    },
  },
}

// Volgorde van USP-cards aangepast aan persona.
// Belegger ziet beleggings-info (BAR, schaarste, all-in) eerder;
// eigen gebruiker ziet praktische zaken eerder.
export function uspCardOrder(persona) {
  const ids =
    persona === 'belegger'
      ? ['project', 'bar', 'schaarste-pro', 'all-in', 'price', 'location']
      : persona === 'beide'
      ? ['project', 'location', 'bar', 'price', 'unit-l', 'all-in']
      : persona === 'eigen_gebruiker'
      ? ['project', 'location', 'availability', 'price', 'unit-l', 'practical']
      : ['project', 'location', 'availability', 'price', 'unit-l', 'practical']
  return ids
    .map((id) => project.uspCards.find((c) => c.id === id))
    .filter(Boolean)
}
