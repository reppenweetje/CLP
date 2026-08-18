import { useEffect, useReducer, useState } from 'react'
import { project, uspCardOrder } from './data/project.js'
import { flow, getLabel, SURVEY_CHIP_KEYS } from './data/flow.js'
import {
  computeScore,
  derivePersona,
  deriveStage,
  deriveTemperature,
} from './lib/scoring.js'
import {
  recommendUnit,
  recommendCopy,
  thankYouCopy,
  whatsAppDeeplink,
  buildCustomerWaSummary,
  customerAfhaakSummary,
  customerRentSummary,
  leadConfidence,
} from './lib/recommendation.js'
import { parseLeadInput, mergeLead } from './lib/parseLead.js'
import { captureAttribution, getAttribution } from './lib/attribution.js'
import { startNewSession, trackEvent, getSessionId } from './lib/analytics.js'
import { notifyHotLead } from './lib/slack.js'
import { pushLead, flushPending, isApiConfigured } from './lib/api.js'
import { notifyCallbackRequest } from './lib/callbackNotify.js'
import { attachEventsAutoFlush } from './lib/eventsApi.js'
import {
  logSessionStartConsent,
  logBrochureConsent,
  logCredionConsent,
  logErasureRequest,
} from './lib/consent.js'
import { sendCredionLead } from './lib/credion.js'
import { computeBuyingSignals, EMPTY_BEHAVIORS, getCallbackPromise, getTimeContext } from './lib/buyingSignals.js'
import { buildHandoffCopy, resolveMicroIntro, resolveRecommendCopy } from './lib/handoffCopy.js'
import AppShell from './components/AppShell.jsx'
import IntroScreen from './components/IntroScreen.jsx'
import ChatThread from './components/ChatThread.jsx'
import SuggestedChips from './components/SuggestedChips.jsx'
import ChatInput from './components/ChatInput.jsx'
import DebugPanel from './components/DebugPanel.jsx'
import AnswersSheet from './components/AnswersSheet.jsx'
import OptionsSheet from './components/OptionsSheet.jsx'
import CredionConfirmDialog from './components/CredionConfirmDialog.jsx'
import AdminScreen from './screens/AdminScreen.jsx'
import SmartResumeBanner from './components/SmartResumeBanner.jsx'
import RescueNudge from './components/RescueNudge.jsx'
import ExitIntentPrompt from './components/ExitIntentPrompt.jsx'
import { useSmartResume, useInactivityRescue, useExitIntent, getOrAssignVariant, getOrAssignIntroVariant } from './lib/engagement.js'
import { detectCurrentIp } from './lib/ipExclusion.js'
let _id = 0
const nextId = () => ++_id
// Snelle membership-check voor de peiling-sequencer (alleen relevant als
// project.flowOverrides.surveyFlow gezet is; anders wordt deze set nooit
// geraadpleegd en blijft de standaard flow ongewijzigd).
const SURVEY_CHIP_KEY_SET = new Set(SURVEY_CHIP_KEYS)
// Bump het versie-suffix wanneer de gepersisteerde state-shape wijzigt. Een
// oude state uit een vorige bundle kan messages bevatten zonder messageQueue;
// de mount-init slaat dan start() over (messages.length > 0) terwijl de queue
// leeg is, waardoor de followup- en intent-vraag-bubbles nooit verschijnen
// (alleen begroeting plus chips). Een nieuwe key forceert een schone cold start.
const STORAGE_KEY = 'clp-state-v7'

// Project-aware vraag-getter. Geeft de flow.questions[key] terug, maar
// overschrijft met project.flowOverrides[`${key}Question`] als het project
// per-project label/options definieert (bv Paveri's grootte-categorieën
// 112/178/208 m² ipv De Hofman's rond_105/rond_113/rond_192).
function getQuestion(key) {
  const base = flow.questions[key]
  if (!base) return base
  const override = project.flowOverrides?.[`${key}Question`]
  if (!override) return base
  return { ...base, ...override }
}

