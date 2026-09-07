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
// voorgevulde-intro. De velden worden door App.jsx voorgevuld met de opgehaalde
// gegevens; e-mail en telefoon blijven aanpasbaar (bezoeker mag een ander adres
// invoeren als de gegevens niet meer kloppen).
const warmContact = {
  ...adsContact,
  warm: true,
  intro: 'Fijn dat u er weer bent. Dit hebben wij van u genoteerd. Kloppen deze gegevens nog? U kunt ze aanpassen.',
}

const steps = adsSurvey.steps.map((s) => (s.key === 'contact' ? warmContact : s))

export const project = {
  ...adsProject,
  id: '2emerwedehaven',
  name: '2emerwedehaven',

  // Zet aan dat App.jsx bij binnenkomst met ?t=<portal_token> de gegevens
  // ophaalt en het contact-formulier voorvult (en de bijbehorende sessie
  // aanneemt zodat een afgeronde flow de bestaande lead bijwerkt).
  warmPrefill: true,

  flowOverrides: {
    ...adsProject.flowOverrides,
    surveyFlow: {
      ...adsSurvey,
      steps,
    },
  },
}

export function uspCardOrder() {
  return []
}
