// Flowconfiguratie. Sentence case voor labels, geen punten of vraagtekens op chips.
// De eerste vraag is direct persona-select: dat collapst de oude intent + focus
// in één laagdrempelige keuze.
export const flow = {
  steps: [
    'intro',
    'intent',
    'microValue',
    'leadName',
    'leadEmail',
    'leadPhoneAsk',
    'leadPhone',
    'timeline',
    'size',
    'recommendation',
    'moreInfo',
    'followup',
    'thankyou',
  ],

  questions: {
    // Eerste vraag is persona-select. Geen tijdsbelofte, geen "korte vraag" intro.
    intent: {
      key: 'intent',
      label: 'Waar kijk je vooral naar?',
      options: [
        { id: 'eigen_bedrijf', label: 'Voor mijn bedrijf', score: 12, persona: 'eigen_gebruiker' },
        { id: 'belegging', label: 'Als belegging', score: 15, persona: 'belegger' },
        { id: 'beide', label: 'Beide', score: 10, persona: 'beide' },
        { id: 'weet_niet', label: 'Weet ik nog niet', score: 4, persona: 'onbekend' },
      ],
    },

    timeline: {
      key: 'timeline',
      label: 'Wanneer zou je willen kopen of starten?',
      options: [
        { id: 'zsm', label: 'Zo snel mogelijk', score: 35 },
        { id: '3mnd', label: 'Binnen 3 maanden', score: 25 },
        { id: '6mnd', label: 'Binnen 6 maanden', score: 15 },
        { id: 'dit_jaar', label: 'Later dit jaar', score: 10 },
        { id: 'weet_niet', label: 'Weet ik nog niet', score: 3 },
      ],
    },

    size: {
      key: 'size',
      label: 'Welke grootte past ongeveer?',
      options: [
        { id: 'rond_100', label: 'Rond 100 m²', score: 15, unit: 'L' },
        { id: 'meer_dan_100', label: 'Meer dan 100 m²', score: 15, unit: 'XXL' },
        { id: 'zo_groot', label: 'Zo groot mogelijk', score: 12, unit: 'XXL' },
        { id: 'beschikbaar', label: 'Wat nu beschikbaar is', score: 18, unit: 'L' },
        { id: 'weet_niet', label: 'Weet ik nog niet', score: 5 },
      ],
    },

    followup: {
      key: 'followup',
      label: 'Hoe wil je het liefst verder?',
      options: [
        { id: 'mail', label: 'Alleen mail', score: 5 },
        { id: 'mail_wa', label: 'Mail en WhatsApp', score: 18 },
        { id: 'plan', label: 'Plan een afspraak', score: 28 },
        { id: 'bel', label: 'Bel mij', score: 30 },
        { id: 'wa_nu', label: 'WhatsApp mij nu', score: 32 },
      ],
    },
  },
}