// Telt alle units uit sitePlan, ongeacht of project rows/sections/layoutRows/
// columns gebruikt. Gebruikt voor bot-text als "Hier zijn de X units".
function countSitePlanUnits(sp) {
  if (!sp) return 0
  return (
    (sp.rows?.flatMap((r) => r.units).length || 0) +
    (sp.sections?.flatMap((s) => s.units).length || 0) +
    (sp.sidebar?.units?.length || 0) +
    (sp.layoutRows?.reduce((n, r) => n + (r.left?.units?.length || 0) + (r.right ? 1 : 0), 0) || 0) +
    (sp.columns?.left?.sections?.flatMap((s) => s.units).length || 0) +
    (sp.columns?.right?.units?.length || 0) +
    (sp.svg?.units?.length || 0)
  )
}
const initial = {
  // Default = 'chat'. De IntroScreen/startpagina is volledig uitgefaseerd
  // (A/B-test afgerond: direct-naar-chat won), dus iedere bezoeker landt in
  // alle CLPs direct in het gesprek. Er is geen pad meer dat view op 'intro'
  // zet — de useReducer-initializer en persisted-load forceren ook 'chat'.
  view: 'chat',
  messages: [],
  messageQueue: [],
  currentQuestion: null,
  answers: {},
  leadDraft: {},
  moreInfoSeen: [],
  behaviors: EMPTY_BEHAVIORS,
  debugOpen: false,
}
function loadPersisted() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?._idCounter) _id = parsed._idCounter
    return parsed
  } catch {
    return null
  }
}
function persist(state) {
  if (typeof window === 'undefined') return
  try {
    const toSave = {
      view: state.view,
      messages: state.messages,
      currentQuestion: state.currentQuestion,
      answers: state.answers,
      leadDraft: state.leadDraft,
      moreInfoSeen: state.moreInfoSeen,
      behaviors: state.behaviors,
      _idCounter: _id,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {}
}
function clearPersisted() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
// Volgorde van de antwoord-keys voor downstream-clearing bij rollback.
// Lead is bewust niet in deze lijst zodat naam/mail/06 behouden blijven
// tenzij de bezoeker ze expliciet vergeet via de antwoorden-sheet.
const ANSWER_ORDER = ['intent', 'availabilityCheck', 'brochureTrigger', 'afhaakReason', 'rentRange', 'size', 'timeline', 'followup']
function downstreamKeys(fromKey) {
  const idx = ANSWER_ORDER.indexOf(fromKey)
  if (idx === -1) return [fromKey]
  return ANSWER_ORDER.slice(idx)
}
function reducer(state, action) {
  switch (action.type) {
    case 'START_CHAT': {
      const bot = action.bot || { name: 'Jesse', org: 'REPP' }
      // Variant uit action gebruiken; default 'a' als afwezig (server-side
      // render of pre-engagement init).
      const copyVariant = action.copyVariant || 'a'
      // typeFirst: zet ook de eerste begroeting in de release-queue zodat de
      // bezoeker eerst de typing-indicator ziet — voelt meer als een echte
      // conversatie die opstart. Gebruikt door de 'skip'-arm van het
      // intro-A/B (zie auto-start useEffect in Demo). De 'show'-arm geeft
      // typeFirst niet mee zodat de bubble direct verschijnt na de klik op
      // "Start chat" (anders voelt die klik laggy).
      const typeFirst = action.typeFirst === true
      const greeting = { kind: 'bot-text', text: `Hoi, ik ben ${bot.name} van ${bot.org}.` }
      // Peiling-modus (BREDA): survey-intro + werkruimte als eerste vraag.
      // Alleen actief als het project flowOverrides.surveyFlow zet; anders
      // valt de code door naar de standaard verkoop-intro hieronder, byte-
      // voor-byte gelijk aan voorheen.
      const surveyFlow = project.flowOverrides?.surveyFlow
      if (surveyFlow) {
        const introBubbles = (surveyFlow.intro || []).map((text) => ({ kind: 'bot-text', text }))
        const surveyQuestion = { kind: 'bot-text', text: flow.questions.doel.label }
        return {
          ...state,
          view: 'chat',
          messages: typeFirst ? [] : [{ id: nextId(), ...greeting }],
          messageQueue: typeFirst
            ? [greeting, ...introBubbles, surveyQuestion]
            : [...introBubbles, surveyQuestion],
          currentQuestion: 'doel',
        }
      }
      const followup = { kind: 'bot-text', text: 'Om de juiste brochure en prijzen met je te delen heb ik een korte vraag.' }
      // Project mag de copy-variant van de intent-vraag overschrijven met
      // één vaste tekst (flowOverrides.intentLabel). Zonder override blijft
      // de A/B copy-variant per bezoeker gewoon werken.
      const question = { kind: 'bot-text', text: project.flowOverrides?.intentLabel ?? getLabel('intent', copyVariant) }
      return {
        ...state,
        view: 'chat',
        messages: typeFirst ? [] : [{ id: nextId(), ...greeting }],
        messageQueue: typeFirst ? [greeting, followup, question] : [followup, question],
        currentQuestion: 'intent',
      }
    }
    case 'RETURN_TO_INTRO':
      // Startpagina is uitgefaseerd: dit pad mag de bezoeker niet meer naar
      // 'intro' sturen. We houden de actie als no-op (blijft in chat) zodat
      // een eventuele resterende dispatch nergens meer een IntroScreen toont.
      return { ...state, view: 'chat' }
    case 'RESUME_CHAT':
      // Tegenhanger van RETURN_TO_INTRO: vanaf intro terug naar chat zonder
      // de welkomst-bubbles opnieuw op te bouwen. START_CHAT zou messages
      // wissen, dat willen we hier niet.
      return { ...state, view: 'chat' }
    case 'APPEND':
      return {
        ...state,
        messages: [...state.messages, ...action.messages.map((m) => ({ id: nextId(), ...m }))],
      }
    case 'SET_MESSAGES':
      return { ...state, messages: action.messages }
    case 'ENQUEUE':
      return { ...state, messageQueue: [...(state.messageQueue || []), ...action.messages] }
    case 'RELEASE_NEXT': {
      const queue = state.messageQueue || []
      if (queue.length === 0) return state
      const [next, ...rest] = queue
      // Pause-marker: alleen de queue verschuiven, niet renderen. Geeft de
      // bezoeker rust na een rich bubble (bv. site-plan) zonder dat de
      // chip-bar te snel weer in beeld komt.
      if (next.kind === 'pause') {
        return { ...state, messageQueue: rest }
      }
      return {
        ...state,
        messages: [...state.messages, { id: nextId(), ...next }],
        messageQueue: rest,
      }
    }
    case 'CLEAR_QUEUE':
      return { ...state, messageQueue: [] }
    case 'ANSWER':
      return {
        ...state,
        answers: { ...state.answers, [action.key]: action.value },
        currentQuestion: action.next ?? null,
      }
    case 'SET_QUESTION':
      return { ...state, currentQuestion: action.next ?? null }
    case 'LEAD_DRAFT':
      return { ...state, leadDraft: action.draft }
    case 'MORE_INFO_SEEN':
      return { ...state, moreInfoSeen: [...state.moreInfoSeen, action.id] }
    case 'TOGGLE_DEBUG':
      return { ...state, debugOpen: !state.debugOpen }
    case 'ROLLBACK': {
      const target = state.answers[action.key]
      if (!target || target._msgCountBefore === undefined) return state
      const idx = target._msgCountBefore
      const removeKeys = downstreamKeys(action.key)
      const newAnswers = { ...state.answers }
      for (const k of removeKeys) delete newAnswers[k]
      // BUG-fix #14: queue moet ook leeg, anders blijft de chip/input
      // verborgen achter de check `messageQueue.length === 0` en lijkt
      // de chat vast te zitten. Behaviors-reset voorkomt dat een eerder
      // getoonde warm-handoff blokkerend blijft staan na rollback van
      // size/timeline (die hot-signal-input leveren).
      const newBehaviors = ['size', 'timeline', 'followup'].includes(action.key)
        ? { ...state.behaviors, warmHandoffShown: false, warmHandoffOutcome: null }
        : state.behaviors
      return {
        ...state,
        messages: state.messages.slice(0, idx),
        messageQueue: [],
        answers: newAnswers,
        currentQuestion: action.key,
        moreInfoSeen: ['size', 'timeline', 'followup'].includes(action.key) ? [] : state.moreInfoSeen,
        behaviors: newBehaviors,
      }
    }
    case 'FORGET_LEAD':
      return { ...state, leadDraft: {}, answers: { ...state.answers, lead: undefined } }
    case 'BEHAVIOR_UNIT_VIEWED': {
      const b = state.behaviors || EMPTY_BEHAVIORS
      const unique = new Set(b.uniqueUnitsViewed || [])
      unique.add(action.number)
      return {
        ...state,
        behaviors: {
          ...b,
          unitDetailOpens: (b.unitDetailOpens || 0) + 1,
          uniqueUnitsViewed: [...unique],
          lastUnitViewed: action.number,
        },
      }
    }
    case 'BEHAVIOR_CALC_INTERACTED': {
      const b = state.behaviors || EMPTY_BEHAVIORS
      if (action.calcType === 'rentability') {
        return { ...state, behaviors: { ...b, rentabilityCalcInteracts: (b.rentabilityCalcInteracts || 0) + 1 } }
      }
      if (action.calcType === 'mortgage') {
        return { ...state, behaviors: { ...b, mortgageCalcInteracts: (b.mortgageCalcInteracts || 0) + 1 } }
      }
      return state
    }
    case 'BEHAVIOR_CREDION_CALC':
      // Snapshot van de calc-sliders (maandlast of rendement) op het
      // moment dat de bezoeker op de Credion-knop tikte. Wordt later in
      // sendCredionLead meegestuurd zodat Credion de aanvraag al kan
      // beoordelen met de cijfers waarmee de bezoeker speelde.
      return { ...state, behaviors: { ...(state.behaviors || EMPTY_BEHAVIORS), credionCalcData: action.payload } }
    case 'BEHAVIOR_CREDION_REQUESTED': {
      // Vlag dat bezoeker via de calc-link Credion heeft aangevraagd.
      // Lead-capture handlers checken deze flag om na de phone-stap
      // (of phone-skip) automatisch de Credion-flow af te ronden ipv
      // de normale brochureTrigger-vervolgstappen te draaien.
      const b = state.behaviors || EMPTY_BEHAVIORS
      return { ...state, behaviors: { ...b, credionRequested: true } }
    }
    case 'BEHAVIOR_RENT_MATCH_REQUESTED': {
      // Vlag dat bezoeker via de huur-flow zijn voorkeur heeft geregistreerd
      // zonder lead-gegevens. Lead-capture handlers checken deze flag om na
      // naam/06 de rent-match-flow af te ronden met een CTA-card ipv door
      // te schieten naar size/timeline.
      const b = state.behaviors || EMPTY_BEHAVIORS
      return { ...state, behaviors: { ...b, rentMatchRequested: true } }
    }
    case 'BEHAVIOR_RENDEMENT_SHOWN': {
      // Bezoeker heeft via de brochureTrigger-stap de rendement-uitleg
      // bekeken. Vlag voorkomt dat de "Vertel meer over rendement"-chip
      // opnieuw verschijnt en geeft de chip-bar de schoon-gehouden
      // ja/nee-keuze terug.
      const b = state.behaviors || EMPTY_BEHAVIORS
      return { ...state, behaviors: { ...b, rendementInfoShown: true } }
    }
    case 'BEHAVIOR_NAUTIC_EXPLANATION_SHOWN': {
      // Bezoeker heeft de "Wat houdt nautisch in?"-uitleg bekeken. Vlag
      // verbergt de uitleg-chip bij de tweede pass, daarna alleen ja/nee.
      const b = state.behaviors || EMPTY_BEHAVIORS
      return { ...state, behaviors: { ...b, nauticExplanationShown: true } }
    }
    case 'BEHAVIOR_SET_LEAD_VARIANT': {
      // Per-lead routing-vlag voor Brevo. Frontend zet 'em (bv. 'not_nautical'
      // bij PIER14 nauticGate=nee) en pushSnapshot stuurt 'em mee als
      // attributes.leadVariant. brevo.ts in lead-upsert leest dat veld en
      // routeert naar BREVO_LIST_ID_<SOURCE>_<NORMALIZED_VARIANT> ipv de
      // default project-list. Zo blijft één crmProject één CRM-rij maar
      // splitsen we Brevo-lijsten per sub-doelgroep.
      const b = state.behaviors || EMPTY_BEHAVIORS
      return { ...state, behaviors: { ...b, leadVariant: action.variant || null } }
    }
    case 'BEHAVIOR_MORE_INFO_VIEWED': {
      const b = state.behaviors || EMPTY_BEHAVIORS
      const ids = b.moreInfoIds || []
      if (ids.includes(action.id)) {
        return { ...state, behaviors: { ...b, moreInfoViewCount: (b.moreInfoViewCount || 0) + 1 } }
      }
      return {
        ...state,
        behaviors: {
          ...b,
          moreInfoIds: [...ids, action.id],
          moreInfoViewCount: (b.moreInfoViewCount || 0) + 1,
        },
      }
    }
    case 'BEHAVIOR_BROCHURE_CLICKED':
      return { ...state, behaviors: { ...(state.behaviors || EMPTY_BEHAVIORS), brochureClicked: true } }
    case 'BEHAVIOR_PHONE_DECLINED':
      return { ...state, behaviors: { ...(state.behaviors || EMPTY_BEHAVIORS), phoneAskedDeclined: true } }
    case 'WARM_HANDOFF_SHOWN':
      return { ...state, behaviors: { ...(state.behaviors || EMPTY_BEHAVIORS), warmHandoffShown: true } }
    case 'WARM_HANDOFF_OUTCOME':
      return { ...state, behaviors: { ...(state.behaviors || EMPTY_BEHAVIORS), warmHandoffOutcome: action.outcome } }
    case 'RESET':
      return { ...initial, debugOpen: state.debugOpen }
    default:
      return state
  }
}
function pickMicroIntro(persona) {
  return resolveMicroIntro(persona, project)
}
function userTextFromOpt(opt) {
  return opt.label
}
function buildAnswerSummary(answers) {
  const parts = []
  if (answers.intent) parts.push(answers.intent.label)
  if (answers.size) parts.push(answers.size.label)
  if (answers.timeline) parts.push(answers.timeline.label)
  return parts.join(', ')
}
// Volgorde-hint bij definitie wordt door moreInfoChips() per persona herschikt.
// Personas-filter beperkt tot relevante doelgroep wanneer aanwezig.
const MORE_INFO_DEFS = {
  location: { label: 'Meer over locatie' },
  sitePlan: { label: 'Situatietekening' },
  gallery: { label: 'Sfeerbeelden' },
  highlights: { label: `Waarom ${project.displayName}` },
  price: { label: 'Prijslijst' },
  priceCompare: { label: 'Prijsvergelijking' },
  planning: { label: 'Planning' },
  process: { label: 'Aankoopproces' },
  brochure: { label: 'Open brochure' },
  investor: { label: 'Belegger voordelen', personas: ['belegger', 'beide', 'onbekend'] },
  financing: { label: 'Financiering' },
}
// Per persona welke moreInfo-content het meest relevant is. Eerste in de lijst
// verschijnt het eerst in de chip-rij, zodat bezoekers de inhoud zien die voor
// hun situatie ertoe doet zonder dat ze door 11 chips hoeven te scrollen.
const MORE_INFO_PERSONA_ORDER = {
  belegger: ['priceCompare', 'investor', 'planning', 'financing', 'location', 'highlights', 'sitePlan', 'price', 'gallery', 'process', 'brochure'],
  eigen_gebruiker: ['location', 'sitePlan', 'gallery', 'highlights', 'price', 'planning', 'financing', 'process', 'brochure', 'priceCompare'],
  beide: ['location', 'priceCompare', 'investor', 'sitePlan', 'highlights', 'gallery', 'price', 'planning', 'financing', 'process', 'brochure'],
  onbekend: ['highlights', 'location', 'sitePlan', 'gallery', 'price', 'planning', 'process', 'brochure', 'priceCompare', 'financing'],
}
// Drempel voor de "all_seen"-fase: zodra de bezoeker N unieke moreInfo-chips
// heeft bekeken, gaat de bot van "discovery" naar "specifieke onderwerpen".
// Op 5 chips heeft de bezoeker een volledig beeld van het project zonder dat
// het te laat voelt om de "is er nog iets specifieks?"-vraag te stellen.
const ALL_SEEN_THRESHOLD = 5
// Telt hoeveel moreInfo-chips beschikbaar zijn voor deze persona. Wordt
// gebruikt om de wrap-up-trigger ("alle chips bekeken") te detecteren.
function countAvailableMoreInfo(persona) {
  const order = MORE_INFO_PERSONA_ORDER[persona] || MORE_INFO_PERSONA_ORDER.onbekend
  let count = 0
  for (const id of order) {
    const def = MORE_INFO_DEFS[id]
    if (!def) continue
    // Project kan onderwerpen uitschakelen (bv. ELSTER 11 heeft geen
    // financiering en geen prijsvergelijking). Additief en opt-in.
    if (project.disabledTopics?.includes(id)) continue
    if (def.personas && !def.personas.includes(persona)) continue
    count++
  }
  return count
}
// Hoeveel info-chips we standaard inline tonen bij moreInfo. De rest is
// bereikbaar via een "Bekijk alle onderwerpen" chip die de bottom-sheet
// opent. 4 voelt als het juiste aantal: niet overweldigend, wel keuze.
const PRIMARY_CHIP_COUNT = 4
function moreInfoChips(persona, seen, temperature, callbackArranged = false, hasEmail = false) {
  const order = MORE_INFO_PERSONA_ORDER[persona] || MORE_INFO_PERSONA_ORDER.onbekend
  const opts = []
  for (const id of order) {
    const def = MORE_INFO_DEFS[id]
    if (!def) continue
    if (seen.includes(id)) continue
    // Project-niveau uitgeschakelde onderwerpen (zie project.disabledTopics).
    if (project.disabledTopics?.includes(id)) continue
    if (def.personas && !def.personas.includes(persona)) continue
    opts.push({ id, label: def.label })
  }
  // Wanneer bezoeker al "Laat de makelaar mij bellen" heeft gekozen én
  // een 06 heeft achtergelaten, vervangen we de actieve callback-chip
  // door een non-clickable bevestigings-chip. Voorkomt dubbele-aanvraag
  // misclick en geeft visuele rust dat de afspraak genoteerd is.
  const callbackConfirmed = {
    id: '__callback_confirmed',
    label: 'De makelaar belt je zsm',
    variant: 'confirmed',
    disabled: true,
  }
  // De callback-chip krijgt bij warm/hot een primary-variant zodat hij
  // visueel uit de toon springt tussen de info-chips. Bezoekers met warme
  // signalen zien dan een duidelijke contact-CTA bovenaan de chips.
  // Generiek "de makelaar" — naam wordt pas relevant in de bubble-body
  // en outcome-strip waar context al bestaat.
  const callbackPrimary = callbackArranged
    ? callbackConfirmed
    : { id: '__callback', label: 'Laat de makelaar mij bellen', variant: 'primary' }
  const callbackPlain = callbackArranged
    ? callbackConfirmed
    : { id: '__callback', label: 'Laat de makelaar mij bellen' }
  // Portal-chip: pas zichtbaar zodra een e-mail bekend is. Geeft de bezoeker
  // een uitnodiging om zelf verder te kijken op de project-portal. Voor De
  // Hofman is dat dehofman.nl (eigen portal), voor andere projecten meestal
  // kopen.repp.nl/<slug> (kopen-repp-redirect strategie). Label komt uit
  // project.portalLabel, met fallback op hostname uit portalUrl.
  const portalLabel = project.portalLabel
    || (project.portalUrl ? `Bekijk op ${project.portalUrl.replace(/^https?:\/\//, '')}` : 'Bekijk koopomgeving')
  const portalChip = hasEmail
    ? { id: '__portal', label: portalLabel, variant: 'portal' }
    : null
  // All-seen-fase: bezoeker is voorbij de discovery-drempel. Naast de
  // resterende info-chips bieden we een expliciete "Ik heb genoeg gezien"-
  // chip aan zodat de bezoeker zelf het einde kan triggeren in plaats van
  // af te moeten wachten tot de laatste chip op is.
  const inAllSeenFase = seen.length >= ALL_SEEN_THRESHOLD
  const doneChip = { id: '__done', label: 'Ik heb genoeg gezien' }
  // Splits info-chips in primary (4 zichtbaar inline) + secondary (rest in
  // bottom-sheet). Niet doen in all-seen-fase want daar willen we juist alle
  // resterende opties tonen zodat de bezoeker er één kan kiezen.
  if (inAllSeenFase) {
    if (temperature === 'hot' || temperature === 'warm') {
      return [callbackPrimary, ...opts, ...(portalChip ? [portalChip] : []), doneChip]
    }
    return [...opts, callbackPlain, ...(portalChip ? [portalChip] : []), doneChip]
  }
  const primaryOpts = opts.slice(0, PRIMARY_CHIP_COUNT)
  const secondaryOpts = opts.slice(PRIMARY_CHIP_COUNT)
  // 'expand'-chip opent de OptionsSheet bottom-sheet. Toon 'em alleen als er
  // ook daadwerkelijk meer onderwerpen zijn dan we inline laten zien.
  const expandChip = secondaryOpts.length > 0
    ? { id: '__expand_options', label: `Bekijk alle onderwerpen`, variant: 'ghost' }
    : null
  const inlineChips = [...primaryOpts]
  // PortalChip komt vóór de expand-chip zodat 'Bekijk op dehofman.nl' visueel
  // naast de info-chips staat en niet ná 'Bekijk alle onderwerpen' (zou anders
  // verwarrend zijn — beide hebben "bekijk" in de label).
  if (portalChip) inlineChips.push(portalChip)
  if (expandChip) inlineChips.push(expandChip)
  if (temperature === 'hot' || temperature === 'warm') {
    return [callbackPrimary, ...inlineChips]
  }
  return [...inlineChips, callbackPlain]
}
function buildMoreInfoMessages(id, persona, opts = {}) {
  switch (id) {
    case 'location':
      return [{ kind: 'location', payload: { location: project.location, projectName: project.displayName } }]
    case 'sitePlan': {
      // Site-plan is een visueel rijke bubble waar de bezoeker per unit kan
      // tikken voor m², prijs en status. Bij de eerste vertoning gunnen
      // we 8 seconden om de plattegrond te scannen voor de chip-bar weer
      // verschijnt. Bij herhaling (bezoeker zag 'em al in de
      // availabilityCheck-flow vroeg in de chat) kennen ze de plattegrond
      // al, dus chips komen meteen, geen pauze nodig.
      const messages = [
        {
          // Projecten met een onregelmatige plattegrond leveren sitePlan.svg
          // en krijgen de polygon-renderer; de rest blijft het grid-schema.
          kind: project.sitePlan.svg ? 'site-plan-svg' : 'site-plan',
          payload: { sitePlan: project.sitePlan, units: project.units, persona },
        },
      ]
      if (!opts.sitePlanAlreadyShown) {
        messages.push({ kind: 'pause', ms: 8000 })
      }
      return messages
    }
    case 'gallery':
      return [{
        kind: 'gallery',
        payload: {
          // Persona-aware ordering: belegger ziet eerst exterieur (vastgoed-
          // perspectief), eigen-gebruiker eerst interieur (functioneel
          // perspectief). Elke bezoeker krijgt zo een eerste foto die
          // resoneert met z'n eigen reden van zoeken.
          //
          // project.sfeerbeelden override (optioneel per project): laat de
          // hero-carousel op IntroScreen kort zijn (alleen scherpe beelden)
          // terwijl de sfeerbeelden-bubble in de chat meer mag tonen. Fallback
          // op project.gallery voor projecten die geen aparte set hebben.
          images: orderGalleryForPersona(project.sfeerbeelden || project.gallery, persona),
          intro: 'Sfeerbeelden van de buitenkant en mogelijke inrichtingen.',
        },
      }]
    case 'highlights':
      return [{
        kind: 'highlights',
        payload: {
          highlights: project.highlights,
          intro: `Wat ${project.displayName} onderscheidt.`,
        },
      }]
    case 'price':
      return [{ kind: 'price', payload: { units: project.units, note: project.priceListNote } }]
    case 'priceCompare':
      return [{ kind: 'price-compare', payload: { priceComparison: project.priceComparison } }]
    case 'planning':
      return [{ kind: 'planning', payload: { planning: project.planning } }]
    case 'process':
      return [{ kind: 'process', payload: { steps: project.process } }]
    case 'brochure':
      return [{ kind: 'brochure', payload: { url: project.brochureUrl, hero: project.hero, projectName: project.displayName } }]
    case 'investor':
      return [{
        kind: 'investor',
        payload: {
          benefits: project.investorBenefits,
          investor: project.investor,
          intro: `Wat ${project.displayName} voor beleggers interessant maakt.`,
        },
      }]
    default:
      return []
  }
}
// tel-link voor de header en cta-card. Strip alles behalve cijfers en plus.
function buildPhoneLink(num) {
  if (!num) return null
  const cleaned = String(num).replace(/[^\d+]/g, '')
  return `tel:${cleaned}`
}
function isValidPhoneText(text) {
  const stripped = (text || '').replace(/[\s-]/g, '')
  return /^(?:\+316\d{8}|316\d{8}|06\d{8})$/.test(stripped)
}
// Track lead-velden zodra ze voor het eerst herkend zijn, ongeacht in welke
// stap. Wanneer een bezoeker bv. naam en mailadres in dezelfde input geeft,
// vuren we beide events los van elkaar.
function trackNewLeadFields(prevDraft, newDraft) {
  if (newDraft.email && newDraft.email !== prevDraft.email) {
    trackEvent('lead-email:submitted', { email: newDraft.email })
    // Meta Pixel Lead-event ALLEEN bij eerste email-capture. Phone/name
    // worden wel intern getrackt voor onze analytics maar niet als
    // extra Lead naar Meta — voorkomt 2-3x tellen per lead.
    fireMetaLead('email', { hasName: !!newDraft.firstName })
  }
  if (newDraft.firstName && newDraft.firstName !== prevDraft.firstName) {
    trackEvent('lead-name:submitted', { firstName: newDraft.firstName })
  }
  if (newDraft.phone && newDraft.phone !== prevDraft.phone) {
    trackEvent('lead-phone:submitted', { phone: newDraft.phone })
  }
}
function capitalize(s) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
// Vuurt een Meta Pixel-event af met een unieke event-ID zodat de browser-
// Pixel niet dubbel telt met server-side CAPI. Faalt stil als de Pixel
// niet geladen is (consent geweigerd, script geblokkeerd, etc.).
//
// Conversie-discipline (2026-05-26):
//   - "Lead"    = ALLEEN bij eerste email-capture. Echte conversie.
//   - "Contact" = warm-handoff intent (callback-chip). Hoog intent, geen
//                 nieuwe lead — bezoeker had email al gegeven.
//   - Custom    = portal-tap en andere micro-conversies. Trackbaar voor
//                 ons in Ads Manager, maar geen "Lead" optimalisatie-
//                 signaal richting Meta.
//
// Door Lead-events te beperken tot daadwerkelijke email-conversies
// optimaliseert Meta's algoritme op het juiste doelpubliek. Voorheen
// telden phone, callback-clicks en portal-clicks ook als Lead, wat
// zorgde voor 1-4 Lead-events per echte lead en vervuilde signalen.
function fireMetaPixelEvent(eventName, reason, extra = {}, isCustom = false) {
  if (typeof window === 'undefined') return
  if (typeof window.fbq !== 'function') return
  try {
    const eventId = `${eventName.toLowerCase()}-${reason}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    window.fbq(
      isCustom ? 'trackCustom' : 'track',
      eventName,
      { content_name: reason, ...extra },
      { eventID: eventId },
    )
  } catch {
    // Pixel-fouten mogen de UX nooit blokkeren.
  }
}

function fireMetaLead(reason, extra = {}) {
  fireMetaPixelEvent('Lead', reason, extra)
}

function fireMetaContact(reason, extra = {}) {
  fireMetaPixelEvent('Contact', reason, extra)
}

function fireMetaCustom(eventName, reason, extra = {}) {
  fireMetaPixelEvent(eventName, reason, extra, true)
}
// Lichtgewicht string-hash (DJB2 variant). Gebruikt om copy-variaties
// deterministisch te kiezen op basis van session-id, zodat zelfde bezoeker
// steeds dezelfde nudge-tekst ziet maar nieuwe sessies wel afwisseling
// krijgen. Geen crypto-eis, geen botsings-zorg — alleen verdeling.
function hashString(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return h | 0
}
// Persona-aware sortering van de gallery. Belegger ziet eerst exterieur
// (vastgoed-perspectief: hoe ziet het pand er uit, ligging), eigen-gebruiker
// eerst interieur (hoe gebruik ik dit als bedrijfsruimte). Voorkomt dat
// elke bezoeker steeds dezelfde eerste foto ziet en sluit aan bij waarom
// ze hier zijn. Onbekende persona valt terug op originele volgorde.
function orderGalleryForPersona(gallery, persona) {
  if (!Array.isArray(gallery) || gallery.length === 0) return gallery
  const isExterior = (img) => /hero|exterieur/i.test(img.src || '')
  const isInterior = (img) => /unit|werkplaats|showroom|studio/i.test(img.src || '')
  const exteriors = gallery.filter(isExterior)
  const interiors = gallery.filter(isInterior)
  const others = gallery.filter((g) => !isExterior(g) && !isInterior(g))
  if (persona === 'belegger') return [...exteriors, ...interiors, ...others]
  if (persona === 'eigen_gebruiker') return [...interiors, ...exteriors, ...others]
  // beide / onbekend / huurder: alterneer (interleave) zodat elke veeg
  // afwisselt tussen exterieur en interieur — meeste visuele variatie.
  if (persona === 'beide') {
    const mixed = []
    const max = Math.max(interiors.length, exteriors.length)
    for (let i = 0; i < max; i++) {
      if (interiors[i]) mixed.push(interiors[i])
      if (exteriors[i]) mixed.push(exteriors[i])
    }
    return [...mixed, ...others]
  }
  return gallery
}
// Hoe lang we wachten voordat de volgende bot-bubble verschijnt. Korter voor
// korte tekst, langer voor lange tekst en rich cards. Levert een typing-bubble
// gevoel zonder te traag te worden.
function computeReleaseDelay(message) {
  if (!message) return 500
  // Pause-kind: expliciete delay-marker. Wordt door RELEASE_NEXT niet als
  // bubble gerendered, alleen gebruikt om tijd te kopen tussen bubbles.
  if (message.kind === 'pause') return Math.max(0, message.ms || 0)
  if (message.kind === 'bot-text') {
    // Bandbreedte verhoogd voor rustiger ritme tussen opeenvolgende bot-
    // bubbles. Kortste delay 700ms, langste 1500ms (was 450-900ms). Per
    // karakter +12ms ipv +9ms zodat lange zinnen daadwerkelijk leestijd
    // krijgen voor de volgende bubble verschijnt.
    const len = message.text?.length || 30
    return Math.max(700, Math.min(1500, 500 + len * 12))
  }
  // Rich cards en interactieve bubbles vragen iets meer aandacht. Lijst is
  // synchroon met ChatThread renderkinds; nieuwe rich bubbles hier toevoegen.
  if (['site-plan', 'site-plan-svg', 'usp-cards', 'unit-card', 'gallery', 'investor', 'price', 'price-compare', 'location', 'cta-card', 'warm-handoff', 'service-card', 'brochure', 'highlights', 'process', 'planning', 'content-card'].includes(message.kind)) {
    return 700
  }
  return 500
}
function isAdminRoute() {
  if (typeof window === 'undefined') return false
  return window.location.pathname.startsWith('/admin')
}
export default function App() {
  if (isAdminRoute()) return <AdminScreen />
  return <Demo />
}
function Demo() {
  const [state, dispatch] = useReducer(reducer, initial, (init) => {
    const loaded = loadPersisted()
    if (loaded) {
      return {
        ...init,
        ...loaded,
        behaviors: { ...EMPTY_BEHAVIORS, ...(loaded.behaviors || {}) },
        messageQueue: [],
        debugOpen: false,
        // Forceer 'chat' ook voor terugkerende bezoekers: een eventueel
        // opgeslagen view:'intro' (uit de A/B-test-periode) mag de startpagina
        // niet meer laten verschijnen. De chat-historie blijft gewoon intact.
        view: 'chat',
      }
    }
    // Cold start: iedereen landt direct op de chat (geen IntroScreen meer).
    // De getOrAssignIntroVariant-call blijft staan in de useEffect hieronder
    // zodat de Plausible-variantmeting niet stuk gaat; de view-keuze is hier
    // geforceerd op 'chat'. start() wordt door de auto-start-effect
    // aangeroepen om de eerste bot-bubble te queuen.
    return { ...init, view: 'chat' }
  })
  const [answersOpen, setAnswersOpen] = useState(false)
  const [optionsSheetOpen, setOptionsSheetOpen] = useState(false)
  const [credionConfirmOpen, setCredionConfirmOpen] = useState(false)
  const [showRescue, setShowRescue] = useState(false)
  const chatActive = state.view === 'chat'
  const flowComplete = state.messages.some((m) => m.kind === 'cta-card')
  // Peiling-modus: geen verkoop-rescue/exit-nudges (die verwijzen naar een
  // Reppit-WhatsApp-assistent die er voor een peiling niet is) en geen
  // verkoop-progressbalk. Gated zodat andere tenants ongewijzigd blijven.
  const isSurvey = !!project.flowOverrides?.surveyFlow
  // Smart resume: bezoeker komt terug na ≥4u in onvoltooide chat MET
  // progressie (≥1 beantwoorde vraag). Banner toont count zodat user
  // weet wat er bewaard is — geen lege belofte bij nul antwoorden.
  const { offerResume, ageMs, answersCount, dismissResume } = useSmartResume(chatActive && !flowComplete)
  // Inactiviteit rescue: 30s niets gedaan → floating nudge.
  useInactivityRescue({
    active: chatActive && !flowComplete && !showRescue && !isSurvey,
    onTrigger: () => setShowRescue(true),
  })
  // Exit intent: cursor verlaat top of tab gaat hidden → why-leaving prompt.
  // Alleen actief als bezoeker iets heeft gedaan en nog niet voltooid is —
  // anders is het te invasief op een verse pageview.
  const exitActive = chatActive && !flowComplete && !isSurvey && Object.keys(state.answers).length >= 2
  const { showPrompt: showExitPrompt, dismiss: dismissExitPrompt } = useExitIntent({ active: exitActive })
  // Bewaart de currentQuestion van vóór een lead-edit zodat we na het
  // bijwerken van email/naam/06 terug kunnen naar waar de bezoeker was.
  const [editReturnQuestion, setEditReturnQuestion] = useState(null)
  // Bewaart de WhatsApp-summary en de plek waar de bezoeker was, wanneer
  // we een WA-klik onderbreken om eerst de naam op te halen. Na de naam
  // bouwen we de WA-link met de juiste naam en openen 'm alsnog.
  const [pendingWa, setPendingWa] = useState(null)
  // Portal-token: identificeert de bezoeker bij dehofman.nl zodat ze automatisch
  // ingelogd zijn als ze vanaf de CLP doorklikken. Hydrate uit sessionStorage zodat
  // de token een soft reload overleeft. Edge function "lead-upsert" levert deze
  // token terug op pushLead-responses en we updaten 'm dan via .then() op pushSnapshot.
  const [portalToken, setPortalToken] = useState(() => {
    if (typeof window === 'undefined') return null
    try {
      return window.sessionStorage.getItem('clp-portal-token') || null
    } catch {
      return null
    }
  })
  // Bouwt de portal-URL waar we naartoe linken vanaf cta-cards en warm-handoff
  // bubbles. Met token = auto-login op dehofman.nl. Zonder token = kale portal-URL
  // (bezoeker krijgt dan het guest-view en kan zelf een sessie starten).
  const portalUrlForCta = portalToken
    ? `${project.portalUrl}?t=${portalToken}`
    : project.portalUrl
  useEffect(() => {
    if (state.view === 'chat') persist(state)
  }, [state])
  // Sequential bot-bubble reveal. Eén bot-bericht per tick, met delay op basis
  // van de inhoud. De bezoeker ziet de typing-indicator onderaan zolang de queue
  // nog items heeft, en de chip-bar verschijnt pas als de laatste vraag is
  // verschenen. Voorkomt dat de vraag onder het scherm valt achter rich cards.
  useEffect(() => {
    const queue = state.messageQueue || []
    if (queue.length === 0) return
    const next = queue[0]
    const delay = computeReleaseDelay(next)
    const t = setTimeout(() => dispatch({ type: 'RELEASE_NEXT' }), delay)
    return () => clearTimeout(t)
  }, [state.messageQueue?.length])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('debug') === '1') dispatch({ type: 'TOGGLE_DEBUG' })
    // Marketing-herkomst vastleggen zolang de utm-params nog in de URL staan.
    // Moet vóór de eerste conversie gebeuren; pushLead leest 'm later terug.
    captureAttribution()
    // IP-detectie zodat eventuele uitsluiting van team-traffic werkt.
    // Faalt-soft als netwerk weigert; gewoon doorgaan met tracking aan.
    detectCurrentIp().catch(() => {})
  }, [])
  // Document-title per project. index.html heeft een generieke default
  // ("REPP — brochure en prijzen") en hier overschrijven we 'm runtime
  // op basis van project.displayName zodat bezoekers de juiste tab-titel
  // zien. OG-tags blijven nog wel uit de initial HTML komen (crawlers
  // executen geen JS) — dat is een latere refactor.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const name = project.displayName || project.name || 'REPP'
    // Peiling (surveyFlow) verkoopt niks, dus geen "brochure en prijzen"-
    // suffix; andere tenants houden de bestaande tab-titel.
    document.title = project.flowOverrides?.surveyFlow ? name : `${name}, brochure en prijzen`
  }, [])
  const persona = derivePersona(state.answers)
  const score = computeScore(state.answers)
  const stage = deriveStage(state.answers)
  const temperature = deriveTemperature(stage)
  const buying = computeBuyingSignals(state.answers, state.behaviors)
  // De handoff bubble is "actief" zodra hij getoond is en de bezoeker nog
  // niets heeft gekozen. Tijdens deze fase verbergen we chip-bar, input en
  // header-shortcuts zodat de bubble zelf de enige interactie is.
  //
  // Belangrijke ontwerp-keuze (mei 2026): de warm-handoff bubble komt nu
  // ALLEEN op expliciete chip-keuze van de bezoeker — we firen 'm niet
  // meer automatisch op basis van een score-drempel. Reden: bezoekers
  // ervoeren de auto-trigger als abrupt en marketing-achtig. De score-engine
  // blijft draaien voor sales-priorisering (Slack-ping) en voor visuele
  // chip-prominentie (de callback-chip krijgt een primary-
  // styling bij temperature >= warm), maar de UI-trigger is volledig
  // user-pulled.
  const warmHandoffActive = !!state.behaviors?.warmHandoffShown && !state.behaviors?.warmHandoffOutcome
  // Legacy: bestaande sessies in localStorage kunnen nog een service-card-
  // bubble hebben uit de oude flow. Detect 'em zodat de UI-blokkering klopt
  // bij replay. Nieuwe sessies maken geen service-cards meer aan.
  const serviceCardActive = state.messages.some((m) => m.kind === 'service-card' && !m.payload?.outcome)
  // Slack hot-lead notificatie. Triggert alleen bij een expliciete callback-
  // aanvraag, niet meer op behavioral score-thresholds. Bron: bezoeker heeft
  // op de "Laat de makelaar mij bellen" chip of op de callback-knop in de
  // warm-handoff-bubble gedrukt, waardoor warmHandoffOutcome op 'callback'
  // staat. Eis 06 zodat sales daadwerkelijk kan bellen. Slack-helper dedupet
  // op sessionId via localStorage zodat een page-reload niet herfire't.
  //
  // De buying.score blijft in de payload meegestuurd zodat sales context
  // heeft over hoe gekwalificeerd de aanvraag is, maar de score zelf is geen
  // trigger meer. Dit voorkomt false-positives uit slider-tikkers en
  // speed-clickers die nooit om contact vragen.
  useEffect(() => {
    if (state.view !== 'chat') return
    if (state.behaviors?.warmHandoffOutcome !== 'callback') return
    const lead = state.answers.lead || {}
    if (!lead.phone) return
    notifyHotLead({
      sessionId: getSessionId(),
      firstName: lead.firstName,
      email: lead.email,
      phone: lead.phone,
      persona: buying.inferredPersona !== 'onbekend' ? buying.inferredPersona : persona,
      temperature: 'hot',
      score: buying.score,
      signals: buying.signals.map((s) => ({ id: s.id, label: s.label, weight: s.weight })),
      intent: state.answers.intent?.label,
      size: state.answers.size?.label,
      timeline: state.answers.timeline?.label,
      trigger: 'callback-requested',
      source: `clp-${project.id || 'unknown'}`,
    })
  }, [
    state.view,
    state.behaviors?.warmHandoffOutcome,
    state.answers.lead?.phone,
  ])
  // Sticky copy-variant voor flow-questions (intent/brochureTrigger/timeline).
  // Onafhankelijk van CTA-variant voor de IntroScreen-knop, zodat we
  // beide A/B-experimenten orthogonaal kunnen analyseren in Plausible.
  const copyVariant = getOrAssignVariant()
  // Naam van de financieringspartner per project. De Hofman = Credion, De
  // Paveri toont een generieke vastgoedfinancieringspartner (geen
  // bedrijfsnaam in de bezoeker-copy). Alle bot-text en CTA-labels die
  // verwijzen naar de partner gebruiken deze constante zodat we niet meer
  // hardcoded "Credion" door de codebase hoeven door te zetten. Interne
  // analytics-event-keys en variabelen heten nog steeds 'credion*' voor
  // backwards-compat met bestaande dashboards.
  const financePartner = project.financing?.partner || 'Credion'
  // Supabase lead-upsert: synchroniseert de actuele state als één snapshot
  // naar de Edge Function. Idempotent dankzij upsert op (source, session_id),
  // dus we mogen dit meerdere keren in de flow aanroepen — elke call upsert
  // de meest recente snapshot. Achter een feature-flag (VITE_SUPABASE_ENABLED);
  // zolang die op false staat is dit een no-op en wordt geen fetch gedaan.
  //
  // Wordt aangeroepen op de natuurlijke checkpoints:
  //  - finishLead (lead-gegevens binnen)
  //  - timeline-answer (qualification compleet)
  //  - flow:complete momenten (followup-keuze, all-seen wrap-up, rent-match)
  function pushSnapshot(extraConsents = [], freshLead = null) {
    if (!isApiConfigured()) return // master-switch uit of env-vars ontbreken
    // freshLead override is voor finishLead-callsite waar de lead-arg al
    // bekend is maar React-state nog niet via de async dispatch is bijgewerkt.
    // Andere callers (timeline, followup, etc.) lopen ná finishLead, dan
    // klopt state.answers.lead al en kan de fallback gebruikt worden.
    const lead = freshLead || state.answers.lead || {}
    // Email-gate: alleen leads met minimaal e-mailadres landen in Supabase.
    // Voorkomt anonieme/onbruikbare rijen in het CRM (bezoekers die vóór
    // lead-capture afhaken, sessiestart-consent zonder lead, etc.). Dropoff-
    // analyse blijft beschikbaar via Plausible — daar hoort het thuis.
    if (!lead.email) return
    const session = {
      sessionId:    getSessionId(),
      events:       [],
      startedAt:    null,
      lastEventAt:  Date.now(),
      completed:    !!state.answers.followup,
      persona,
      lead: {
        firstName: lead.firstName ?? null,
        email:     lead.email ?? null,
        phone:     lead.phone ?? null,
      },
      ctaVariant:         null,
      stage,
      followup:           state.answers.followup?.label ?? null,
      afhaakReason:       state.answers.afhaakReason?.label ?? null,
      handoffShown:       !!state.behaviors?.warmHandoffShown,
      handoffOutcome:     state.behaviors?.warmHandoffOutcome ?? null,
      handoffTemperature: temperature,
      handoffPersona:     buying.inferredPersona,
    }
    pushLead(session, {
      score:       buying.score,
      temperature: buying.temperature,
      intent_id:   state.answers.intent?.id ?? null,
      size_id:     state.answers.size?.id ?? null,
      timeline_id: state.answers.timeline?.id ?? null,
      attributes: {
        // Marketing-herkomst zoals vastgelegd bij binnenkomst. Zelfde shape als
        // de portal wegschrijft, zodat het CRM één weergave heeft. Blijft weg
        // als er geen herkomst-signaal in de URL zat (directe bezoeker).
        ...(getAttribution() ? { attribution: getAttribution() } : {}),
        buyingSignals: buying.signals.map((s) => s.id),
        moreInfoSeen:  state.moreInfoSeen,
        rentRange:     state.answers.rentRange?.id ?? null,
        // Bouwgrond-oppervlakte uit de peiling-M2Meter (BREDA). Alleen aanwezig
        // als de bezoeker de bouwgrond-tak liep; brevo.ts forwardt 'm naar
        // GROND_M2. Andere tenants hebben geen answers.grondM2, dus deze key
        // verschijnt daar nooit → snapshot-shape blijft identiek.
        ...(typeof state.answers.grondM2?.value === 'number' ? { grondM2: state.answers.grondM2.value } : {}),
        // Bedrijfsnaam uit de BREDA-peiling lead-form. Alleen aanwezig als de
        // survey-variant 'em ophaalde; brevo.ts forwardt 'm naar COMPANY.
        ...(lead.company ? { company: lead.company } : {}),
        // Unit-signaal niet apart meesturen: size_id (hierboven) landt al in
        // de Brevo SIZE-attribute, bv. Hofman "Rond 192 m²" → "rond_192" = XXL.
        // Sales ziet de gewenste unit dus via SIZE.
        // leadVariant: sub-doelgroep binnen hetzelfde crmProject. Wordt
        // door brevo.ts in lead-upsert gebruikt om naar een alt-list te
        // routeren (bv. PIER14 nauticGate=nee → 'not_nautical' → lijst #300
        // ipv default PIER14-lijst). Default null = standaard project-list.
        leadVariant:   state.behaviors?.leadVariant ?? null,
        flags: {
          credionRequested:   !!state.behaviors?.credionRequested,
          rentMatchRequested: !!state.behaviors?.rentMatchRequested,
          rendementInfoShown: !!state.behaviors?.rendementInfoShown,
        },
      },
      consents: extraConsents,
    }).then((res) => {
      // Edge function geeft een portal_token terug bij succesvolle upsert.
      // Pak 'm op zodat we vanaf nu portal-links met ?t= kunnen bouwen en
      // de bezoeker dus automatisch ingelogd op dehofman.nl landt.
      //
      // pushLead wrapt de Edge Function-response als { ok, queued, result }.
      // De daadwerkelijke server-payload (en dus portal_token) zit op
      // res.result, niet op res direct. Bij skipped (feature-flag uit) of bij
      // een gequeued-bij-netwerkfout response is res.result undefined.
      const newToken = res?.result?.portal_token
      if (newToken && newToken !== portalToken) {
        setPortalToken(newToken)
        try {
          window.sessionStorage.setItem('clp-portal-token', newToken)
        } catch {
          // sessionStorage kan vol/dicht staan — niet erg, token leeft dan alleen in-memory.
        }
      }
    }).catch((err) => {
      // pushLead vangt zelf 4xx/5xx + queue af; eventuele uncaught errors
      // mogen de chat-flow niet onderbreken. Log voor debugging.
      console.warn('[pushSnapshot] failed', err)
    })
  }
  // Bij app-mount + zodra het netwerk weer up is: probeer de localStorage
  // retry-queue te legen. Werkt alleen als de feature-flag aan staat (anders
  // skipt flushPending zelf). Geen useEffect-deps nodig — de helpers zijn
  // pure functies die de queue-state uit localStorage halen.
  useEffect(() => {
    flushPending().catch(() => {})
    if (typeof window === 'undefined') return
    const onOnline = () => { flushPending().catch(() => {}) }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  // Supabase analytics: queue-flush op interval + pagehide + online.
  // Skipt zichzelf als VITE_SUPABASE_ANALYTICS_ENABLED!='true'.
  useEffect(() => {
    const detach = attachEventsAutoFlush()
    return detach
  }, [])

  // Top-of-funnel tracking: leg ook bezoeken vast die nooit op de CTA
  // klikken. intro:viewed fired eenmalig per browser-sessie (alleen als de
  // chat nog niet eerder begonnen is); intro:bounced fired bij pagehide
  // wanneer de chat nog steeds niet gestart is. Beide via sendBeacon-vriendelijke
  // pushEvent zodat het ook aankomt als de tab al weg klikt.
  //
  // Skipt voor de hervat-flow (state.messages.length > 0) want dan zit de
  // bezoeker al midden in een chat en is bouncen geen "cold drop-off".
  useEffect(() => {
    if (state.view !== 'intro' || state.messages.length > 0) return
    if (typeof window === 'undefined') return
    const introStartedAt = Date.now()
    let bounced = false
    let started = false

    // Bron-attributie: utm-params hebben voorrang (expliciet door ads-tool
    // ingesteld), referrer als fallback. Hostname van current url voor
    // multi-tenant tracking. Alles compact in 1 event zodat de
    // analytics-pipeline 't met één query kan groeperen.
    const params = new URLSearchParams(window.location.search)
    trackEvent('intro:viewed', {
      copyVariant,
      referrer:     document.referrer || null,
      utm_source:   params.get('utm_source')   || null,
      utm_medium:   params.get('utm_medium')   || null,
      utm_campaign: params.get('utm_campaign') || null,
      utm_content:  params.get('utm_content')  || null,
      url_host:     window.location.hostname || null,
    })

    function maybeBounce() {
      if (bounced || started) return
      bounced = true
      const dwellMs = Date.now() - introStartedAt
      // Skip ultra-korte bounces (<300ms) — meestal pre-render / bot.
      if (dwellMs < 300) return
      try {
        trackEvent('intro:bounced', { copyVariant, dwellMs })
      } catch {}
    }

    // 'started' marker zodra de CTA-klik leidt tot view !== 'intro'.
    // We detecteren de overgang via een MutationObserver-vrije check
    // door simpelweg de globale state-handler. Maar makkelijker: bij
    // unmount weten we dat 't ofwel een nav-away is ofwel een view-switch.
    // Pagehide is reliable cross-browser voor unload-events.
    function onPageHide() { maybeBounce() }
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') maybeBounce()
    }
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      // Cleanup loopt wanneer view wisselt of component unmount.
      // Als view !== 'intro' = chat is gestart, dan was 't géén bounce.
      started = true
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  // Bewust alleen op view + messages.length — copyVariant verandert na mount
  // niet, dus geen re-fire-risico bij toggles.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view, state.messages.length])

  const start = (variant, options = {}) => {
    // typeFirst (default false): laat ook de eerste begroeting via de
    // typing-queue verschijnen ipv direct in beeld. Gebruikt door de
    // 'skip'-arm van het intro-A/B (auto-start zonder CTA-klik) — daar
    // voelt een korte typing-pauze meer als een conversatie die opstart.
    // De 'show'-arm klikt actief op "Start chat" en krijgt typeFirst=false
    // zodat de bubble meteen verschijnt en de klik niet laggy aanvoelt.
    const { typeFirst = false } = options
    // Hervat-pad: bezoeker kwam via het header-logo terug naar intro met
    // chat-historie nog intact. We schakelen alleen view om en bewaren de
    // bestaande sessie + alle antwoorden zodat de chat verder loopt waar
    // 'ie was. Geen nieuwe sessionId, geen tweede session-start tracking.
    if (state.messages.length > 0) {
      trackEvent('intro:resume-clicked', { variant, copyVariant })
      dispatch({ type: 'RESUME_CHAT' })
      return
    }
    // Cold start: eerste keer dat deze browser de chat opent.
    startNewSession()
    trackEvent('session:start', { variant, copyVariant })
    trackEvent('intro:cta-clicked', { variant, copyVariant })
    logSessionStartConsent()
    dispatch({ type: 'START_CHAT', bot: project.salesTeam?.bot, copyVariant, typeFirst })
  }
  // IntroScreen is uitgefaseerd: iedere bezoeker landt direct in de chat.
  // We loggen de oude introVariant-toewijzing nog wel zodat lopende Plausible-
  // dashboards niet stuk gaan, maar de view-keuze is geforceerd op 'chat'
  // in de useReducer-initializer. start() detecteert cold-start (geen messages
  // → nieuwe sessie + START_CHAT) versus hervat (messages aanwezig na een
  // persisted reload → RESUME_CHAT zonder de welkomst-bubbles te herbouwen).
  useEffect(() => {
    const introVariant = getOrAssignIntroVariant()
    try { trackEvent('intro:variant-assigned', { introVariant }) } catch {}
    if (state.messages.length === 0) {
      start(undefined, { typeFirst: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Klik op REPP-logo in de header: sinds de startpagina is uitgefaseerd
  // navigeert het logo nergens meer naartoe. We loggen de klik nog wel als
  // engagement-signaal, maar de bezoeker blijft in de chat.
  const onLogoClick = () => {
    if (state.view !== 'chat') return
    trackEvent('header:logo-clicked', { messagesCount: state.messages.length })
  }
  // Helper: maakt een answer-value met _msgCountBefore zodat ROLLBACK
  // weet tot waar in de messages array geknipt moet worden.
  const answerValue = (opt) => ({
    ...opt,
    _msgCountBefore: state.messages.length,
  })
  // User-bubble gaat direct, bot-bubbles in de release-queue zodat ze met
  // typing-pauzes verschijnen. Voorkomt dat een vraag direct na een rich card
  // onder het scherm valt.
  const sendSequence = (userText, botMessages = []) => {
    const append = []
    if (userText !== null && userText !== undefined) {
      append.push({ kind: 'user-text', text: userText })
    }
    if (append.length > 0) {
      dispatch({ type: 'APPEND', messages: append })
    }
    if (botMessages.length > 0) {
      dispatch({ type: 'ENQUEUE', messages: botMessages })
    }
  }
  // Peiling-sequencer (BREDA). Alleen actief als het project
  // flowOverrides.surveyFlow zet. Eén gated code-pad dat de survey-vragen
  // afhandelt en langs SURVEY_CHIP_KEYS advanceert. Voor projecten zonder
  // surveyFlow wordt dit nooit geraakt en blijft onChipPick ongewijzigd.
  const handleSurveyChip = (q, opt) => {
    const val = answerValue(opt)
    const sf = project.flowOverrides?.surveyFlow || {}
    if (q === 'werkruimte') {
      trackEvent('survey:answered', { key: 'werkruimte', id: opt.id })
      dispatch({ type: 'ANSWER', key: 'werkruimte', value: val, next: 'afmeting' })
      sendSequence(userTextFromOpt(opt), [{ kind: 'bot-text', text: flow.questions.afmeting.label }])
      return
    }
    if (q === 'afmeting') {
      // Alleen bij 'meer_500' de conditionele grondVraag; anders direct doel.
      trackEvent('survey:answered', { key: 'afmeting', id: opt.id })
      const next = opt.id === 'meer_500' ? 'grondVraag' : 'branche'
      dispatch({ type: 'ANSWER', key: 'afmeting', value: val, next })
      sendSequence(userTextFromOpt(opt), [{ kind: 'bot-text', text: flow.questions[next].label }])
      return
    }
    if (q === 'grondVraag') {
      // leadVariant per keuze → Brevo-lijstrouting (bouwgrond → 'bouwgrond',
      // ontwikkeld → null default project-lijst).
      dispatch({ type: 'BEHAVIOR_SET_LEAD_VARIANT', variant: opt.leadVariant ?? null })
      trackEvent('survey:answered', { key: 'grondVraag', id: opt.id })
      dispatch({ type: 'ANSWER', key: 'grondVraag', value: val, next: 'branche' })
      sendSequence(userTextFromOpt(opt), [{ kind: 'bot-text', text: flow.questions.branche.label }])
      return
    }
    if (q === 'doel') {
      // Onder key 'intent' opslaan zodat derivePersona de persona oppikt.
      trackEvent('survey:answered', { key: 'doel', id: opt.id, persona: opt.persona })
      dispatch({ type: 'ANSWER', key: 'intent', value: val, next: 'werkruimte' })
      sendSequence(userTextFromOpt(opt), [{ kind: 'bot-text', text: flow.questions.werkruimte.label }])
      return
    }
    if (q === 'branche') {
      // Vrije-tekst-escape: bij 'anders' NIET advancen, maar om de branche
      // vragen via een tekst-input (currentQuestion 'brancheAnders'). De
      // gettypte waarde wordt in onChatInputSend als branche-antwoord opgeslagen.
      if (opt.id === 'anders') {
        trackEvent('survey:answered', { key: 'branche', id: 'anders' })
        dispatch({ type: 'SET_QUESTION', next: 'brancheAnders' })
        sendSequence(userTextFromOpt(opt), [{ kind: 'bot-text', text: 'In welke branche ben je actief?' }])
        return
      }
      trackEvent('survey:answered', { key: 'branche', id: opt.id })
      dispatch({ type: 'ANSWER', key: 'branche', value: val, next: 'wanneer' })
      sendSequence(userTextFromOpt(opt), [{ kind: 'bot-text', text: flow.questions.wanneer.label }])
      return
    }
    const linear = { wanneer: 'budget', budget: 'financiering' }
    if (linear[q]) {
      const next = linear[q]
      trackEvent('survey:answered', { key: q, id: opt.id })
      dispatch({ type: 'ANSWER', key: q, value: val, next })
      sendSequence(userTextFromOpt(opt), [{ kind: 'bot-text', text: flow.questions[next].label }])
      return
    }
    if (q === 'financiering') {
      trackEvent('survey:answered', { key: 'financiering', id: opt.id })
      dispatch({ type: 'ANSWER', key: 'financiering', value: val, next: 'lead-form' })
      sendSequence(userTextFromOpt(opt), [
        { kind: 'bot-text', text: sf.leadIntro || 'Tot slot je gegevens, dan houden we je op de hoogte.' },
        { kind: 'lead-form', payload: { variant: 'survey' } },
      ])
      return
    }
  }
  // Vrije-tekst-antwoord op de branche 'anders, namelijk'-escape. Slaat de
  // getypte branche op als branche-antwoord en gaat door naar wanneer. Alleen
  // bereikbaar in survey-modus (gated in onChatInputSend).
  function handleSurveyBrancheAnders(text) {
    const typed = (text || '').trim()
    if (!typed) {
      sendSequence(text, [{ kind: 'bot-text', text: 'Kun je kort je branche typen?' }])
      return
    }
    trackEvent('survey:answered', { key: 'branche', id: 'anders', value: typed })
    const answer = { id: 'anders', label: typed, value: typed, _msgCountBefore: state.messages.length }
    dispatch({ type: 'ANSWER', key: 'branche', value: answer, next: 'wanneer' })
    sendSequence(typed, [{ kind: 'bot-text', text: flow.questions.wanneer.label }])
  }
  // M2MeterBubble-submit — dormant. De peiling dispatcht geen m2-meter meer
  // (de bouwgrond-fork loopt nu via grondVraag met chips), dus dit pad wordt
  // niet meer geraakt. De handler blijft staan zodat de ChatThread-prop en de
  // grondM2/GROND_M2-plumbing in pushSnapshot + brevo.ts onschadelijk dormant
  // blijven zonder andere tenants te breken.
  const onM2Submit = (value) => {
    trackEvent('survey:answered', { key: 'grondM2', value })
    const answer = { id: 'grondM2', label: `± ${value} m²`, value, _msgCountBefore: state.messages.length }
    dispatch({ type: 'ANSWER', key: 'grondM2', value: answer, next: 'doel' })
    sendSequence(`± ${value} m²`, [{ kind: 'bot-text', text: flow.questions.doel.label }])
  }
  const onChipPick = (opt) => {
    const q = state.currentQuestion
    if (!q) return
    // Gated peiling-pad: vangt alle survey-chipvragen af vóór de standaard
    // handlers. Nooit actief zonder project.flowOverrides.surveyFlow.
    if (project.flowOverrides?.surveyFlow && SURVEY_CHIP_KEY_SET.has(q)) {
      return handleSurveyChip(q, opt)
    }
    if (q === 'intent') {
      const personaNext = opt.persona || 'onbekend'
      trackEvent('intent:answered', { id: opt.id, label: opt.label, persona: personaNext })
      // Huur-intentie: De Hofman is een koop-project, dus wij kanaliseren
      // huur-interesse direct naar de rent-match queue. Geen availability,
      // geen brochure-ja, geen size/timeline; meteen huurprijs-range vragen
      // zodat we beleggers in De Hofman die hun unit willen verhuren later
      // kunnen koppelen aan deze bezoeker.
      if (opt.id === 'huur' || personaNext === 'huurder') {
        // Projecten met nauticGate (PIER14): huur-leads moeten ook eerst de
        // branche-check door. Alleen nautische huurders kunnen ooit gematched
        // worden aan een belegger; niet-nautische huurders krijgen exit-flow.
        // Sturen via nauticGate; de nauticGate-handler detecteert intent='huur'
        // en routet daarna naar rentRange (ja) of exit-flow (nee).
        if (project.flowOverrides?.nauticGate?.enabled) {
          dispatch({ type: 'ANSWER', key: 'intent', value: answerValue(opt), next: 'nauticGate' })
          sendSequence(userTextFromOpt(opt), [
            { kind: 'bot-text', text: `Helder. ${project.displayName} is een koop-project; voordat we kijken wat we voor je kunnen doen, eerst nog dit:` },
            { kind: 'bot-text', text: flow.questions.nauticGate.label },
          ])
          return
        }
        // Default (Hofman/Paveri): direct naar rentRange, rent-match queue.
        // Project kan huur-leads naar een aparte Brevo-lijst routeren via
        // flowOverrides.rentLeadVariant (ELSTER: 'huurder' → lijst 304).
        // Andere projecten zetten dit niet en blijven ongemoeid.
        const rentVariant = project.flowOverrides?.rentLeadVariant
        if (rentVariant) dispatch({ type: 'BEHAVIOR_SET_LEAD_VARIANT', variant: rentVariant })
        dispatch({ type: 'ANSWER', key: 'intent', value: answerValue(opt), next: 'rentRange' })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: `Helder. ${project.displayName} is een koop-project, maar er zijn beleggers die hun unit verhuren. Met je voorkeur kunnen we je in de toekomst koppelen aan een belegger als er een match is.` },
          { kind: 'bot-text', text: flow.questions.rentRange.label },
        ])
        return
      }
      // Belegger-route (PIER14): bezoeker hoeft niet zelf nautisch te zijn,
      // mits 'ie een nautische huurder in de unit plaatst. Slaat de nautisch-
      // gate over en geeft direct de regel-uitleg + USP-cards. Project zet
      // flowOverrides.beleggerExplainer om dit aan te zetten (array van
      // bot-text strings); andere projecten zonder dit veld blijven via de
      // standaard gate-flow lopen.
      if ((personaNext === 'belegger' || personaNext === 'beide') && project.flowOverrides?.beleggerExplainer) {
        const explainerBubbles = (Array.isArray(project.flowOverrides.beleggerExplainer)
          ? project.flowOverrides.beleggerExplainer
          : [project.flowOverrides.beleggerExplainer])
          .map((text) => ({ kind: 'bot-text', text }))
        const cards = uspCardOrder(personaNext)
        dispatch({ type: 'ANSWER', key: 'intent', value: answerValue(opt), next: 'availabilityCheck' })
        sendSequence(userTextFromOpt(opt), [
          ...explainerBubbles,
          { kind: 'usp-cards', payload: { cards } },
          { kind: 'pause', ms: 8000, silent: true },
          { kind: 'pause', ms: 3000 },
          { kind: 'bot-text', text: flow.questions.availabilityCheck.label },
        ])
        return
      }
      // Project-specifieke branche-gate: PIER14 wil alleen maritieme/nautische
      // ondernemers, dus na intent vragen we eerst expliciet of de bezoeker
      // bij de doelgroep hoort. Default-projecten (Hofman/Paveri) hebben deze
      // gate uit en gaan direct door naar microIntro + USP-cards zoals voorheen.
      if (project.flowOverrides?.nauticGate?.enabled) {
        dispatch({ type: 'ANSWER', key: 'intent', value: answerValue(opt), next: 'nauticGate' })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: flow.questions.nauticGate.label },
        ])
        return
      }
      const microIntro = pickMicroIntro(personaNext)
      const cards = uspCardOrder(personaNext)
      dispatch({ type: 'ANSWER', key: 'intent', value: answerValue(opt), next: 'availabilityCheck' })
      // Flow van intent naar availabilityCheck met rustig ritme:
      //   1. microIntro (persona-specifieke welkomstzin)
      //   2. USP-carousel (overzichtskaarten, incl. A9-teaser)
      //   3. 8s silent-pauze voor scan door de carousel
      //   4. 3s typing-pauze zodat de availability-vraag niet uit het niets
      //      komt. De vraag heeft drie chips: ja-laat-zien, liever-niet,
      //      en vertel-meer-over-de-locatie (zie flow.questions.availabilityCheck).
      sendSequence(userTextFromOpt(opt), [
        { kind: 'bot-text', text: microIntro },
        { kind: 'usp-cards', payload: { cards } },
        { kind: 'pause', ms: 8000, silent: true },
        { kind: 'pause', ms: 3000 },
        { kind: 'bot-text', text: flow.questions.availabilityCheck.label },
      ])
      return
    }
    // Branche-gate (PIER14): "Ben je een nautisch ondernemer?"
    // Drie routes:
    //   ja      → ga door naar microIntro + USP + availabilityCheck (= wat
    //              intent-handler normaal doet)
    //   nee     → exit-flow: vriendelijk doorverwijzen + lead-capture voor
    //              eventuele contact-afspraak. Markeer als afhaak voor CRM.
    //   uitleg  → toon uitleg-bubble, blijf op nauticGate. De chip-filter
    //              onder in chipQuestion-setup verbergt 'uitleg' bij tweede
    //              pass via behaviors.nauticExplanationShown.
    if (q === 'nauticGate') {
      trackEvent('nautic-gate:answered', { id: opt.id, label: opt.label })
      // Huur-context detectie: als intent='huur' kwam de bezoeker via de
      // huur-tak naar nauticGate (zie intent-handler). Branche-check splitst
      // dan in nautische-huurder (lijst 303, rent-match capture) en niet-
      // nautische-huurder (exit-flow met aparte variant tag).
      const isRentIntent = state.answers.intent?.id === 'huur'
      if (opt.id === 'ja') {
        if (isRentIntent) {
          // Nautische huurder: PIER14 verhuurt niet maar we capturen toch
          // voor de rent-match queue. leadVariant 'rent_nautical' → Brevo
          // lijst 303 via BREVO_LIST_ID_PIER14_BUNIT_RENT_NAUTICAL.
          dispatch({ type: 'BEHAVIOR_SET_LEAD_VARIANT', variant: 'rent_nautical' })
          dispatch({ type: 'ANSWER', key: 'nauticGate', value: answerValue(opt), next: 'rentRange' })
          sendSequence(userTextFromOpt(opt), [
            { kind: 'bot-text', text: `Helder. ${project.displayName} is een koop-project en beleggers kunnen geen unit kopen voor verhuur. We bewaren je voorkeur wel — mocht er een keer een match komen dan nemen we contact op.` },
            { kind: 'bot-text', text: flow.questions.rentRange.label },
          ])
          return
        }
        const personaNow = state.answers.intent?.persona || persona || 'onbekend'
        const microIntro = pickMicroIntro(personaNow)
        const cards = uspCardOrder(personaNow)
        dispatch({ type: 'ANSWER', key: 'nauticGate', value: answerValue(opt), next: 'availabilityCheck' })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: microIntro },
          { kind: 'usp-cards', payload: { cards } },
          { kind: 'pause', ms: 8000, silent: true },
          { kind: 'pause', ms: 3000 },
          { kind: 'bot-text', text: flow.questions.availabilityCheck.label },
        ])
        return
      }
      if (opt.id === 'uitleg') {
        dispatch({ type: 'BEHAVIOR_NAUTIC_EXPLANATION_SHOWN' })
        // Project levert eigen uitlegtekst via flowOverrides.nauticGate.explanation.
        // Default-fallback is generiek over de maritieme sector.
        const explanation = project.flowOverrides?.nauticGate?.explanation
          || 'Een nautisch ondernemer is iemand met een bedrijf in de scheepvaart, watersport, jachtbouw, scheepsreparatie, maritieme dienstverlening of een aanverwante sector. Denk aan rederijen, jachthavens, scheepstoelevering, watersportwinkels of bootverhuur.'
        // currentQuestion blijft 'nauticGate' zodat de chip-bar terugkomt
        // (zonder uitleg-chip, die filter zit in chipQuestion-setup hieronder
        // en zwapt ook de chip-labels naar "Ik ben (geen) nautische ondernemer").
        // Twee vormen van explanation worden ondersteund:
        //   - Array van strings: elke string = 1 bubble. \n\n binnen een string
        //     wordt als paragraaf-break in dezelfde bubble gerenderd (via
        //     whitespace-pre-line in BotMessage). Geeft project controle over
        //     hoe het aantal bubbles en de indeling eruit ziet.
        //   - String: gesplitst op \n\n in losse bubbles (backward-compat).
        const explanationBubbles = (Array.isArray(explanation) ? explanation : explanation.split(/\n{2,}/))
          .map((s) => (typeof s === 'string' ? s.trim() : ''))
          .filter(Boolean)
          .map((text) => ({ kind: 'bot-text', text }))
        sendSequence(userTextFromOpt(opt), [
          ...explanationBubbles,
          { kind: 'bot-text', text: 'Nu je weet of je een nautisch ondernemer bent of niet, geef aan:' },
        ])
        return
      }
      // opt.id === 'nee' — exit-flow. Bezoeker hoort niet bij de doelgroep
      // maar we capture'n wel contact-gegevens zodat we kunnen doorverwijzen
      // naar andere projecten of regio's waar 'ie wél past.
      // Markeer als afhaak met reden 'not_branche' EN zet leadVariant op
      // 'not_nautical' zodat brevo.ts naar de aparte niet-nautisch-Brevo-
      // lijst routeert (BREVO_LIST_ID_PIER14_BUNIT_NOT_NAUTICAL=300) ipv
      // de default project-lijst.
      const exitMessage = project.flowOverrides?.nauticGate?.exitMessage
        || `Helaas past ${project.displayName} dan niet bij jou, dit project is specifiek voor maritieme/nautische ondernemers.`
      const exitReferral = project.flowOverrides?.nauticGate?.exitReferral
        || 'We kunnen je doorverwijzen naar andere REPP-bedrijfsunit-projecten in de regio. Laat hieronder je gegevens achter en we nemen contact op.'
      // Variant-tag bepaalt Brevo-lijst:
      //   not_nautical      → lijst 300 (koop-intent maar geen doelgroep)
      //   rent_not_nautical → lijst 303 (huur-intent + geen doelgroep)
      // Beide eindigen in dezelfde exit-flow met lead-capture + chat stopt.
      const exitVariant = isRentIntent ? 'rent_not_nautical' : 'not_nautical'
      dispatch({ type: 'BEHAVIOR_SET_LEAD_VARIANT', variant: exitVariant })
      dispatch({ type: 'ANSWER', key: 'afhaakReason', value: answerValue({ id: 'not_branche', label: 'Niet nautisch ondernemer', score: 0 }), next: 'lead-form' })
      sendSequence(userTextFromOpt(opt), [
        { kind: 'bot-text', text: exitMessage },
        { kind: 'bot-text', text: exitReferral },
        { kind: 'lead-form', payload: {} },
      ])
      return
    }
    // Live beschikbaarheid eerder in de flow: bezoeker ziet de situatietekening
    // voor het brochure-moment; dat geeft urgentie en concrete context.
    if (q === 'availabilityCheck') {
      trackEvent('availability-check:answered', { id: opt.id, label: opt.label })
      // Locatie-keuze: bezoeker wil eerst de plek zien voor 'ie kiest om
      // de plattegrond te bekijken of niet. Toon LocationBubble en stel de
      // availability-vraag opnieuw. currentQuestion blijft op
      // 'availabilityCheck' zodat de chips automatisch teruggekomen,
      // alleen zonder de locatie-optie (zie chipQuestion-filter onderaan).
      if (opt.id === 'locatie') {
        sendSequence(userTextFromOpt(opt), [
          { kind: 'location', payload: { location: project.location, projectName: project.displayName } },
          { kind: 'pause', ms: 5000, silent: true },
          { kind: 'pause', ms: 2500 },
          { kind: 'bot-text', text: flow.questions.availabilityCheck.label },
        ])
        return
      }
      const botMessages = []
      if (opt.id === 'ja') {
        botMessages.push(
          { kind: 'bot-text', text: `Hier zijn de ${countSitePlanUnits(project.sitePlan) || 'beschikbare'} units met de actuele status. Tik op een unit voor meer informatie over die unit.` },
          { kind: project.sitePlan.svg ? 'site-plan-svg' : 'site-plan', payload: { sitePlan: project.sitePlan, units: project.units, persona } },
          // Twee-fase wachten voor menselijk gevoel:
          //   silent 13s = bezoeker scant plattegrond in stilte, geen typing
          //                indicator zodat 't niet voelt alsof de bot druk
          //                is. Verlengd van 8 naar 13s zodat bezoekers ruim
          //                tijd hebben om units aan te tikken
          //   typing 5s  = daarna verschijnt de typing-indicator zodat de
          //                bezoeker weet dat er nog iets gaat komen
          // Daarna stuurt de bot pas de brochure-vraag (totaal 18s).
          { kind: 'pause', ms: 13000, silent: true },
          { kind: 'pause', ms: 5000 },
        )
      }
      botMessages.push({ kind: 'bot-text', text: getLabel('brochureTrigger', copyVariant) })
      dispatch({ type: 'ANSWER', key: 'availabilityCheck', value: answerValue(opt), next: 'brochureTrigger' })
      sendSequence(userTextFromOpt(opt), botMessages)
      return
    }
    if (q === 'brochureTrigger') {
      // Optionele rendement-uitleg voor beleggers en "beide". Bezoeker
      // krijgt een korte toelichting + de InvestorBubble en daarna komt
      // de brochure-vraag opnieuw met enkel ja/nee (rendement-chip is
      // weg via behaviors.rendementInfoShown). currentQuestion blijft
      // brochureTrigger zodat de chip-bar automatisch terug komt.
      if (opt.id === 'rendement') {
        trackEvent('brochure-trigger:rendement-shown', {})
        dispatch({ type: 'BEHAVIOR_RENDEMENT_SHOWN' })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: project.investor?.rendementIntro || `Goed dat je daarnaar vraagt. Bij beleggen op de ${project.location?.district} is het rendement de kern.` },
          {
            kind: 'investor',
            payload: {
              benefits: project.investorBenefits,
              investor: project.investor,
              intro: `Hoe het rendement op ${project.displayName} opgebouwd wordt.`,
            },
          },
          { kind: 'pause', ms: 2500 },
          { kind: 'bot-text', text: 'In de brochure staan de exacte prijzen en plattegronden zodat je zelf kunt rekenen. Wil je die ontvangen?' },
        ])
        return
      }
      trackEvent('brochure-trigger:answered', { id: opt.id, label: opt.label, isAfhaak: !!opt.afhaak })
      // Bezoeker zegt ja tegen de brochure: dat is impliciete toestemming
      // voor verwerking van zijn gegevens voor brochure-mailen plus
      // sales-opvolging. Vastleggen ten behoeve van AVG-art 7 verantwoording.
      if (!opt.afhaak) {
        logBrochureConsent()
      }
      if (opt.afhaak) {
        dispatch({ type: 'ANSWER', key: 'brochureTrigger', value: answerValue(opt), next: 'afhaakReasons' })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: 'Geen probleem.' },
          { kind: 'bot-text', text: flow.questions.afhaakReasons.label },
        ])
        return
      }
      // Brochure-ja, lead al bekend? Sla lead-capture over en spring naar size.
      if (state.answers.lead) {
        dispatch({ type: 'ANSWER', key: 'brochureTrigger', value: answerValue(opt), next: 'size' })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: 'Top, we sturen je de juiste info.' },
          { kind: 'bot-text', text: getQuestion('size').label },
        ])
        return
      }
      // Lead-form variant (vervangt het oude email → naam → phoneAsk → phone
      // 4-staps pad). Eén bubble met 3 verplichte velden, daarna direct door
      // naar de size-vraag via finishLead.
      dispatch({ type: 'ANSWER', key: 'brochureTrigger', value: answerValue(opt), next: 'lead-form' })
      sendSequence(userTextFromOpt(opt), [
        { kind: 'bot-text', text: 'Gaan we doen. Waar kan ik de brochure naartoe sturen?' },
        { kind: 'lead-form', payload: {} },
      ])
      return
    }
    // Afhaak-pad: registreer reden, sluit af met sterke WhatsApp-uitnodiging.
    if (q === 'afhaakReasons') {
      trackEvent('afhaak-reason:answered', { id: opt.id, label: opt.label })
      // Rent-match sub-flow: bezoeker zoekt huur, niet koop. Slaan we de
      // huurprijs-range op zodat we later kunnen koppelen aan beleggers
      // in De Hofman die hun unit willen verhuren.
      if (opt.id === 'huur') {
        // Zelfde rent-lijst-routing als bij de intent-huur-tak (ELSTER:
        // leadVariant 'huurder' → Brevo-lijst 304). Project-gated.
        const rentVariant = project.flowOverrides?.rentLeadVariant
        if (rentVariant) dispatch({ type: 'BEHAVIOR_SET_LEAD_VARIANT', variant: rentVariant })
        dispatch({ type: 'ANSWER', key: 'afhaakReason', value: answerValue(opt), next: 'rentRange' })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: `Begrijpelijk. Bij ${project.displayName} zijn er ook beleggers die hun unit verhuren.` },
          { kind: 'bot-text', text: 'Met je voorkeur kunnen we je in de toekomst koppelen aan een belegger als er een match is.' },
          { kind: 'bot-text', text: flow.questions.rentRange.label },
        ])
        return
      }
      trackEvent('flow:complete', { stage: 'afhaak', persona })
      const customerSummary = customerAfhaakSummary(opt.id)
      const wa = whatsAppDeeplink(project, state.answers.lead?.firstName || '', customerSummary)
      dispatch({ type: 'ANSWER', key: 'afhaakReason', value: answerValue(opt), next: null })
      pushSnapshot()
      sendSequence(userTextFromOpt(opt), [
        { kind: 'bot-text', text: 'Dank voor je eerlijkheid.' },
        { kind: 'bot-text', text: 'Misschien kunnen we via WhatsApp samen kijken naar wat wel past. Sommige projecten staan nog niet online en we denken graag mee.' },
        {
          kind: 'cta-card',
          payload: {
            waLink: wa,
            summary: customerSummary,
            hideBrochure: true,
          },
        },
      ])
      return
    }
    // Rent-match: huurprijs-range vastleggen voor toekomstige
    // matchmaking met beleggers. Deze data is goud voor REPP.
    if (q === 'rentRange') {
      trackEvent('rent-match:registered', { id: opt.id, label: opt.label })
      // Twee paden afhankelijk van of we al lead-gegevens hebben:
      //  A. Lead compleet (e-mail + naam) → direct flow:complete + CTA
      //  B. Geen lead → eerst gegevens vragen, anders kunnen we de
      //     "we bewaren je voorkeur"-belofte niet waarmaken
      const lead = state.answers.lead || {}
      const hasLead = !!lead.email && !!lead.firstName
      if (hasLead) {
        trackEvent('flow:complete', { stage: 'rent-match', persona })
        const customerSummary = customerRentSummary(opt.label)
        const wa = whatsAppDeeplink(project, lead.firstName, customerSummary)
        dispatch({ type: 'ANSWER', key: 'rentRange', value: answerValue(opt), next: null })
        // Lead bestond al (afhaak-huur-route): her-push zodat de zojuist
        // gezette leadVariant (bv. ELSTER 'huurder' → lijst 304) alsnog naar
        // brevo.ts gaat. Zonder lead loopt het rent-match-pad via finishLead,
        // dat zelf al pusht.
        pushSnapshot()
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: `Genoteerd, ${lead.firstName}. We bewaren je voorkeur en nemen contact op zodra er een match is.` },
          { kind: 'bot-text', text: 'Mocht je nog vragen hebben, stuur ons dan gerust een WhatsApp.' },
          {
            kind: 'cta-card',
            payload: { waLink: wa, summary: customerSummary, hideBrochure: true },
          },
        ])
        return
      }
      // Pad B: geen lead — antwoord opslaan, dan e-mail + naam vragen
      // zodat we daadwerkelijk contact kunnen opnemen bij een match.
      // De rentMatchRequested-flag laat finishLead het rent-match-pad
      // voortzetten in plaats van naar size te gaan (size is niet
      // relevant voor rent-match).
      dispatch({ type: 'ANSWER', key: 'rentRange', value: answerValue(opt), next: 'lead-form' })
      dispatch({ type: 'BEHAVIOR_RENT_MATCH_REQUESTED' })
      sendSequence(userTextFromOpt(opt), [
        { kind: 'bot-text', text: 'Helder. Om je voorkeur op te kunnen slaan en contact op te kunnen nemen zodra er een match is, heb ik je gegevens nodig.' },
        { kind: 'lead-form', payload: {} },
      ])
      return
    }
    if (q === 'lead-phoneAsk') {
      trackEvent('lead-phone-ask:answered', { id: opt.id, label: opt.label })
      if (opt.id === 'yes') {
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: 'Wat is je 06-nummer?' },
        ])
        dispatch({ type: 'SET_QUESTION', next: 'lead-phone' })
      } else {
        dispatch({ type: 'BEHAVIOR_PHONE_DECLINED' })
        finishLead(state.leadDraft, [
          { kind: 'user-text', text: userTextFromOpt(opt) },
          { kind: 'bot-text', text: 'Geen probleem. Ons nummer staat in de mail als je later wilt schakelen.' },
        ])
      }
      return
    }
    if (q === 'size') {
      trackEvent('size:answered', { id: opt.id, label: opt.label })
      dispatch({ type: 'ANSWER', key: 'size', value: answerValue(opt), next: 'timeline' })
      sendSequence(userTextFromOpt(opt), [
        { kind: 'bot-text', text: getLabel('timeline', copyVariant) },
      ])
      return
    }
    if (q === 'timeline') {
      const merged = { ...state.answers, timeline: opt }
      const unit = recommendUnit(merged, project)
      const confidence = leadConfidence(merged)
      trackEvent('timeline:answered', { id: opt.id, label: opt.label, recommendedUnit: unit.primary?.type })
      // Eén consistente flow voor alle temperaturen. Voorheen kreeg een hot-
      // bezoeker hier een merged service-card te zien (foto + specs + handoff
      // CTA-ladder in één bubble) maar die voelde als "ze willen me direct
      // closen". De handoff is nu verplaatst naar een expliciete chip-keuze
      // op de moreInfo-stap zodat de bezoeker zelf het tempo bepaalt.
      const botMessages = []
      if (confidence >= 2) {
        // Per-keuze intro-override: projecten kunnen via
        // project.recommendIntroByChoice[size.id] een eigen tekst leveren
        // (bv. De Paveri stuurt alle keuzes naar Unit C met disclosure
        // waarom de oorspronkelijk-gekozen size niet matcht). Fallback is
        // de generieke "X-unit interessant"-zin.
        const sizeId = merged.size?.id
        const introOverride = project.recommendIntroByChoice?.[sizeId]
        const introText = introOverride
          || `Op basis van je antwoorden lijkt vooral de ${unit.primary.type}-unit interessant.`
        botMessages.push(
          { kind: 'bot-text', text: introText },
          { kind: 'unit-card', payload: unit },
        )
      } else {
        botMessages.push(
          { kind: 'bot-text', text: 'Je hebt nog niet veel voorkeuren ingegeven. We sturen je eerst een overzicht van de beschikbare opties; via WhatsApp denken we graag mee.' },
          { kind: 'unit-card', payload: unit },
        )
      }
      botMessages.push(
        // Persona-specifieke recommendCopy-bubble (die hier eerst stond)
        // is bewust verwijderd: te uitleggend en herhaalde info die uit
        // de unit-card al bleek. Direct door naar de macro-keuze houdt
        // het tempo strak.
        { kind: 'bot-text', text: 'Wil je dit even kort overleggen met de makelaar, of liever eerst zelf rondkijken?' },
      )
      dispatch({ type: 'ANSWER', key: 'timeline', value: answerValue(opt), next: 'postRecommendation' })
      sendSequence(userTextFromOpt(opt), botMessages)
      // Qualification-snapshot: persona + size + timeline + recommendation zijn
      // nu compleet. Goed moment om de Supabase-rij te updaten met het volledige
      // beeld (CRM ziet hierdoor eerder rich data dan alleen email-only).
      pushSnapshot()
      return
    }
    if (q === 'postRecommendation') {
      // Macro-keuze direct na unit-aanbeveling. Twee paden:
      //   a) "Even contact" → triggert direct de warm-handoff bubble
      //   b) "Eerst rondkijken" → opent de moreInfo-fase met persona-relevante
      //      chip-cluster (4 stuks ipv 11)
      if (opt.id === '__contact_now') {
        // Bezoeker vraagt expliciet om contact direct na de aanbeveling. We
        // tonen meteen de contact-bubble zonder bridge-tekst (die zou hier
        // alleen nog observatie-language toevoegen) en zonder de value-
        // bullets in de bubble zelf. Bezoeker vroeg om actie, niet om een
        // verkoop-pitch over wat een gesprek allemaal kan opleveren.
        dispatch({ type: 'ANSWER', key: 'postRecommendation', value: answerValue(opt), next: 'moreInfo' })
        const personaForCard =
          buying.inferredPersona !== 'onbekend' ? buying.inferredPersona : persona
        const lead = state.answers.lead || {}
        const phoneDeclined = !lead.phone && state.behaviors?.phoneAskedDeclined === true
        const summary = buildCustomerWaSummary(state.answers, project)
        const wa = whatsAppDeeplink(project, lead.firstName || '', summary)
        const phoneLink = buildPhoneLink(project.phoneNumber)
        trackEvent('warm-handoff:opened-via-macro-chip', {
          persona: personaForCard,
          temperature: buying.temperature,
          score: buying.score,
          directContact: true,
        })
        dispatch({ type: 'WARM_HANDOFF_SHOWN' })
        sendSequence(userTextFromOpt(opt), [
          {
            kind: 'warm-handoff',
            payload: {
              copy: buildHandoffCopy(personaForCard, project, {
                signals: buying.signals,
                name: lead.firstName || '',
                hasPhone: !!lead.phone,
                phoneDeclined,
                directContact: true,
              }),
              salesTeam: project.salesTeam,
              hasPhone: !!lead.phone,
              waLink: wa,
              waSummary: summary,
              phoneLink,
              phoneDisplay: project.phoneNumber,
              outcome: null,
            },
          },
        ])
        return
      }
      if (opt.id === '__browse') {
        // Bezoeker wil eerst rondkijken. Ga naar moreInfo met de persona-
        // relevante chip-cluster zichtbaar (4 chips + 'Bekijk alle onderwerpen').
        dispatch({ type: 'ANSWER', key: 'postRecommendation', value: answerValue(opt), next: 'moreInfo' })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: 'Goed. Hier zijn een paar onderwerpen die voor jou relevant kunnen zijn. Kies wat je wilt zien.' },
        ])
        return
      }
      return
    }
    if (q === 'moreInfo') {
      if (opt.id === '__expand_options') {
        // Bezoeker tikt op "Bekijk alle onderwerpen" — open de bottom-sheet.
        // Geen state-mutatie aan de chat, geen userMessage; sheet is een
        // ephemeral UI-laag bovenop de chat. Selectie binnen de sheet
        // dispatcht alsnog via de gewone chip-handler.
        trackEvent('options-sheet:opened', { seenCount: state.moreInfoSeen.length })
        setOptionsSheetOpen(true)
        return
      }
      if (opt.id === '__callback') {
        // User-pulled handoff: bezoeker kiest expliciet de "Laat de makelaar mij
        // bellen" chip. We tonen geen directe bevestiging meer maar:
        //   1) een persoonlijke brug-zin die observatie + reden geeft
        //   2) de warm-handoff bubble met Bel/WA/Bel zelf/Verder lezen
        //
        // Reden: voorheen werd de bezoeker zonder enige overgang naar
        // "we bellen je" gestuurd. Met de bridge + bubble krijgt 'ie de
        // ruimte om te kiezen tussen contactvormen of alsnog door te lezen.
        const personaForCard =
          buying.inferredPersona !== 'onbekend' ? buying.inferredPersona : persona
        const lead = state.answers.lead || {}
        const phoneDeclined = !lead.phone && state.behaviors?.phoneAskedDeclined === true
        const summary = buildCustomerWaSummary(state.answers, project)
        const wa = whatsAppDeeplink(project, lead.firstName || '', summary)
        const phoneLink = buildPhoneLink(project.phoneNumber)
        trackEvent('warm-handoff:opened-via-chip', {
          persona: personaForCard,
          temperature: buying.temperature,
          score: buying.score,
          signalCount: buying.signals.length,
          signalIds: buying.signals.map((s) => s.id),
        })
        // Warm-handoff = hoog intent, maar geen nieuwe Lead (email is al
        // gecaptured eerder). Meta-standaard 'Contact' event is hier correct.
        fireMetaContact('callback-chip', { persona: personaForCard, temperature: buying.temperature })
        // Slack-notificatie naar #callbacks: sales weet direct dat deze
        // lead gebeld wil worden. Fire-and-forget, faalt nooit UX.
        notifyCallbackRequest({
          lead,
          project: project.id || 'clp_dehofman',
          source: 'warm-handoff-chip',
          context: {
            persona: personaForCard,
            temperature: buying.temperature,
            score: buying.score,
            signals: buying.signals.map((s) => s.id).join(', '),
          },
        }).catch(() => {})
        // Korte directe bevestiging na chip-klik. Eerdere lange-tekst varianten
        // (met bridge-observatie of warm-handoff bubble met outcome=callback)
        // werden door bezoekers gemist of als nieuwe vraag gelezen. Nu twee
        // korte bot-bubbles met dank + telefoonnummer als laatste boodschap —
        // onmogelijk te missen want het is wat ze als laatste zien onderaan
        // de scroll.
        const handoffName = lead.firstName || ''
        const handoffPhone = lead.phone || ''
        const confirmation1 = handoffName
          ? `Dank, ${handoffName}. Je belverzoek is binnen.`
          : 'Je belverzoek is binnen.'
        const confirmation2 = handoffPhone
          ? `Een makelaar belt je zo snel mogelijk terug op ${handoffPhone}.`
          : 'Een makelaar neemt zo snel mogelijk contact met je op.'
        dispatch({ type: 'WARM_HANDOFF_SHOWN' })
        dispatch({ type: 'WARM_HANDOFF_OUTCOME', outcome: 'callback' })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: confirmation1 },
          { kind: 'bot-text', text: confirmation2 },
        ])
        return
      }
      if (opt.id === '__portal') {
        // Bezoeker klikt op "Bekijk op dehofman.nl". Open het portaal in een
        // nieuw venster zodat de chat-sessie open blijft (kunnen later
        // terugkeren). Géén flow:complete dispatchen — bezoeker is nog niet
        // klaar met de CLP, hij neemt alleen een zijstap.
        trackEvent('cta:portal-clicked', { from: 'moreInfo-chip' })
        // Portal-link click = micro-conversie, geen Lead. Custom event
        // zodat we 'm wel kunnen tracken in Ads Manager (eigen kolom of
        // Custom Conversion) zonder Meta's Lead-optimalisatie te
        // vervuilen met link-clicks.
        fireMetaCustom('PortalClick', 'moreInfo-chip', { location: 'moreInfo-chip' })
        if (typeof window !== 'undefined') {
          window.open(portalUrlForCta, '_blank', 'noopener,noreferrer')
        }
        return
      }
      if (opt.id === '__contact') {
        // Direct contact: einde van de flow met cta-card (bellen + WhatsApp).
        const merged = state.answers
        const personaNext = derivePersona(merged)
        const customerSummary = buildCustomerWaSummary(merged, project)
        const wa = whatsAppDeeplink(project, state.answers.lead?.firstName, customerSummary)
        const phoneLink = buildPhoneLink(project.phoneNumber)
        trackEvent('direct-contact:requested', { from: 'moreInfo' })
        trackEvent('flow:complete', { stage: 'sales_ready', persona: personaNext })
        dispatch({
          type: 'ANSWER',
          key: 'followup',
          value: { ...answerValue({ id: 'direct-contact', label: 'Direct contact', score: 32 }) },
          next: null,
        })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: 'Top. Bel of WhatsApp ons direct, dan zorgen we dat je vandaag nog antwoord hebt.' },
          {
            kind: 'cta-card',
            payload: {
              waLink: wa,
              phoneLink,
              phoneDisplay: project.phoneNumber,
              summary: customerSummary,
            },
          },
        ])
        pushSnapshot()
        return
      }
      if (opt.id === '__done') {
        // Wrap-up: bezoeker geeft expliciet aan klaar te zijn met de
        // exploratie. Sluit af met een rustige zin en de kale CTA-card
        // (alleen WA + bellen, geen brochure-knop want die is al beschikbaar
        // geweest, geen reset want dat verwijdert antwoorden).
        const merged = state.answers
        const personaNext = derivePersona(merged)
        const customerSummary = buildCustomerWaSummary(merged, project)
        const wa = whatsAppDeeplink(project, state.answers.lead?.firstName, customerSummary)
        const phoneLink = buildPhoneLink(project.phoneNumber)
        trackEvent('more-info:done', { from: 'chip', seenCount: state.moreInfoSeen.length })
        trackEvent('flow:complete', { stage: 'self-paced', persona: personaNext })
        dispatch({
          type: 'ANSWER',
          key: 'followup',
          value: { ...answerValue({ id: 'self-paced', label: 'Ik heb genoeg gezien', score: 0 }) },
          next: null,
        })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: `Helder. Je hebt nu alles van ${project.displayName} gezien.` },
          { kind: 'bot-text', text: 'Kijk rustig rond. Hieronder kun je altijd contact opnemen met de makelaar of doorklikken naar het portaal voor de volledige plattegrond.' },
          {
            kind: 'cta-card',
            payload: {
              waLink: wa,
              phoneLink,
              phoneDisplay: project.phoneNumber,
              summary: customerSummary,
              portalUrl: portalUrlForCta,
              portalLabel: project.portalLabel,
              seenTopics: seenTopics.map((t) => ({ id: t.id, label: t.label })),
              hideBrochure: true,
              hideReset: true,
            },
          },
        ])
        pushSnapshot()
        return
      }
      if (opt.id === 'financing') {
        trackEvent('more-info:viewed', { id: opt.id, label: opt.label })
        dispatch({ type: 'MORE_INFO_SEEN', id: 'financing' })
        dispatch({ type: 'BEHAVIOR_MORE_INFO_VIEWED', id: 'financing' })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: `Onze partner ${financePartner} kan vrijblijvend met je meedenken over de financiering.` },
          { kind: 'bot-text', text: `Mag ik je naam, e-mailadres en 06 met ${financePartner} delen voor een vrijblijvende financieringsscan? Zonder je akkoord doen we dat niet.` },
        ])
        dispatch({ type: 'SET_QUESTION', next: 'financingAsk' })
        return
      }
      trackEvent('more-info:viewed', { id: opt.id, label: opt.label })
      dispatch({ type: 'MORE_INFO_SEEN', id: opt.id })
      dispatch({ type: 'BEHAVIOR_MORE_INFO_VIEWED', id: opt.id })
      // Conversational nudges + fase-detectie. seenCountAfter is wat er staat
      // NA deze pick (state.moreInfoSeen heeft 'm nog niet, dispatch is async).
      const seenCountAfter = state.moreInfoSeen.length + 1
      const totalAvailable = countAvailableMoreInfo(persona)
      const trailingMessages = []
      if (seenCountAfter === ALL_SEEN_THRESHOLD) {
        // Drempel-moment: bezoeker heeft N chips bekeken. Bot benoemt dat
        // alles in grote lijnen besproken is en biedt resterende chips
        // expliciet aan als "specifieke onderwerpen". 8s pause zodat de
        // content van DEZE chip eerst rustig kan landen.
        trailingMessages.push(
          { kind: 'pause', ms: 1500 },
          { kind: 'bot-text', text: 'Mooi, we hebben nu het belangrijkste van het project doorgenomen.' },
          { kind: 'bot-text', text: 'Zijn er nog specifieke onderwerpen waar je meer over wilt weten? Of zal ik de makelaar je laten bellen?' },
        )
      } else if (seenCountAfter > ALL_SEEN_THRESHOLD && seenCountAfter < totalAvailable) {
        // In de specifieke-topics fase laten we de bezoeker grotendeels met
        // rust. De all-seen-tekst boven heeft al "of zal ik de makelaar
        // bellen" gevraagd — niet steeds herhalen. Geen extra nudge hier.
      } else if (seenCountAfter === totalAvailable) {
        // Alle chips opgemaakt zonder dat bezoeker expliciet "klaar" zei —
        // automatische wrap-up. Markeer flow als afgerond + toon kale CTA.
        const merged = state.answers
        const personaNext = derivePersona(merged)
        const customerSummary = buildCustomerWaSummary(merged, project)
        const wa = whatsAppDeeplink(project, state.answers.lead?.firstName, customerSummary)
        const phoneLink = buildPhoneLink(project.phoneNumber)
        trackEvent('more-info:exhausted', { seenCount: seenCountAfter })
        trackEvent('flow:complete', { stage: 'self-paced', persona: personaNext })
        trailingMessages.push(
          { kind: 'pause', ms: 1200 },
          { kind: 'bot-text', text: `Je hebt nu alles van ${project.displayName} gezien.` },
          { kind: 'bot-text', text: 'Kijk rustig rond. Hieronder kun je altijd contact opnemen met de makelaar of doorklikken naar het portaal voor de volledige plattegrond.' },
          {
            kind: 'cta-card',
            payload: {
              waLink: wa,
              phoneLink,
              phoneDisplay: project.phoneNumber,
              summary: customerSummary,
              portalUrl: portalUrlForCta,
              portalLabel: project.portalLabel,
              seenTopics: seenTopics.map((t) => ({ id: t.id, label: t.label })),
              hideBrochure: true,
              hideReset: true,
            },
          },
        )
        dispatch({
          type: 'ANSWER',
          key: 'followup',
          value: { ...answerValue({ id: 'self-paced', label: 'Alles bekeken', score: 0 }) },
          next: null,
        })
        pushSnapshot()
      } else if (seenCountAfter === 3) {
        // Discovery-fase nudge: één keer rond chip 3, niet repetitief.
        // Variatie in copy via een kleine pool zodat het natuurlijk klinkt
        // als de bezoeker meerdere sessies doet of de chat opnieuw start.
        // Cold-bezoekers krijgen geen nudge — die zijn nog aan het oriënteren
        // en een vroege "wil je gebeld worden?" voelt voor hen pushy.
        if (buying.temperature !== 'cold') {
          const pool = [
            'Mocht het helpen om kort te schakelen, dat kan altijd.',
            'Verder kijken of zullen we de makelaar erbij vragen?',
            'Tot zover. Iets specifieks waar je dieper op wilt gaan?',
          ]
          // Pseudo-random op session-id: zelfde bezoeker krijgt steeds
          // dezelfde nudge bij re-visits (consistente ervaring), nieuwe
          // bezoekers krijgen variatie.
          const sid = getSessionId() || ''
          const pickIdx = Math.abs(hashString(sid)) % pool.length
          trailingMessages.push(
            { kind: 'pause', ms: 1200 },
            { kind: 'bot-text', text: pool[pickIdx] },
          )
        }
      }
      // Detect of de site-plan al eerder is getoond zodat buildMoreInfoMessages
      // de scan-pauze kan overslaan bij een herhaling. Treedt op wanneer
      // bezoeker eerder 'ja' koos op availabilityCheck en nu via moreInfo
      // opnieuw de plattegrond opvraagt.
      const moreInfoOpts = {
        sitePlanAlreadyShown: state.messages.some((m) => m.kind === 'site-plan' || m.kind === 'site-plan-svg'),
      }
      sendSequence(userTextFromOpt(opt), [...buildMoreInfoMessages(opt.id, persona, moreInfoOpts), ...trailingMessages])
      return
    }
    if (q === 'financingAsk') {
      // Beide uitkomsten loggen we als consent-event: een 'nee' is ook een
      // expliciete keuze die we moeten kunnen aantonen bij audit.
      logCredionConsent(opt.id === 'yes')
      if (opt.id === 'yes') {
        trackEvent('financing:credion-shared', {})
        sendCredionLead(state.answers.lead, project, {
          intent: state.answers.intent?.label,
          size: state.answers.size?.label,
          timeline: state.answers.timeline?.label,
          calc: state.behaviors?.credionCalcData || null,
        })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: `Top. We delen je gegevens met ${financePartner}. Zij nemen vrijblijvend contact met je op.` },
        ])
      } else {
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: 'Geen probleem.' },
        ])
      }
      dispatch({ type: 'SET_QUESTION', next: 'moreInfo' })
      return
    }
    if (q === 'followup') {
      const merged = { ...state.answers, followup: opt }
      const personaNext = derivePersona(merged)
      const stageNext = deriveStage(merged)
      const tc = thankYouCopy(stageNext, personaNext, state.answers.lead?.firstName)
      const customerSummary = buildCustomerWaSummary(merged, project)
      const wa = whatsAppDeeplink(project, state.answers.lead?.firstName, customerSummary)
      trackEvent('followup:answered', { id: opt.id, label: opt.label })
      trackEvent('flow:complete', { stage: stageNext, persona: personaNext })
      dispatch({ type: 'ANSWER', key: 'followup', value: answerValue(opt), next: null })
      pushSnapshot()
      sendSequence(userTextFromOpt(opt), [
        { kind: 'bot-text', text: tc.lead },
        { kind: 'bot-text', text: tc.body },
        { kind: 'cta-card', payload: { waLink: wa, summary: customerSummary } },
      ])
      return
    }
  }
  const onChatInputSend = (text) => {
    const q = state.currentQuestion
    // Gated peiling-vrijetekst: branche 'anders, namelijk'. Nooit actief
    // zonder project.flowOverrides.surveyFlow — andere tenants ongewijzigd.
    if (project.flowOverrides?.surveyFlow && q === 'brancheAnders') return handleSurveyBrancheAnders(text)
    if (q === 'lead-email') return handleLeadEmailText(text)
    if (q === 'lead-name') return handleLeadNameText(text)
    if (q === 'lead-phone') return handleLeadPhoneText(text)
    if (q === 'lead-name-pre-wa') return handleLeadNamePreWaText(text)
    if (q === 'lead-edit-email') return handleLeadEditField('email', text)
    if (q === 'lead-edit-name') return handleLeadEditField('name', text)
    if (q === 'lead-edit-phone') return handleLeadEditField('phone', text)
  }
  // Naam invoer specifiek vóór een WhatsApp-klik. Slaat de naam op,
  // bouwt de WhatsApp-link opnieuw met de zojuist gegeven naam, opent
  // de link in een nieuw venster en herstelt de currentQuestion.
  function handleLeadNamePreWaText(text) {
    const parsed = parseLeadInput(text)
    const fallbackFirst = text.trim().split(/\s+/)[0]
    const firstName = parsed.firstName || (fallbackFirst ? capitalize(fallbackFirst) : null)
    if (!firstName) {
      sendSequence(text, [
        { kind: 'bot-text', text: 'Kreeg je naam niet helemaal mee. Kun je het opnieuw typen?' },
      ])
      return
    }
    const newDraft = {
      ...state.leadDraft,
      firstName,
      email: parsed.email || state.leadDraft.email,
      phone: parsed.phone || state.leadDraft.phone,
    }
    const newLead = { ...(state.answers.lead || {}), firstName }
    if (parsed.email && !state.answers.lead?.email) newLead.email = parsed.email
    if (parsed.phone && !state.answers.lead?.phone) newLead.phone = parsed.phone
    trackNewLeadFields(state.leadDraft, newDraft)
    dispatch({ type: 'LEAD_DRAFT', draft: newDraft })
    dispatch({
      type: 'ANSWER',
      key: 'lead',
      value: newLead,
      next: pendingWa?.returnQuestion ?? null,
    })
    sendSequence(text, [
      { kind: 'bot-text', text: `Top, ${firstName}. We openen WhatsApp voor je.` },
    ])
    if (pendingWa && typeof window !== 'undefined') {
      const wa = whatsAppDeeplink(project, firstName, pendingWa.summary)
      // window.open in een keypress/click handler is een directe gebruiker-
      // gesture op alle moderne browsers; geen popup-block.
      window.open(wa, '_blank', 'noopener,noreferrer')
      trackEvent('whatsapp-name-prompt:resolved', { source: pendingWa.source })
    }
    setPendingWa(null)
  }
  // Eén handler voor alle drie de lead-edit-stappen. Valideert het veld,
  // werkt leadDraft en answers.lead bij, en stuurt de bezoeker terug
  // naar de oorspronkelijke currentQuestion.
  function handleLeadEditField(field, text) {
    const parsed = parseLeadInput(text)
    let value = null
    let error = null
    if (field === 'email') {
      if (parsed.email) value = parsed.email
      else error = 'Het mailadres lijkt niet helemaal te kloppen. Kun je het opnieuw tikken?'
    } else if (field === 'name') {
      const fallback = text.trim().split(/\s+/)[0]
      value = parsed.firstName || (fallback ? capitalize(fallback) : null)
      if (!value) error = 'Kreeg je naam niet helemaal mee. Kun je het opnieuw typen?'
    } else if (field === 'phone') {
      if (parsed.phone) value = parsed.phone
      else error = 'Daar zat geen geldig 06-nummer in. Kun je het opnieuw tikken?'
    }
    if (error) {
      sendSequence(text, [{ kind: 'bot-text', text: error }])
      return
    }
    const draftKey = field === 'name' ? 'firstName' : field
    const trackEventName =
      field === 'email' ? 'lead-email:submitted' : field === 'name' ? 'lead-name:submitted' : 'lead-phone:submitted'
    trackEvent(trackEventName, { [draftKey]: value })
    const newDraft = { ...state.leadDraft, [draftKey]: value }
    const newLead = { ...(state.answers.lead || {}), [draftKey]: value }
    dispatch({ type: 'LEAD_DRAFT', draft: newDraft })
    dispatch({
      type: 'ANSWER',
      key: 'lead',
      value: newLead,
      next: editReturnQuestion ?? null,
    })
    setEditReturnQuestion(null)
    sendSequence(text, [{ kind: 'bot-text', text: 'Bijgewerkt.' }])
  }
  function handleLeadEmailText(text) {
    const parsed = parseLeadInput(text)
    const draft = mergeLead(state.leadDraft, parsed)
    const triedEmail = text.includes('@')
    if (!draft.email) {
      dispatch({ type: 'LEAD_DRAFT', draft })
      // Naam of telefoon kan toch al binnen zijn ondanks geen geldig mailadres
      trackNewLeadFields(state.leadDraft, draft)
      sendSequence(text, [
        {
          kind: 'bot-text',
          text: triedEmail
            ? 'Het mailadres lijkt niet helemaal te kloppen. Kun je het opnieuw tikken?'
            : 'Daar zat geen mailadres in. Kun je het opnieuw typen?',
        },
      ])
      return
    }
    trackNewLeadFields(state.leadDraft, draft)
    // Privacy-claim staat NA de email-input, in dezelfde bubble-set als
    // de bevestiging dat de brochure verstuurd wordt. Daarmee komt 'ie
    // op een natuurlijk moment ipv als drempel ervoor.
    const privacyClaim = 'We mailen je de brochure en bewaren je voorkeur. Hoe we daarmee omgaan staat in onze [privacystatement](/privacy.html).'
    if (draft.firstName) {
      dispatch({ type: 'LEAD_DRAFT', draft })
      // Credion-eerst-pad waarbij bezoeker email plus naam in 1 invoer gaf
      // ("ik ben Jan, jan@example.com"). 06 nog nodig voor de scan. Zelfde
      // structuur als het email-only pad: Credion-deelmelding plus reden
      // waarom we ook nummer vragen, daarna direct de nummer-vraag.
      if (state.behaviors?.credionRequested && !draft.phone) {
        sendSequence(text, [
          { kind: 'bot-text', text: `Dank. We delen je gegevens met ${financePartner} zodat ze je kunnen bellen voor de financieringsscan. Daarvoor hebben we alleen nog even je nummer nodig. Hoe we daarmee omgaan staat in onze [privacystatement](/privacy.html).` },
          { kind: 'bot-text', text: 'Wat is je nummer?' },
        ])
        dispatch({ type: 'SET_QUESTION', next: 'lead-phone' })
        return
      }
      // Rent-match-pad heeft 06 nodig zodat we daadwerkelijk contact kunnen
      // opnemen zodra er een match is — geen Yes/No-vraag, want zonder 06
      // kunnen we de "we bewaren je voorkeur"-belofte niet waarmaken.
      if (state.behaviors?.rentMatchRequested && !draft.phone) {
        sendSequence(text, [
          { kind: 'bot-text', text: 'Dank.' },
          { kind: 'bot-text', text: 'We bewaren je voorkeur en mailen je zodra er een match is. Hoe we met je gegevens omgaan staat in onze [privacystatement](/privacy.html).' },
          { kind: 'bot-text', text: `Top, ${draft.firstName}.` },
          { kind: 'bot-text', text: 'Tot slot je 06-nummer, zodat we je kunnen bereiken zodra er een match is.' },
        ])
        dispatch({ type: 'SET_QUESTION', next: 'lead-phone' })
        return
      }
      sendSequence(text, [
        { kind: 'bot-text', text: `Dank. We sturen de brochure naar ${draft.email}.` },
        { kind: 'bot-text', text: privacyClaim },
        { kind: 'bot-text', text: `Top, ${draft.firstName}.` },
        { kind: 'bot-text', text: 'We houden bij dit soort projecten vaak kort contact via WhatsApp, bijvoorbeeld over beschikbaarheid of als je nog vragen hebt. Vind je dat prettig?' },
      ])
      dispatch({ type: 'SET_QUESTION', next: 'lead-phoneAsk' })
      return
    }
    dispatch({ type: 'LEAD_DRAFT', draft })
    // Rent-match-pad: geen brochure-belofte want we slaan een huur-voorkeur op,
    // niet een koop-aanvraag. Aparte copy voorkomt verwarring.
    if (state.behaviors?.rentMatchRequested) {
      sendSequence(text, [
        { kind: 'bot-text', text: 'Dank.' },
        { kind: 'bot-text', text: 'We bewaren je voorkeur en mailen je zodra er een match is. Hoe we met je gegevens omgaan staat in onze [privacystatement](/privacy.html).' },
        { kind: 'bot-text', text: 'Ook nog handig om je naam te weten, zodat we weten aan wie we het sturen.' },
        { kind: 'bot-text', text: 'Wat is je naam?' },
      ])
      dispatch({ type: 'SET_QUESTION', next: 'lead-name' })
      return
    }
    // Credion-pad: focus op de financieringsscan-belofte ipv enkel brochure.
    // We melden de Credion-deelovereenkomst direct na de email zodat bezoeker
    // weet waarom we ook naam en 06 vragen, niet pas na alle drie de velden.
    // De brochure-belofte komt aan het eind als we daadwerkelijk versturen.
    if (state.behaviors?.credionRequested) {
      sendSequence(text, [
        { kind: 'bot-text', text: `Dank. We delen je gegevens met ${financePartner} zodat ze je kunnen bellen voor de financieringsscan. Daarvoor hebben we alleen nog even je naam en nummer nodig. Hoe we daarmee omgaan staat in onze [privacystatement](/privacy.html).` },
        { kind: 'bot-text', text: 'Wat is je naam?' },
      ])
      dispatch({ type: 'SET_QUESTION', next: 'lead-name' })
      return
    }
    sendSequence(text, [
      { kind: 'bot-text', text: `Dank. We sturen de brochure naar ${draft.email}.` },
      { kind: 'bot-text', text: privacyClaim },
      { kind: 'bot-text', text: 'Ook nog handig om je naam te weten, zodat we weten aan wie we het sturen.' },
      { kind: 'bot-text', text: 'Wat is je naam?' },
    ])
    dispatch({ type: 'SET_QUESTION', next: 'lead-name' })
  }
  function handleLeadNameText(text) {
    const parsed = parseLeadInput(text)
    const fallbackFirst = text.trim().split(/\s+/)[0]
    const firstName = parsed.firstName || (fallbackFirst ? capitalize(fallbackFirst) : null)
    if (!firstName) {
      sendSequence(text, [
        { kind: 'bot-text', text: 'Kreeg je naam niet helemaal mee. Kun je het opnieuw typen?' },
      ])
      return
    }
    const draft = {
      ...state.leadDraft,
      firstName,
      email: parsed.email || state.leadDraft.email,
      phone: parsed.phone || state.leadDraft.phone,
    }
    trackNewLeadFields(state.leadDraft, draft)
    dispatch({ type: 'LEAD_DRAFT', draft })
    // Credion-eerst-pad: 06 is voor de financieringsscan essentieel
    // (Credion belt om door cijfers te lopen). Skip dus de Yes/No-vraag
    // en vraag direct het nummer. Geen losse "Top, X" bubble meer, de
    // Credion-deelmelding stond al na email plus de bezoeker weet inmiddels
    // dat naam plus nummer beide nodig zijn.
    if (state.behaviors?.credionRequested && !draft.phone) {
      sendSequence(text, [
        { kind: 'bot-text', text: 'Wat is je nummer?' },
      ])
      dispatch({ type: 'SET_QUESTION', next: 'lead-phone' })
      return
    }
    // Rent-match-pad: 06 is essentieel om "we nemen contact op zodra er een
    // match is" waar te maken. Skip de Yes/No-vraag en vraag direct het 06.
    if (state.behaviors?.rentMatchRequested && !draft.phone) {
      sendSequence(text, [
        { kind: 'bot-text', text: `Top, ${firstName}.` },
        { kind: 'bot-text', text: 'Tot slot je 06-nummer, zodat we je kunnen bereiken zodra er een match is.' },
      ])
      dispatch({ type: 'SET_QUESTION', next: 'lead-phone' })
      return
    }
    sendSequence(text, [
      { kind: 'bot-text', text: `Top, ${firstName}.` },
      { kind: 'bot-text', text: 'We houden bij dit soort projecten vaak kort contact via WhatsApp, bijvoorbeeld over beschikbaarheid of als je nog vragen hebt. Vind je dat prettig?' },
    ])
    dispatch({ type: 'SET_QUESTION', next: 'lead-phoneAsk' })
  }
  function handleLeadPhoneText(text) {
    const parsed = parseLeadInput(text)
    if (!parsed.phone) {
      sendSequence(text, [
        { kind: 'bot-text', text: 'Daar zat geen geldig 06-nummer in. Kun je het opnieuw tikken?' },
      ])
      return
    }
    const lead = { ...state.leadDraft, phone: parsed.phone }
    trackNewLeadFields(state.leadDraft, lead)
    finishLead(lead, [{ kind: 'user-text', text }])
  }
  // Lead-form submit handler. Vervangt het oude 4-staps text-input pad
  // (lead-email → lead-name → lead-phoneAsk → lead-phone) door één
  // gestructureerde form-submit. Bouwt eerst een user-text bubble met
  // korte samenvatting (naam · email · telefoon), trackt de drie
  // submitted-events, en delegeert door naar finishLead die de rest
  // van de flow afhandelt (Supabase push, size-vraag, etc.).
  function handleLeadFormSubmit({ firstName, email, phone, company }) {
    const lead = { firstName, email, phone, ...(company ? { company } : {}) }
    // Track-events compatible met oude 4-staps flow zodat analytics
    // events-tabel consistent blijft.
    trackNewLeadFields(state.leadDraft || {}, lead)
    trackEvent('lead-form:submitted', { hasName: !!firstName, hasEmail: !!email, hasPhone: !!phone, hasCompany: !!company })
    const summary = [firstName, email, company, phone].filter(Boolean).join(' · ')
    finishLead(lead, [{ kind: 'user-text', text: summary }])
  }
  function finishLead(lead, prependMessages = []) {
    // Custom event ipv tweede Lead: email-capture heeft al Lead getriggered.
    // FullLeadComplete is sterker signaal (email+naam+phone) maar dat is
    // optimalisatie-info voor ons in Ads Manager, niet een dubbele Lead-
    // conversie richting Meta.
    fireMetaCustom('FullLeadComplete', 'lead-complete', { hasPhone: !!lead?.phone })
    dispatch({ type: 'LEAD_DRAFT', draft: lead })
    // Peiling-afsluiting (BREDA). Gated: alleen als flowOverrides.surveyFlow
    // gezet is. Geen aanbod om te tonen, dus we slaan size/timeline/
    // recommendation/moreInfo over en sluiten direct af met de close-bubbles.
    const surveyFlow = project.flowOverrides?.surveyFlow
    if (surveyFlow) {
      dispatch({ type: 'ANSWER', key: 'lead', value: lead, next: null })
      pushSnapshot(
        [{ scope: 'peiling-opvolging', granted: true, detail: { from: 'finishLead-survey' } }],
        lead,
      )
      trackEvent('flow:complete', { stage: 'survey', persona })
      const userMsgs = prependMessages.filter((m) => m.kind === 'user-text')
      if (userMsgs.length > 0) dispatch({ type: 'APPEND', messages: userMsgs })
      const firstName = lead.firstName || ''
      const closeBubbles = (surveyFlow.closeBubbles || []).map((t) => ({
        kind: 'bot-text',
        text: t.replace('{firstName}', firstName).replace(/,\s*\.\s*/, '. '),
      }))
      dispatch({ type: 'ENQUEUE', messages: closeBubbles })
      return
    }
    // Volgende stap hangt af van waar de bezoeker in de flow zit. Wanneer
    // size en timeline al beantwoord zijn (bijv. via warm-handoff callback
    // na timeline), niet terugsturen naar size — dan blijft de bezoeker op
    // moreInfo waar hij zat. Anders: door naar de eerste nog-niet-beantwoorde
    // stap.
    const sizeDone = !!state.answers.size
    const timelineDone = !!state.answers.timeline
    const followupDone = !!state.answers.followup
    let next = 'size'
    if (sizeDone && timelineDone && !followupDone) next = 'moreInfo'
    else if (sizeDone && !timelineDone) next = 'timeline'
    else if (sizeDone && timelineDone && followupDone) next = null
    dispatch({ type: 'ANSWER', key: 'lead', value: lead, next })
    // Eerste Supabase-push: lead is nu compleet (e-mail + naam + evt. 06).
    // Inclusief alle tot dusver geregistreerde consent-momenten zodat de
    // server-side audit-trail meteen vol is. lead-arg expliciet meegeven
    // omdat React-state via async dispatch nog niet is bijgewerkt en
    // pushSnapshot's email-gate anders zou skippen.
    pushSnapshot(
      [{ scope: 'brochure-en-opvolging', granted: true, detail: { from: 'finishLead' } }],
      lead,
    )
    // prependMessages bevat user-text + eventueel een bot-bevestiging.
    // Splits: user-text direct, bot-bubbles in de queue.
    const userMsgs = prependMessages.filter((m) => m.kind === 'user-text')
    const botPrepend = prependMessages.filter((m) => m.kind !== 'user-text')
    if (userMsgs.length > 0) {
      dispatch({ type: 'APPEND', messages: userMsgs })
    }
    // Exit-flows voor bezoekers die niet in de doelgroep vallen. Twee varianten
    // landen hier: koop-intent + niet nautisch (not_nautical → lijst 300) en
    // huur-intent + niet nautisch (rent_not_nautical → lijst 303). Beide krijgen
    // hetzelfde "we nemen contact op"-bericht en de chat stopt — geen brochure,
    // size of timeline vragen meer.
    const exitVariants = ['not_nautical', 'rent_not_nautical']
    if (exitVariants.includes(state.behaviors?.leadVariant)) {
      dispatch({ type: 'SET_QUESTION', next: null })
      trackEvent('flow:complete', { stage: state.behaviors.leadVariant, persona })
      const firstName = lead.firstName || ''
      const tail = [
        { kind: 'bot-text', text: `Bedankt${firstName ? ', ' + firstName : ''}. We hebben je gegevens. We nemen binnenkort contact met je op om te kijken welke andere REPP-projecten wél bij je passen.` },
      ]
      dispatch({ type: 'ENQUEUE', messages: [...botPrepend, ...tail] })
      return
    }
    // Credion-eerst-pad: bezoeker klikte op de Credion-link in de calc
    // VÓÓR de standaard lead-capture. Nu data binnen is, sturen we direct
    // naar Credion (geen extra Yes/No-vraag — de klik op de link was het
    // commitment). Eerst bevestiging dat Credion zsm belt en de brochure
    // gemaild wordt; dan eventueel door naar size-vraag.
    if (state.behaviors?.credionRequested) {
      logCredionConsent(true)
      trackEvent('financing:credion-shared', { from: 'calc-link' })
      sendCredionLead(lead, project, {
        intent: state.answers.intent?.label,
        size: state.answers.size?.label,
        timeline: state.answers.timeline?.label,
        calc: state.behaviors?.credionCalcData || null,
      })
      // Eén compacte bevestiging die Credion-belofte plus brochure-mailing
      // combineert. De Credion-deelmelding stond al na email-invoer dus dit
      // is een afsluiting van de capture-flow, niet een nieuwe melding.
      const credionConfirmation = [
        { kind: 'bot-text', text: `Top. We delen je gegevens met ${financePartner} zodat ze je zo snel mogelijk kunnen bellen voor de financieringsscan. En zullen je tevens alvast de brochure mailen, zodat je het project alvast rustig kunt doorlezen.` },
      ]
      const sizeTail = sizeDone
        ? []
        : [
            { kind: 'bot-text', text: 'Nog een korte vraag, zodat we de juiste prijslijst en plattegronden meesturen.' },
            { kind: 'bot-text', text: getQuestion('size').label },
          ]
      dispatch({ type: 'ENQUEUE', messages: [...botPrepend, ...credionConfirmation, ...sizeTail] })
      return
    }
    // Rent-match-pad: bezoeker registreerde zijn huur-voorkeur zonder lead.
    // Nu naam, mail en 06 binnen zijn, sluiten we de huur-flow direct af met
    // bevestiging plus CTA-card. We slaan de standaard size-vraag over want
    // bij huur is m² minder doorslaggevend dan locatie en oplevering.
    if (state.behaviors?.rentMatchRequested) {
      const rentLabel = state.answers.rentRange?.label || ''
      const customerSummary = customerRentSummary(rentLabel)
      const wa = whatsAppDeeplink(project, lead.firstName || '', customerSummary)
      // Sluit de flow door currentQuestion expliciet op null te zetten — niet
      // door naar size doortikken zoals het standaard-pad doet.
      dispatch({ type: 'SET_QUESTION', next: null })
      trackEvent('flow:complete', { stage: 'rent-match', persona })
      const tail = [
        { kind: 'bot-text', text: `Genoteerd, ${lead.firstName || 'helder'}. We bewaren je voorkeur en nemen contact op zodra er een match is.` },
        { kind: 'bot-text', text: 'Mocht je nog vragen hebben, stuur ons dan gerust een WhatsApp.' },
        { kind: 'cta-card', payload: { waLink: wa, summary: customerSummary, hideBrochure: true } },
      ]
      dispatch({ type: 'ENQUEUE', messages: [...botPrepend, ...tail] })
      return
    }
    // Bevestigings-bubbel + size-vraag horen alleen bij het pad waarin size
    // nog moet komen. Als size al beantwoord is, alleen botPrepend tonen.
    const tail = sizeDone
      ? []
      : [
          { kind: 'bot-text', text: 'Goed. Nog even, zodat we de juiste prijslijst en plattegronden meesturen.' },
          { kind: 'bot-text', text: getQuestion('size').label },
        ]
    dispatch({
      type: 'ENQUEUE',
      messages: [...botPrepend, ...tail],
    })
  }
  const onBrochure = () => {
    trackEvent('cta:brochure-clicked', { location: state.currentQuestion || 'thankyou' })
    dispatch({ type: 'BEHAVIOR_BROCHURE_CLICKED' })
    if (typeof window !== 'undefined' && project.brochureUrl && project.brochureUrl !== '#') {
      window.open(project.brochureUrl, '_blank', 'noopener,noreferrer')
    }
  }
  // Centrale WA-handler. Twee paden:
  //
  //  1. Naam bekend: link altijd rebuilden met de huidige voornaam plus de
  //     opgeslagen summary. Voorkomt dat een oude bubble (waarvan de waLink
  //     bij dispatch werd opgebouwd) een achterhaalde naam bevat nadat de
  //     bezoeker zijn naam via de antwoorden-sheet heeft gewijzigd.
  //
  //  2. Naam onbekend: onderbreek voor een naam-vraag. Daarna opent de
  //     handleLeadNamePreWaText handler de WA-link met de zojuist gegeven
  //     naam zodat naam plus 06 (uit de WA-reply) als koppel kunnen landen.
  //
  // Source is een korte string voor analytics. Summary is de klant-stem
  // beschrijving van de situatie op het moment dat de bubble werd getoond.
  const requestWhatsAppOpen = (e, summary, source) => {
    trackEvent('cta:whatsapp-clicked', { location: source })
    // WhatsApp-click = intent om contact op te nemen, geen Lead-conversie.
    // Meta-standaard 'Contact' is hier de juiste mapping.
    fireMetaContact('whatsapp', { location: source })
    if (e && e.preventDefault) e.preventDefault()
    const lead = state.answers.lead || {}
    if (lead.firstName) {
      const wa = whatsAppDeeplink(project, lead.firstName, summary || '')
      if (typeof window !== 'undefined') {
        window.open(wa, '_blank', 'noopener,noreferrer')
      }
      return
    }
    setPendingWa({ summary: summary || '', source, returnQuestion: state.currentQuestion })
    dispatch({ type: 'SET_QUESTION', next: 'lead-name-pre-wa' })
    dispatch({
      type: 'ENQUEUE',
      messages: [
        { kind: 'bot-text', text: 'Even nog kort: hoe heet je? Dan zorgen we dat het WhatsApp-bericht klopt.' },
      ],
    })
    trackEvent('whatsapp-name-prompt:shown', { source })
  }
  const onWaClick = (e) => {
    // Header WhatsApp-icoon: bewust GEEN naam-vraag eerst. De header is een
    // escape-route — onderbreken voor lead-capture is een afhaak-moment.
    // whatsAppDeeplink valt al elegant terug op een naam-loze opener als de
    // bezoeker nog geen naam heeft achtergelaten ("Hoi REPP, ik heb interesse
    // in De Hofman."). Bij wel-bekende naam komt die er natuurlijk in.
    trackEvent('cta:whatsapp-clicked', { location: 'header' })
    fireMetaContact('whatsapp', { location: 'header' })
    if (e && e.preventDefault) e.preventDefault()
    const lead = state.answers.lead || {}
    const wa = whatsAppDeeplink(project, lead.firstName || '', '')
    if (typeof window !== 'undefined') {
      window.open(wa, '_blank', 'noopener,noreferrer')
    }
  }
  // Behavior callbacks vanuit de site-plan en calc-componenten.
  const onUnitView = ({ number }) => {
    dispatch({ type: 'BEHAVIOR_UNIT_VIEWED', number })
  }
  const onCalcInteract = (calcType) => {
    trackEvent(calcType === 'rentability' ? 'calc:rentability-interaction' : 'calc:mortgage-interaction', {})
    dispatch({ type: 'BEHAVIOR_CALC_INTERACTED', calcType })
  }
  // Credion-link in de mortgage-calculator. Twee paden afhankelijk van
  // of we al lead-gegevens hebben:
  //  A. lead compleet (e-mail + naam) → bestaande financingAsk Yes/No
  //  B. nog geen lead → start lead-capture met gecombineerde framing:
  //     "voor de scan heb ik gegevens nodig, en ik stuur de brochure
  //     gelijk mee" — twee captures in één moment. Na de phone-stap
  //     wordt automatisch naar Credion gestuurd (zonder extra Yes/No)
  //     omdat de klik op de link al het commitment was.
  // Klik op de Credion-link in de calc opent eerst een confirm-dialog tegen
  // misclicks (sliders en knoppen liggen dichtbij elkaar). Pas bij bevestigen
  // start de echte flow via runCredionRequest.
  const onCredionRequest = (calcData) => {
    // calcData komt mee vanuit MortgageCalc of RentabilityCalc met de
    // actuele slider-waarden op het moment van klik. Bewaren in behaviors
    // zodat sendCredionLead 'em later kan meesturen naar Zapier ook als
    // de bezoeker ondertussen nog naam plus 06 invult.
    if (calcData && typeof calcData === 'object') {
      dispatch({ type: 'BEHAVIOR_CREDION_CALC', payload: calcData })
    }
    trackEvent('credion:confirm-shown', { calcKind: calcData?.kind || 'unknown' })
    setCredionConfirmOpen(true)
  }
  const cancelCredionRequest = () => {
    trackEvent('credion:confirm-cancelled', {})
    setCredionConfirmOpen(false)
  }
  const confirmCredionRequest = () => {
    setCredionConfirmOpen(false)
    runCredionRequest()
  }
  const runCredionRequest = () => {
    trackEvent('credion:requested-from-calc', {
      hasEmail: !!state.answers.lead?.email,
      hasName: !!state.answers.lead?.firstName,
      hasPhone: !!state.answers.lead?.phone,
    })
    const lead = state.answers.lead || {}
    const hasEmail = !!lead.email
    const hasName  = !!lead.firstName
    // Pad A: gegevens al binnen → bestaande Yes/No-vraag. Eén bot-bubble met
    // zowel de partner-introductie als de consent-vraag — bezoeker heeft net
    // op de "Partner X · Vrijblijvende financieringsscan"-knop geklikt, dus
    // wie de partner is staat al in de calc-bubble. Een aparte intro-zin
    // bovenop herhaalt dat zonder waarde toe te voegen en vertraagt de flow.
    if (hasEmail && hasName) {
      sendSequence(`Vraag financieringsscan via ${financePartner}`, [
        { kind: 'bot-text', text: `Mag ik je naam, e-mailadres en 06 met ${financePartner} delen voor de vrijblijvende financieringsscan? Zonder je akkoord doen we dat niet.` },
      ])
      dispatch({ type: 'SET_QUESTION', next: 'financingAsk' })
      return
    }
    // Pad B: gecombineerde flow. We markeren credionRequested zodat
    // de lead-capture-handler na phone (of skip) automatisch naar
    // Credion stuurt en niet de normale brochureTrigger-flow doorloopt.
    // Boodschap: Credion belt zsm, brochure komt alvast per mail zodat
    // de bezoeker iets te lezen heeft tot Credion belt.
    dispatch({ type: 'BEHAVIOR_CREDION_REQUESTED' })
    // Pad B: één gecondenseerde bot-bubble met partner + brochure-belofte
    // gecombineerd. Voorheen drie aparte berichten (intro, brochure-mail,
    // lead-form) wat de wachttijd voor de lead-form bubble onnodig lang
    // maakte. Bezoeker heeft net geklikt — minder ophouden, sneller naar
    // de form-invoer.
    sendSequence(`Vraag financieringsscan via ${financePartner}`, [
      { kind: 'bot-text', text: `Mooi. ${financePartner} belt je zo snel mogelijk voor de scan, en we sturen je nu alvast de brochure per mail.` },
      { kind: 'lead-form', payload: {} },
    ])
    // Markeer brochureTrigger impliciet als "ja" (bezoeker heeft via deze
    // route al voor brochure + Credion gekozen) — zodat de flow na lead-
    // capture niet alsnog de brochure-vraag stelt. ANSWER wint van
    // SET_QUESTION wanneer ze in dezelfde dispatch-batch zitten, dus deze
    // ANSWER dispatch heeft expliciet next: 'lead-form' nodig.
    dispatch({ type: 'ANSWER', key: 'brochureTrigger', value: { id: 'ja', label: 'Ja, stuur maar', _msgCountBefore: state.messages.length, _viaCredion: true }, next: 'lead-form' })
  }
  // Wat de bezoeker met de service-card doet. Net als bij de losse
  // warm-handoff muteren we het bestaande bericht met de outcome zodat de
  // groene confirmatie-strook in de card verschijnt zonder extra bubble.
  // De 'moreinfo' uitkomst is uniek voor de service-card: de bezoeker
  // kiest expliciet om eerst zelf rond te kijken, dan releasen we de
  // moreInfo-chips zonder verdere bot-bubble.
  const onServiceCardAction = (msgId, outcome) => {
    trackEvent(`service-card:${outcome}`, {
      persona: buying.inferredPersona,
      temperature: buying.temperature,
      score: buying.score,
    })
    if (outcome !== 'moreinfo') {
      dispatch({ type: 'WARM_HANDOFF_OUTCOME', outcome })
    }
    if (outcome !== 'moreinfo') {
      const newMessages = state.messages.map((m) => {
        if (m.id !== msgId) return m
        return { ...m, payload: { ...m.payload, outcome } }
      })
      dispatch({ type: 'SET_MESSAGES', messages: newMessages })
    } else {
      // Bezoeker wil eerst zelf info zoeken — verberg de CTAs in de card door
      // 'm op outcome=dismissed te zetten en zorg dat moreInfo-chips
      // verschijnen onder de chat. currentQuestion is al 'moreInfo'.
      dispatch({ type: 'WARM_HANDOFF_OUTCOME', outcome: 'dismissed' })
      const newMessages = state.messages.map((m) => {
        if (m.id !== msgId) return m
        return { ...m, payload: { ...m.payload, outcome: 'dismissed' } }
      })
      dispatch({ type: 'SET_MESSAGES', messages: newMessages })
    }
  }
  // Inline 06-input vanuit de service-card. Geen chat-input flow nodig;
  // we werken direct lead.phone bij en zetten de outcome op callback.
  const onServiceCardSubmitPhone = (msgId, text) => {
    const parsed = parseLeadInput(text)
    if (!parsed.phone) return
    const newDraft = { ...state.leadDraft, phone: parsed.phone }
    const newLead = { ...(state.answers.lead || {}), phone: parsed.phone }
    trackNewLeadFields(state.leadDraft, newDraft)
    dispatch({ type: 'LEAD_DRAFT', draft: newDraft })
    dispatch({ type: 'ANSWER', key: 'lead', value: newLead, next: state.currentQuestion })
    dispatch({ type: 'WARM_HANDOFF_OUTCOME', outcome: 'callback' })
    trackEvent('service-card:callback', {
      persona: buying.inferredPersona,
      temperature: buying.temperature,
      score: buying.score,
      via: 'inline-phone-submit',
    })
    const newMessages = state.messages.map((m) => {
      if (m.id !== msgId) return m
      return {
        ...m,
        payload: { ...m.payload, outcome: 'callback', hasPhone: true, phoneDisplay: parsed.phone },
      }
    })
    dispatch({ type: 'SET_MESSAGES', messages: newMessages })
  }
  // Wat de bezoeker met de warm-handoff bubble doet. We muteren het bestaande
  // bericht zodat de visuele feedback (groen vinkje, "Ik bel je vandaag")
  // direct in de chat verschijnt zonder extra bubble.
  const onHandoffAction = (msgId, outcome) => {
    trackEvent(`warm-handoff:${outcome}`, {
      persona: buying.inferredPersona,
      temperature: buying.temperature,
      score: buying.score,
    })
    dispatch({ type: 'WARM_HANDOFF_OUTCOME', outcome })
    // Mute het bestaande handoff-bericht met de uitkomst.
    const newMessages = state.messages.map((m) => {
      if (m.id !== msgId) return m
      return { ...m, payload: { ...m.payload, outcome } }
    })
    // We bouwen om dit te dispatchen via een SET_MESSAGES action.
    dispatch({ type: 'SET_MESSAGES', messages: newMessages })
    // Slack-notificatie naar #callbacks zodra de bezoeker in de
    // warm-handoff bubble daadwerkelijk op "Bel mij terug" klikt.
    // Phone is normaal al via het lead-form binnen; alleen fallback-pad
    // (oude edge case) heeft 'm nog niet.
    if (outcome === 'callback') {
      const callbackLead = state.answers.lead || {}
      notifyCallbackRequest({
        lead: callbackLead,
        project: project.id || 'clp_dehofman',
        source: 'warm-handoff-button',
        context: {
          persona: buying.inferredPersona,
          temperature: buying.temperature,
          score: buying.score,
        },
      }).catch(() => {})
    }
    // Bij callback en geen telefoon-nummer in lead: ask phone.
    if (outcome === 'callback' && !state.answers.lead?.phone) {
      dispatch({
        type: 'ENQUEUE',
        messages: [
          { kind: 'bot-text', text: 'Top. Wat is je 06-nummer? Dan bel ik je terug.' },
        ],
      })
      dispatch({ type: 'SET_QUESTION', next: 'lead-phone' })
    }
  }
  const onPhoneClick = () => {
    trackEvent('cta:phone-clicked', { location: 'header' })
    // tel: link-click = intent om te bellen, geen Lead-conversie.
    fireMetaContact('phone-tap', { location: 'header' })
  }
  const onPortalClick = () => {
    trackEvent('cta:portal-clicked', { location: 'cta-card' })
  }
  // Mini-TOC voor de wrap-up CTA-card. Geeft de bezoeker een snelle
  // terugkeer-route naar al bekeken kaarten zonder dat 'ie door een lange
  // chat moet scrollen. Bouwt op moreInfoSeen + de message-IDs van de
  // inhoudelijke bubbles (kind === MORE_INFO_DEFS-id).
  const seenTopics = state.moreInfoSeen
    .map((id) => {
      const def = MORE_INFO_DEFS[id]
      if (!def) return null
      // Vind de bijbehorende rich-bubble in de thread om scroll-target te
      // bepalen. We matchen op kind: 'site-plan' voor sitePlan, 'gallery'
      // voor gallery, etc. (zie buildMoreInfoMessages voor de mapping).
      const kindOf = {
        location: 'location', sitePlan: 'site-plan', gallery: 'gallery',
        highlights: 'highlights', price: 'price', priceCompare: 'price-compare',
        planning: 'planning', process: 'process', brochure: 'brochure',
        investor: 'investor',
      }[id]
      const msg = state.messages.find((m) => m.kind === kindOf || (id === 'sitePlan' && m.kind === 'site-plan-svg'))
      if (!msg) return null
      return { id, label: def.label, messageId: msg.id }
    })
    .filter(Boolean)
  const onTopicJump = (topicId) => {
    const topic = seenTopics.find((t) => t.id === topicId)
    if (!topic || typeof document === 'undefined') return
    trackEvent('toc:jump', { topicId })
    // Vind het DOM-element van de bubble en scroll erheen via de
    // ChatThread-scroller. Geen window-scroll want de chat heeft z'n eigen
    // scroll-container.
    const el = document.querySelector(`[data-msg-id="${topic.messageId}"]`)
    const scroller = document.querySelector('.flex-1.overflow-y-auto')
    if (el && scroller) {
      const elTop = el.offsetTop
      scroller.scrollTo({ top: Math.max(0, elTop - 12), behavior: 'smooth' })
    }
  }
  const headerWaLink = whatsAppDeeplink(project, state.answers.lead?.firstName || '', `Graag info over ${project.displayName}`)
  const headerPhoneLink = buildPhoneLink(project.phoneNumber)
  // Wijzig een eerder gegeven antwoord vanuit de antwoorden-sheet.
  // De flow rolt terug naar het punt vlak voor de oude user-bubble; de
  // originele bot-vraag staat nog in de thread, dus de bezoeker ziet
  // automatisch dezelfde vraag opnieuw met de chips. Geen duplicaat.
  const onEditAnswer = (key) => {
    trackEvent('answer:edit', { key })
    dispatch({ type: 'ROLLBACK', key })
  }
  const onForgetLead = () => {
    trackEvent('answer:forget-lead', {})
    // Het verzoek tot verwijdering ZELF eerst loggen voordat we de data
    // wissen, anders verliezen we het bewijs van de uitvoering. AVG art 17.
    logErasureRequest()
    dispatch({ type: 'FORGET_LEAD' })
  }
  // Per-veld edit van lead. Veld wordt gewist en de bezoeker wordt
  // gevraagd het opnieuw in te tikken via de chat-input. Andere lead-velden
  // blijven bewaard. Na succes komt de bezoeker terug op zijn vorige
  // currentQuestion (chips of niets).
  const onEditLeadField = (field) => {
    trackEvent('answer:edit-lead-field', { field })
    const draftKey = field === 'name' ? 'firstName' : field
    const newDraft = { ...state.leadDraft }
    delete newDraft[draftKey]
    dispatch({ type: 'LEAD_DRAFT', draft: newDraft })
    const newLead = { ...(state.answers.lead || {}) }
    delete newLead[draftKey]
    const hasOtherFields = newLead.firstName || newLead.email || newLead.phone
    dispatch({
      type: 'ANSWER',
      key: 'lead',
      value: hasOtherFields ? newLead : undefined,
      next: state.currentQuestion,
    })
    setEditReturnQuestion(state.currentQuestion)
    dispatch({ type: 'SET_QUESTION', next: `lead-edit-${field}` })
    const label =
      field === 'email'
        ? 'Wat is je e-mailadres?'
        : field === 'name'
        ? 'Wat is je naam?'
        : 'Wat is je 06-nummer?'
    dispatch({ type: 'ENQUEUE', messages: [{ kind: 'bot-text', text: label }] })
  }
  const toggleDebug = () => dispatch({ type: 'TOGGLE_DEBUG' })
  let chipQuestion = null
  let inputConfig = null
  // Gated peiling-chipvragen (BREDA). Nooit actief zonder surveyFlow, dus de
  // bestaande resolutie-keten hieronder blijft ongewijzigd voor andere tenants.
  const surveyChipKey = project.flowOverrides?.surveyFlow && SURVEY_CHIP_KEY_SET.has(state.currentQuestion)
    ? state.currentQuestion
    : null
  if (surveyChipKey) chipQuestion = flow.questions[surveyChipKey]
  else if (state.currentQuestion === 'intent') chipQuestion = flow.questions.intent
  else if (state.currentQuestion === 'nauticGate') {
    // Twee passes:
    //   1e pass (bezoeker komt net binnen op de gate): "Ja" / "Nee" / "Wat
    //      houdt nautisch in?" — korte labels want de vraag is op zichzelf
    //      duidelijk genoeg.
    //   2e pass (na uitleg): bezoeker heeft net uitleg gelezen. We zwapen
    //      naar volzin-labels "Ik ben (geen) nautische ondernemer" zodat de
    //      antwoorden expliciet voelen na de uitleg, en verbergen de
    //      uitleg-chip (anders krijg je een loop).
    const explained = !!state.behaviors?.nauticExplanationShown
    const base = flow.questions.nauticGate
    chipQuestion = explained
      ? {
          ...base,
          options: base.options
            .filter((o) => o.id !== 'uitleg')
            .map((o) => o.id === 'ja'
              ? { ...o, label: 'Ik ben een nautische ondernemer' }
              : o.id === 'nee'
                ? { ...o, label: 'Ik ben geen nautische ondernemer' }
                : o),
        }
      : base
  }
  else if (state.currentQuestion === 'availabilityCheck') {
    // Filter de 'locatie'-chip zodra LocationBubble al eens getoond is om
    // herhaalde clicks te voorkomen. Bezoeker houdt dan alleen ja/nee
    // opties over om de availability-flow af te ronden.
    const locationShown = state.messages.some((m) => m.kind === 'location')
    chipQuestion = locationShown
      ? { ...flow.questions.availabilityCheck, options: flow.questions.availabilityCheck.options.filter((o) => o.id !== 'locatie') }
      : flow.questions.availabilityCheck
  }
  else if (state.currentQuestion === 'brochureTrigger') {
    // Voor beleggers en de "beide"-persona bieden we een 3e optie aan om
    // eerst meer over het rendement te horen voordat ze de brochure-keuze
    // maken. Dat past bij hun afweging (cijfers eerst, brochure daarna).
    // Eigen-gebruikers en onbekend krijgen de standaard ja/nee — voor hen
    // is rendement geen primaire beslissingsfactor.
    const investorMinded = persona === 'belegger' || persona === 'beide'
    const alreadyShown = !!state.behaviors?.rendementInfoShown
    const baseQuestion = flow.questions.brochureTrigger
    if (investorMinded && !alreadyShown) {
      chipQuestion = {
        ...baseQuestion,
        options: [
          ...baseQuestion.options,
          { id: 'rendement', label: 'Vertel meer over rendement' },
        ],
      }
    } else {
      chipQuestion = baseQuestion
    }
  }
  else if (state.currentQuestion === 'afhaakReasons' || state.currentQuestion === 'afhaakReason') chipQuestion = flow.questions.afhaakReasons
  else if (state.currentQuestion === 'rentRange') chipQuestion = flow.questions.rentRange
  else if (state.currentQuestion === 'size') chipQuestion = getQuestion('size')
  else if (state.currentQuestion === 'timeline') chipQuestion = getQuestion('timeline')
  else if (state.currentQuestion === 'followup') chipQuestion = flow.questions.followup
  else if (state.currentQuestion === 'postRecommendation') {
    // Macro-keuze direct na unit-aanbeveling: contact of rondkijken.
    // Slechts twee chips, primary callback-CTA visueel uit de toon
    // springend zoals bij warm/hot moreInfo-state.
    chipQuestion = {
      key: 'postRecommendation',
      label: 'wat nu',
      options: [
        { id: '__contact_now', label: 'Even contact opnemen', variant: 'primary' },
        { id: '__browse', label: 'Eerst zelf rondkijken' },
      ],
    }
  }
  else if (state.currentQuestion === 'moreInfo') {
    chipQuestion = {
      key: 'moreInfo',
      label: 'meer info',
      options: moreInfoChips(
        persona,
        state.moreInfoSeen,
        buying.temperature,
        // Callback-afspraak gemaakt? Detecteer via outcome=callback in de
        // warm-handoff bubble plus 06 aanwezig. Zonder 06 kan de makelaar
        // niet bellen, dus geen reden om de chip al te muten.
        state.behaviors?.warmHandoffOutcome === 'callback' && !!state.answers.lead?.phone,
        // Portal-chip pas tonen zodra we e-mail van de bezoeker hebben — anders
        // sturen we een anonieme bezoeker naar het portaal zonder token, wat
        // het hele "auto-login"-idee onderuit haalt.
        !!state.answers.lead?.email,
      ),
    }
  } else if (state.currentQuestion === 'lead-phoneAsk') {
    chipQuestion = {
      key: 'lead-phoneAsk',
      label: 'phone ask',
      options: [
        { id: 'yes', label: 'Ja, dat is handig' },
        { id: 'no', label: 'Nee, liever niet' },
      ],
    }
  } else if (state.currentQuestion === 'financingAsk') {
    chipQuestion = {
      key: 'financingAsk',
      label: 'financing ask',
      options: [
        { id: 'yes', label: 'Ja, graag' },
        { id: 'no', label: 'Liever niet' },
      ],
    }
  } else if (state.currentQuestion === 'lead-email' || state.currentQuestion === 'lead-edit-email') {
    inputConfig = { placeholder: 'Je e-mailadres', inputMode: 'email' }
  } else if (state.currentQuestion === 'lead-name' || state.currentQuestion === 'lead-edit-name' || state.currentQuestion === 'lead-name-pre-wa') {
    inputConfig = { placeholder: 'Je naam', inputMode: undefined }
  } else if (state.currentQuestion === 'lead-phone' || state.currentQuestion === 'lead-edit-phone') {
    inputConfig = { placeholder: '06 12 34 56 78', inputMode: 'tel', validate: isValidPhoneText }
  } else if (project.flowOverrides?.surveyFlow && state.currentQuestion === 'brancheAnders') {
    // Gated peiling-vrijetekst voor branche 'anders, namelijk'. Nooit actief
    // zonder surveyFlow, dus geen invloed op andere tenants.
    inputConfig = { placeholder: 'Bijvoorbeeld schilder, cateraar, webshop', inputMode: undefined }
  }
  const answeredCount = ['intent', 'brochureTrigger', 'lead', 'size', 'timeline', 'followup']
    .filter((k) => state.answers[k]).length
  const progress = (state.view === 'chat' && !isSurvey) ? { current: Math.min(6, Math.max(1, answeredCount + 1)), total: 6 } : null
  // De aanpassen-knop tonen we vanaf het moment dat er minimaal 1 antwoord is gegeven.
  const showAnswersButton = state.view === 'chat' && Object.values(state.answers).some(Boolean)
  return (
    <AppShell
      progress={progress}
      hideHeader={state.view === 'intro'}
      waLink={warmHandoffActive || serviceCardActive ? null : headerWaLink}
      onWaClick={onWaClick}
      phoneLink={warmHandoffActive || serviceCardActive ? null : headerPhoneLink}
      onPhoneClick={onPhoneClick}
      showAnswersButton={showAnswersButton}
      onAnswersOpen={() => setAnswersOpen(true)}
      onLogoClick={state.view === 'chat' ? onLogoClick : undefined}
    >
      {state.view === 'intro' && <IntroScreen onStart={start} />}
      {offerResume && (
        <SmartResumeBanner ageMs={ageMs} answersCount={answersCount} onDismiss={dismissResume} />
      )}
      {state.view === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 mx-auto w-full max-w-md">
          <ChatThread
            messages={state.messages}
            showTyping={(() => {
              // Typing-indicator-zichtbaarheid op basis van het wachtende item.
              // Bij een silent-pause (bewuste stilte na bv. site-plan) blijft
              // de indicator uit zodat de bezoeker rust krijgt om de bubble
              // te scannen. Anders: zichtbaar als er nog een bubble in de
              // queue staat zodat de bezoeker weet dat er iets aankomt.
              const queue = state.messageQueue || []
              if (queue.length === 0) return false
              const head = queue[0]
              if (head.kind === 'pause' && head.silent) return false
              return queue.some((m) => m.kind !== 'pause')
            })()}
            onBrochure={onBrochure}
            onUnitView={onUnitView}
            onCalcInteract={onCalcInteract}
            onCredionRequest={onCredionRequest}
            onHandoffAction={onHandoffAction}
            onServiceCardAction={onServiceCardAction}
            onServiceCardSubmitPhone={onServiceCardSubmitPhone}
            onWaRequest={requestWhatsAppOpen}
            onTopicJump={onTopicJump}
            onPortalClick={onPortalClick}
            onLeadFormSubmit={handleLeadFormSubmit}
            onM2Submit={onM2Submit}
            onReset={() => {
              clearPersisted()
              _id = 0
              dispatch({ type: 'RESET' })
            }}
          />
          {chipQuestion && (state.messageQueue?.length || 0) === 0 && !warmHandoffActive && !serviceCardActive && (
            <SuggestedChips options={chipQuestion.options} onPick={onChipPick} />
          )}
          {inputConfig && (state.messageQueue?.length || 0) === 0 && !warmHandoffActive && !serviceCardActive && (
            <ChatInput
              placeholder={inputConfig.placeholder}
              inputMode={inputConfig.inputMode}
              validate={inputConfig.validate}
              onSend={onChatInputSend}
            />
          )}
        </div>
      )}
      <AnswersSheet
        open={answersOpen}
        answers={state.answers}
        onClose={() => setAnswersOpen(false)}
        onEdit={onEditAnswer}
        onEditLeadField={onEditLeadField}
        onForgetLead={onForgetLead}
        onReset={() => {
          clearPersisted()
          _id = 0
          dispatch({ type: 'RESET' })
        }}
      />
      {/* Credion confirm-dialog tegen misclicks in de calc. */}
      <CredionConfirmDialog
        open={credionConfirmOpen}
        onConfirm={confirmCredionRequest}
        onCancel={cancelCredionRequest}
      />
      {/* OptionsSheet: bottom-sheet met alle moreInfo-onderwerpen. Wordt
          alleen gerenderd in moreInfo-state, buiten dat is de chip
          'Bekijk alle onderwerpen' niet zichtbaar dus geen trigger. */}
      {state.currentQuestion === 'moreInfo' && (
        <OptionsSheet
          open={optionsSheetOpen}
          onClose={() => setOptionsSheetOpen(false)}
          options={(() => {
            // Alle nog niet-gekozen info-chips, ongefilterd door
            // PRIMARY_CHIP_COUNT — de sheet toont per categorie alles.
            const order = MORE_INFO_PERSONA_ORDER[persona] || MORE_INFO_PERSONA_ORDER.onbekend
            return order
              .map((id) => ({ id, def: MORE_INFO_DEFS[id] }))
              .filter(({ id, def }) => def && !state.moreInfoSeen.includes(id) && !project.disabledTopics?.includes(id) && (!def.personas || def.personas.includes(persona)))
              .map(({ id, def }) => ({ id, label: def.label }))
          })()}
          onPick={(opt) => {
            // Sheet-keuze loopt door dezelfde dispatcher als inline chips
            // zodat we geen aparte handler-flow onderhouden.
            onChipPick(opt)
          }}
        />
      )}
      <DebugPanel
        open={state.debugOpen}
        state={state}
        score={score}
        persona={persona}
        stage={stage}
        temperature={temperature}
        onClose={toggleDebug}
        onReset={() => {
          clearPersisted()
          _id = 0
          dispatch({ type: 'RESET' })
        }}
      />
      {showRescue && (
        <RescueNudge
          project={project}
          onDismiss={() => setShowRescue(false)}
          onContact={() => {
            setShowRescue(false)
            trackEvent('direct-contact:requested', { from: 'rescue-nudge' })
            // Rescue-nudge "neem direct contact" = intent, geen Lead.
            fireMetaContact('direct-contact', { from: 'rescue-nudge' })
            // Opent WhatsApp met prebuilt opener naar Reppit. Bewust GEEN
            // lead-summary erbij want bezoeker heeft mogelijk nog niet
            // veel ingevuld — eerste-bericht moet kort en uitnodigend
            // zijn ipv een gigantische context-dump.
            const num = (project.whatsappNumber || '').replace(/[^0-9]/g, '')
            const projectName = project.displayName || project.name || 'het project'
            const msg = encodeURIComponent(`Hi Reppit, ik heb een vraag over ${projectName}:`)
            window.open(`https://wa.me/${num}?text=${msg}`, '_blank', 'noopener,noreferrer')
          }}
        />
      )}
      {showExitPrompt && (
        <ExitIntentPrompt onDismiss={dismissExitPrompt} />
      )}
    </AppShell>
  )
}
