// Projectdata 2E MERWEDEHAVEN (Dordrecht) — config-driven survey.
//
// BELANGRIJK: dit is een DATA-GEDREVEN peiling. De hele flow zit in
// flowOverrides.surveyFlow met engine:'config'. De generieke sequencer in
// App.jsx (gated op engine==='config') leest `intro`, `steps` en `closing`
// en draait de survey puur uit deze config. Er is geen tenant-specifieke
// code in App.jsx: nieuwe config-surveys hoeven alleen dit databestand.
//
// Gating (niet-onderhandelbaar):
//   - engine:'config' is de ENIGE trigger voor de nieuwe engine.
//   - Breda gebruikt surveyFlow ZONDER engine → houdt zijn eigen codepad.
//   - De vier sales-tenants hebben geen surveyFlow → standaard verkoop-flow.
//
// Slug = `2emwh`. Subdomein = 2emwh.clp.repp.nl.
//
// Bewust WEGGELATEN (peiling heeft geen aanbod om te tonen): sitePlan,
// location, priceComparison, financing, investor*, planning, process,
// gallery. units = [] en brochureUrl = '#'. disabledTopics dekt elk
// moreInfo-onderwerp af zodat er nooit iets projectspecifieks kan renderen.
export const project = {
  id: '2emwh',
  name: '2emwh',
  displayName: '2e Merwedehaven',
  tagline: 'Watergebonden bedrijfskavels in de 2e Merwedehaven, Dordrecht.',
  shortDescription: 'Korte peiling onder watergebonden ondernemers voor de 2e Merwedehaven.',

  // Header-subtitel onder de projectnaam.
  headerSubtitle: 'in samenwerking met gemeente Dordrecht en ROM-D',

  // Geen hero-asset: null houdt BrochureBubble/IntroScreen veilig.
  hero: null,
  logo: '/logo.svg',

  // CRM-project key. Moet EXACT matchen met de Supabase projects-tabel en
  // met de source-mapping in eventsApi.js (TENANT_MAP) en lead-upsert
  // (BREVO_SKIP_SOURCES). Registreer '2e MWH' backend-zijde voor go-live.
  crmProject: '2e MWH',

  portalStrategy: 'none',

  // Geen offer-content. Alle onderstaande velden bewust leeg/veilig zodat de
  // gedeelde componenten die er guarded naar grijpen niet crashen.
  gallery: [],
  uspCards: [],
  units: [],
  contentCards: [],
  personaCopy: {},

  // Geen eigen WhatsApp-nummer: bewust leeg zodat er GEEN WA-knop verschijnt
  // (voorkomt kruising met het nummer van een ander project). Zet hier een
  // eigen 2e Merwedehaven-nummer als er een WA-kanaal moet komen.
  whatsappNumber: '',

  // Brochure uitgeschakeld: '#' zorgt dat een eventuele brochure-trigger
  // nergens naartoe linkt. In de peiling-flow wordt de brochure nooit
  // aangeboden.
  brochureUrl: '#',

  salesTeam: {
    // De config-flow gebruikt de "wij"-stem en toont geen begroeting met
    // botnaam; deze waarden staan er alleen zodat gedeelde helpers een
    // geldige shape vinden.
    bot: { name: 'REPP', org: 'REPP' },
    rep: { name: 'REPP', context: 'REPP / 2e Merwedehaven' },
  },

  // Elk moreInfo-onderwerp uitgeschakeld. De config-peiling routeert nooit
  // naar moreInfo; dit is een extra vangnet.
  disabledTopics: [
    'location', 'sitePlan', 'gallery', 'highlights', 'price',
    'priceCompare', 'planning', 'process', 'brochure', 'investor', 'financing',
  ],

  flowOverrides: {
    surveyFlow: {
      // engine:'config' activeert de generieke, data-gedreven sequencer in
      // App.jsx. Zonder dit veld (zoals Breda) draait het bestaande
      // Breda-codepad; zonder surveyFlow draait de verkoop-flow.
      engine: 'config',

      // Intro-bubbles na binnenkomst (geen informele begroeting: formele
      // u-vorm, de config-flow slaat de "Hoi, ik ben ..."-greeting over).
      intro: [
        'Welkom. Fijn dat u interesse heeft in de 2e Merwedehaven in Dordrecht.',
        'Ik stel u een paar korte vragen over uw bedrijf en uw ruimtevraag.',
        'Daarna houden wij u persoonlijk op de hoogte.',
      ],

      // Vaste WhatsApp-prefill (neutraal, zonder projectdetails).
      whatsappMessage: 'Hallo REPP, ik heb interesse in de 2e Merwedehaven in Dordrecht.',

      // Afsluit-bubbles na de laatste vraag. Toont daarna de eind-chips
      // (opnieuw beginnen / antwoorden aanpassen), net als Breda.
      closing: [
        'Dank u wel. Uw antwoorden zijn ontvangen.',
        'Zodra er meer bekend is over de kavelindeling, de criteria en de planning, informeren wij u gericht.',
      ],

      // Geordende steps. De sequencer loopt hier stap voor stap doorheen.
      // Step-types:
      //   open-text     { key, type, label, placeholder, inputMode?, crm }
      //   single-choice { key, type, label, options[], crm, branch?, followUp? }
      //   multi-choice  { key, type, label, options[], crm }
      //   message       { type:'message', text }
      // CRM-targets: { lead:'first_name'|'email'|'phone' } | { column:'intent_id'|'size_id'|'timeline_id' } | { attr:'snake_case' }
      steps: [
        // 1 — naam → lead first_name
        {
          key: 'naam',
          type: 'open-text',
          label: 'Wat is uw naam?',
          placeholder: 'Uw naam',
          crm: { lead: 'first_name' },
        },
        // 2 — bedrijf → attr company (toont als Bedrijfsnaam)
        {
          key: 'bedrijf',
          type: 'open-text',
          label: 'Bij welk bedrijf werkt u?',
          placeholder: 'Bedrijfsnaam',
          crm: { attr: 'company' },
        },
        // 3 — sector, met vrije-tekst-followUp bij 'anders'
        {
          key: 'sector',
          type: 'single-choice',
          label: 'Wat doet uw bedrijf?',
          options: [
            { id: 'maritieme_maakindustrie', label: 'Maritieme maakindustrie' },
            { id: 'scheepsbouw', label: 'Scheepsbouw, reparatie of onderhoud' },
            { id: 'jachtbouw', label: 'Jachtbouw' },
            { id: 'overslag_logistiek', label: 'Overslag en logistiek' },
            { id: 'toeleverancier', label: 'Toeleverancier maritiem' },
            { id: 'anders', label: 'Anders' },
          ],
          crm: { attr: 'sector' },
          followUp: {
            anders: {
              key: 'sector_anders',
              type: 'open-text',
              label: 'Kunt u kort omschrijven wat uw bedrijf doet?',
              placeholder: 'Korte omschrijving',
              crm: { attr: 'sector_anders' },
            },
          },
        },
        // 4 — huidige locatie
        {
          key: 'huidige_locatie',
          type: 'single-choice',
          label: 'Waar zit u nu?',
          options: [
            { id: 'dordrecht_drechtsteden', label: 'Dordrecht of Drechtsteden' },
            { id: 'zuid_holland', label: 'Elders in Zuid-Holland' },
            { id: 'nederland', label: 'Elders in Nederland' },
            { id: 'buitenland', label: 'Buitenland' },
          ],
          crm: { attr: 'huidige_locatie' },
        },
        // 5 — reden → column intent_id
        {
          key: 'reden',
          type: 'single-choice',
          label: 'Waarom zoekt u ruimte?',
          options: [
            { id: 'uitbreiding', label: 'Uitbreiding' },
            { id: 'verhuizing', label: 'Verhuizing' },
            { id: 'nieuwe_vestiging', label: 'Nieuwe vestiging' },
            { id: 'anders', label: 'Anders' },
          ],
          crm: { column: 'intent_id' },
        },
        // 6 — water_belang, met branch bij 'niet_nodig' → note + goto m2
        {
          key: 'water_belang',
          type: 'single-choice',
          label: 'Hoe belangrijk is een ligging aan het water voor uw bedrijfsproces?',
          options: [
            { id: 'noodzakelijk', label: 'Noodzakelijk' },
            { id: 'gewenst', label: 'Gewenst' },
            { id: 'niet_nodig', label: 'Niet nodig' },
          ],
          crm: { attr: 'water_belang' },
          branch: {
            niet_nodig: {
              note: 'Goed om te weten. De 2e Merwedehaven is bedoeld voor watergebonden bedrijven. De kans op een kavel is daarmee klein. Wij nemen uw gegevens wel op en laten het weten als er iets past.',
              goto: 'm2',
            },
          },
        },
        // 7 — water_gebruik (multiselect) → attr water_gebruik (+ _tekst)
        {
          key: 'water_gebruik',
          type: 'multi-choice',
          label: 'Waar gebruikt u het water voor? Meerdere antwoorden mogelijk.',
          options: [
            { id: 'aanvoer_afvoer', label: 'Aanvoer en afvoer per schip' },
            { id: 'afmeren', label: 'Afmeren' },
            { id: 'te_water_laten', label: 'Te water laten' },
            { id: 'overslag', label: 'Overslag' },
            { id: 'reparatie_onderhoud', label: 'Reparatie en onderhoud van schepen' },
          ],
          crm: { attr: 'water_gebruik' },
        },
        // 8 — kade_meters
        {
          key: 'kade_meters',
          type: 'single-choice',
          label: 'Hoeveel meter kade heeft u nodig?',
          options: [
            { id: 'geen', label: 'Geen' },
            { id: 'tot_50', label: 'Tot 50 m' },
            { id: '50_100', label: '50 tot 100 m' },
            { id: 'meer_100', label: 'Meer dan 100 m' },
            { id: 'weet_niet', label: 'Weet ik nog niet' },
          ],
          crm: { attr: 'kade_meters' },
        },
        // 9 — kade_investering
        {
          key: 'kade_investering',
          type: 'single-choice',
          label: 'Bent u bereid zelf te investeren in de kadeconstructie?',
          options: [
            { id: 'ja', label: 'Ja' },
            { id: 'mogelijk', label: 'Mogelijk, wil ik bespreken' },
            { id: 'nee', label: 'Nee' },
          ],
          crm: { attr: 'kade_investering' },
        },
        // 10 — m2 (stepKey 'm2', branch-doel van water_belang) → column size_id
        {
          key: 'm2',
          type: 'single-choice',
          label: 'Hoeveel m2 terrein zoekt u ongeveer?',
          options: [
            { id: 'tot_5000', label: 'Tot 5.000' },
            { id: '5000_10000', label: '5.000 tot 10.000' },
            { id: '10000_25000', label: '10.000 tot 25.000' },
            { id: 'meer_25000', label: 'Meer dan 25.000' },
            { id: 'weet_niet', label: 'Weet ik nog niet' },
          ],
          crm: { column: 'size_id' },
        },
        // 11 — kavel_voorkeur
        {
          key: 'kavel_voorkeur',
          type: 'single-choice',
          label: 'Zoekt u een eigen kavel, of is een gedeeld terrein ook een optie?',
          options: [
            { id: 'eigen_kavel', label: 'Eigen kavel' },
            { id: 'gedeeld', label: 'Gedeeld terrein is bespreekbaar' },
            { id: 'geen_voorkeur', label: 'Geen voorkeur' },
          ],
          crm: { attr: 'kavel_voorkeur' },
        },
        // 12 — milieucategorie
        {
          key: 'milieucategorie',
          type: 'single-choice',
          label: 'Welke milieucategorie past bij uw activiteiten?',
          options: [
            { id: 'tm_32', label: 'T/m 3.2' },
            { id: '41', label: '4.1' },
            { id: '42', label: '4.2' },
            { id: 'hoger', label: 'Hoger' },
            { id: 'weet_niet', label: 'Weet ik niet' },
          ],
          crm: { attr: 'milieucategorie' },
        },
        // 13 — termijn → column timeline_id
        {
          key: 'termijn',
          type: 'single-choice',
          label: 'Wanneer wilt u er zitten?',
          options: [
            { id: 'binnen_1jaar', label: 'Binnen 1 jaar' },
            { id: '1_2jaar', label: '1 tot 2 jaar' },
            { id: '2_5jaar', label: '2 tot 5 jaar' },
            { id: 'geen_termijn', label: 'Nog geen termijn' },
          ],
          crm: { column: 'timeline_id' },
        },
        // 14 — erfpacht
        {
          key: 'erfpacht',
          type: 'single-choice',
          label: 'De grond wordt uitgegeven in erfpacht voor 75 jaar. Past dat bij uw plannen?',
          options: [
            { id: 'ja', label: 'Ja' },
            { id: 'mogelijk', label: 'Mogelijk, wil ik bespreken' },
            { id: 'nee', label: 'Nee' },
          ],
          crm: { attr: 'erfpacht_akkoord' },
        },
        // 15 — medewerkers
        {
          key: 'medewerkers',
          type: 'single-choice',
          label: 'Hoeveel medewerkers heeft uw bedrijf?',
          options: [
            { id: 'tot_10', label: 'Tot 10' },
            { id: '10_50', label: '10 tot 50' },
            { id: '50_150', label: '50 tot 150' },
            { id: 'meer_150', label: 'Meer dan 150' },
          ],
          crm: { attr: 'medewerkers' },
        },
        // 16 — hoe_gehoord
        {
          key: 'hoe_gehoord',
          type: 'single-choice',
          label: 'Hoe heeft u van de 2e Merwedehaven gehoord?',
          options: [
            { id: 'social_media', label: 'Social media' },
            { id: 'google', label: 'Google' },
            { id: 'via_via', label: 'Via via' },
            { id: 'anders', label: 'Anders' },
          ],
          crm: { attr: 'hoe_gehoord' },
        },
        // Overgang naar contactgegevens.
        {
          type: 'message',
          text: 'Tot slot uw contactgegevens, zodat wij u op de hoogte kunnen houden.',
        },
        // 17 — email → lead email (pushSnapshot-gate)
        {
          key: 'email',
          type: 'open-text',
          label: 'Wat is uw e-mailadres?',
          placeholder: 'Uw e-mailadres',
          inputMode: 'email',
          crm: { lead: 'email' },
        },
        // 18 — telefoon → lead phone
        {
          key: 'telefoon',
          type: 'open-text',
          label: 'Wat is uw telefoonnummer?',
          placeholder: 'Uw telefoonnummer',
          inputMode: 'tel',
          crm: { lead: 'phone' },
        },
        // 19 — terugbelvoorkeur
        {
          key: 'terugbelvoorkeur',
          type: 'single-choice',
          label: 'Wilt u dat wij bellen zodra de kavelindeling en de criteria bekend zijn?',
          options: [
            { id: 'bel_mij', label: 'Ja, bel mij' },
            { id: 'alleen_mail', label: 'Nee, alleen per mail' },
          ],
          crm: { attr: 'terugbelvoorkeur' },
        },
      ],
    },
  },
}

// Peiling toont geen USP-cards. Lege lijst zodat de hostname-loader een
// geldige named-export vindt.
export function uspCardOrder() {
  return []
}
