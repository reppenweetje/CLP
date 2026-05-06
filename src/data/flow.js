// Flowconfiguratie. Sentence case voor labels, geen punten of vraagtekens op chips.
// Volgorde: intent (persona) → microValue (USP cards) → brochureTrigger →
// (ja: lead email → name → phoneAsk → phone | nee: afhaakReasons) →
// size → timeline → recommendation → moreInfo → followup → thankyou
export const flow = {
  steps: [
    'intro',
    'intent',
    'microValue',
    'brochureTrigger',
    'afhaakReasons',
    'leadEmail',
    'leadName',
    'leadPhoneAsk',
    'leadPhone',
    'size',
    'timeline',
    'recommendation',
    'moreInfo',
    'followup',
    'thankyou',
  ],

  questions: {
    // Eerste vraag is direct persona-select.
    intent: {
      key: 'intent',
      label: 'Waarom ben je op zoek naar een bedrijfsunit?',
      options: [
        { id: 'eigen_bedrijf', label: 'Voor mijn bedrijf', score: 12, persona: 'eigen_gebruiker' },
        { id: 'belegging', label: 'Als belegging', score: 15, persona: 'belegger' },
        { id: 'beide', label: 'Beide', score: 10, persona: 'beide' },
        { id: 'huur', label: 'Te huur', score: 5, persona: 'huurder' },
        { id: 'weet_niet', label: 'Weet ik nog niet', score: 4, persona: 'onbekend' },
      ],
    },

    // Brochure-gate na de USP cards. Twee chips: door naar lead capture,
    // of naar de afhaak-redenen vraag voor marktonderzoek.
    // Live beschikbaarheid kan vroeg worden getoond zodat de bezoeker
    // de situatietekening al ziet voordat hij om de brochure wordt gevraagd.
    availabilityCheck: {
      key: 'availabilityCheck',
      label: 'Wil je nu zien welke units nog beschikbaar zijn?',
      options: [
        { id: 'ja', label: 'Ja, laat zien' },
        { id: 'nee', label: 'Liever niet' },
      ],
    },

    brochureTrigger: {
      key: 'brochureTrigger',
      label: 'Zou dit interessant voor je kunnen zijn? Dan kan ik je de brochure mailen.',
      options: [
        { id: 'ja', label: 'Ja, stuur maar', score: 20, intent: true },
        { id: 'nee', label: 'Nee, ik zoek iets anders', score: 0, afhaak: true },
      ],
    },

    // Optioneel afhaak-pad voor wie aangeeft iets anders te zoeken.
    // Antwoord wordt als markonderzoek-data opgeslagen.
    afhaakReasons: {
      key: 'afhaakReasons',
      label: 'Wat past minder?',
      options: [
        { id: 'prijs', label: 'Prijs te hoog', score: 0 },
        { id: 'locatie', label: 'Locatie past niet', score: 0 },
        { id: 'oppervlakte', label: 'Oppervlakte past niet', score: 0 },
        { id: 'huur', label: 'Huur in plaats van koop', score: 0 },
        { id: 'anders', label: 'Iets anders', score: 0 },
      ],
    },

    // Sub-vraag voor het rent-match pad. Wanneer iemand aangeeft te
    // willen huren slaan we de gewenste huurprijs-range op zodat we
    // later kunnen koppelen aan beleggers die hun unit willen verhuren.
    rentRange: {
      key: 'rentRange',
      label: 'Welke huurprijs zou je redelijk vinden per m² per jaar?',
      options: [
        { id: 'tot_150', label: 'Tot €150', score: 0 },
        { id: '150_200', label: '€150 tot €200', score: 0 },
        { id: '200_250', label: '€200 tot €250', score: 0 },
        { id: 'meer_250', label: 'Meer dan €250', score: 0 },
        { id: 'weet_niet', label: 'Weet ik nog niet', score: 0 },
      ],
    },

    // Size focus is begane grond zodat consument niet hoeft te
    // schatten over twee verdiepingen heen. Reden zit in de bot-copy.
    size: {
      key: 'size',
      label: 'Hoe groot wil je dat de begane grond is?',
      options: [
        { id: 'tot_50', label: '50 m²', score: 12, unit: 'L' },
        { id: 'rond_100', label: '100 m²', score: 15, unit: 'L' },
        { id: 'meer_dan_100', label: 'Groter dan 100 m²', score: 15, unit: 'XXL' },
        { id: 'weet_niet', label: 'Weet ik nog niet', score: 5 },
      ],
    },

    timeline: {
      key: 'timeline',
      label: 'Om je op het juiste moment te benaderen: voor wanneer ben je op zoek?',
      options: [
        { id: 'zsm', label: 'Zo snel mogelijk', score: 35 },
        { id: '3mnd', label: 'Binnen 3 maanden', score: 25 },
        { id: '6mnd', label: 'Binnen 6 maanden', score: 15 },
        { id: 'dit_jaar', label: 'Later dit jaar', score: 10 },
        { id: 'weet_niet', label: 'Weet ik nog niet', score: 3 },
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
