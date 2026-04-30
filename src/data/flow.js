// Flowconfiguratie. Copy is bewust lowercase en zonder leestekens
// passend bij chat-tone. Kort houden voor chip-leesbaarheid.
export const flow = {
  steps: [
    'intro',
    'intent',
    'focus',
    'microValue',
    'leadForm',
    'timeline',
    'size',
    'recommendation',
    'followup',
    'thankyou',
  ],

  questions: {
    intent: {
      key: 'intent',
      label: 'waar ben je vooral benieuwd naar',
      options: [
        { id: 'units_beschikbaar', label: 'beschikbare units', score: 25 },
        { id: 'prijzen_plattegronden', label: 'prijzen en plattegronden', score: 20 },
        { id: 'belegging', label: 'geschikt als belegging', score: 15, persona: 'belegger' },
        { id: 'kijkt_rond', label: 'kijk eerst even rond', score: 5 },
      ],
    },

    focus_eigen_gebruiker: {
      key: 'focus',
      label: 'waar zou je de ruimte vooral voor gebruiken',
      options: [
        { id: 'opslag', label: 'opslag', score: 12 },
        { id: 'werkplaats', label: 'werkplaats', score: 14 },
        { id: 'showroom_kantoor', label: 'showroom of kantoor', score: 14 },
        { id: 'combinatie', label: 'combinatie', score: 14 },
        { id: 'weet_niet', label: 'nog niet zeker', score: 4 },
      ],
    },
    focus_belegger: {
      key: 'focus',
      label: 'wat is voor jou het belangrijkst',
      options: [
        { id: 'verhuurbaarheid', label: 'verhuur', score: 14 },
        { id: 'schaarste_locatie', label: 'schaarste en locatie', score: 14 },
        { id: 'prijs_per_m2', label: 'prijs per m²', score: 14 },
        { id: 'flexibiliteit', label: 'flexibiliteit', score: 12 },
        { id: 'combinatie', label: 'combinatie', score: 10 },
      ],
    },
    focus_default: {
      key: 'focus',
      label: 'voor wie zoek je dit vooral',
      options: [
        { id: 'eigen_bedrijf', label: 'voor mijn bedrijf', score: 12, persona: 'eigen_gebruiker' },
        { id: 'belegging', label: 'als belegging', score: 12, persona: 'belegger' },
        { id: 'beide', label: 'beide', score: 8 },
        { id: 'weet_niet', label: 'weet ik nog niet', score: 4 },
      ],
    },

    timeline: {
      key: 'timeline',
      label: 'wanneer zou je willen kopen of starten',
      options: [
        { id: 'zsm', label: 'zo snel mogelijk', score: 35 },
        { id: '3mnd', label: 'binnen 3 maanden', score: 25 },
        { id: '6mnd', label: 'binnen 6 maanden', score: 15 },
        { id: 'dit_jaar', label: 'later dit jaar', score: 10 },
        { id: 'weet_niet', label: 'weet ik nog niet', score: 3 },
      ],
    },

    size: {
      key: 'size',
      label: 'welke grootte past ongeveer',
      options: [
        { id: 'rond_100', label: 'rond 100 m²', score: 15, unit: 'L' },
        { id: 'meer_dan_100', label: 'meer dan 100 m²', score: 15, unit: 'XXL' },
        { id: 'zo_groot', label: 'zo groot mogelijk', score: 12, unit: 'XXL' },
        { id: 'beschikbaar', label: 'wat nu beschikbaar is', score: 18, unit: 'L' },
        { id: 'weet_niet', label: 'weet ik nog niet', score: 5 },
      ],
    },

    followup: {
      key: 'followup',
      label: 'hoe wil je het liefst verder',
      options: [
        { id: 'mail', label: 'alleen mail', score: 5 },
        { id: 'mail_wa', label: 'mail en whatsapp', score: 18 },
        { id: 'plan', label: 'plan afspraak', score: 28 },
        { id: 'bel', label: 'bel mij', score: 30 },
        { id: 'wa_nu', label: 'whatsapp mij nu', score: 32 },
      ],
    },
  },

  focusVariant(persona) {
    if (persona === 'eigen_gebruiker') return 'focus_eigen_gebruiker'
    if (persona === 'belegger') return 'focus_belegger'
    return 'focus_default'
  },
}
