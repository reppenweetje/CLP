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

// Intro voor wie via de mail binnenkomt. Pakt bewust de draad van die mail op:
// zelfde aanleiding ("er komt ruimte vrij aan het water") en dezelfde vraag
// ("is uw zoekvraag nog actueel"), zodat de CLP geen nieuw verhaal begint.
//
// LET OP: hier NIET verwijzen naar de 3e Merwedehaven. De genodigden komen uit
// meerdere lijsten, dus dat klopt niet voor iedereen. We doen daarom geen
// enkele uitspraak over waar iemand eerder vandaan kwam.
//
// Twee varianten: met naam (als de prefill een bruikbare voornaam oplevert) en
// zonder. Beide blijven warm, want in beide gevallen komt de bezoeker uit de mail.
const introRegels = [
  'Er komt ruimte vrij aan het water in de 2e Merwedehaven in Dordrecht.',
  'Wij horen graag of uw zoekvraag nog actueel is en hoe die er nu uitziet. Uw antwoorden nemen wij mee in de volgende ronde.',
]
const introPersoonlijk = ['Welkom terug, {voornaam}.', ...introRegels]
const introNeutraal = ['Welkom terug.', ...introRegels]

const steps = adsSurvey.steps.map((s) => (s.key === 'contact' ? warmContact : s))

export const project = {
  ...adsProject,
  id: '2emerwedehaven',
  name: '2emerwedehaven',

  // Zet aan dat App.jsx bij binnenkomst met ?t=<prefill_token> de gegevens
  // ophaalt (clp_prefill-RPC) en het contact-formulier voorvult.
  warmPrefill: true,

  // Deze variant wordt alleen vanuit de mail bezocht, nooit via advertenties.
  leadSource: 'mail',

  flowOverrides: {
    ...adsProject.flowOverrides,
    surveyFlow: {
      ...adsSurvey,
      // Overschrijft de koude intro: ook zonder bruikbare voornaam komt deze
      // bezoeker uit de mail, dus nooit de ads-intro tonen.
      intro: introNeutraal,
      introPersoonlijk,
      steps,
    },
  },
}

export function uspCardOrder() {
  return []
}
