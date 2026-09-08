// Projectdata 2E MERWEDEHAVEN — WARME variant (Dordrecht).
//
// Dit is een DUPLICAAT van de koude ads-variant (projects/2emwh.js): exact
// dezelfde peiling, ALLEEN de opt-in verschilt. Bedoeld voor leads die al in
// het CRM zitten en eerder voor de 2e Merwedehaven binnenkwamen. We vragen hun
// contactgegevens niet opnieuw blanco, maar tonen ze voorgevuld (opgehaald via
// een persoonlijk token in de link → lead-prefetch Edge Function) zodat ze
// alleen hoeven te bevestigen of iets aan te passen.
//
// Alles behalve de contact-step wordt hergebruikt uit 2emwh.js, zodat de twee
// varianten niet uit elkaar lopen. crmProject is bewust IDENTIEK ('2e MWH'):
// beide varianten voeden dezelfde CRM-lijst. Alleen de hostname (en dus het
// localStorage-namespacing via id) verschilt.
//
// Hostname = 2emerwedehaven.clp.repp.nl.
import { project as adsProject } from './2emwh.js'

const adsSurvey = adsProject.flowOverrides.surveyFlow
const adsContact = adsSurvey.steps.find((s) => s.key === 'contact')

// Warme contact-step: zelfde velden en CRM-mapping als de koude variant, maar
// gemarkeerd warm:true (andere kop/knop-copy in ConfigContactBubble) en met een
// voorgevulde-intro. App.jsx vult de velden met de gegevens uit de
// clp_prefill-RPC (opgezocht op het prefill_token uit de mail-link). Alle
// velden blijven aanpasbaar: de bezoeker mag een ander e-mailadres of nummer
// invoeren als de gegevens niet meer kloppen.
const warmContact = {
  ...adsContact,
  warm: true,
  // Korter dan in de koude variant: de begroeting staat nu al in de intro, dus
  // hier alleen nog waar het om gaat.
  intro: 'Dit hebben wij van u genoteerd. Kloppen deze gegevens nog? U kunt ze aanpassen.',
}

// Persoonlijke intro voor wie via de mail binnenkomt en die we dus al kennen.
// Wordt gebruikt zodra er een bruikbare voornaam uit de prefill komt; anders
// valt de flow terug op de neutrale intro uit de koude variant.
const introPersoonlijk = [
  'Welkom terug, {voornaam}.',
  'Fijn dat u meedenkt over de 2e Merwedehaven in Dordrecht.',
  'Ik stel u een paar korte vragen over uw bedrijf en uw ruimtevraag. Daarna houden wij u persoonlijk op de hoogte.',
]

const steps = adsSurvey.steps.map((s) => (s.key === 'contact' ? warmContact : s))

export const project = {
  ...adsProject,
  id: '2emerwedehaven',
  name: '2emerwedehaven',

  // Zet aan dat App.jsx bij binnenkomst met ?t=<prefill_token> de gegevens
  // ophaalt (clp_prefill-RPC) en het contact-formulier voorvult.
  warmPrefill: true,

  flowOverrides: {
    ...adsProject.flowOverrides,
    surveyFlow: {
      ...adsSurvey,
      introPersoonlijk,
      steps,
    },
  },
}

export function uspCardOrder() {
  return []
}
