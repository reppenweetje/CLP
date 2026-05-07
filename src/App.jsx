import { useEffect, useReducer, useState } from 'react'
import { project, uspCardOrder } from './data/project.js'
import { flow, getLabel } from './data/flow.js'
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
import { startNewSession, trackEvent } from './lib/analytics.js'
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
import AdminScreen from './screens/AdminScreen.jsx'
import SmartResumeBanner from './components/SmartResumeBanner.jsx'
import RescueNudge from './components/RescueNudge.jsx'
import ExitIntentPrompt from './components/ExitIntentPrompt.jsx'
import { useSmartResume, useInactivityRescue, useExitIntent, getOrAssignVariant } from './lib/engagement.js'
import { detectCurrentIp } from './lib/ipExclusion.js'

let _id = 0
const nextId = () => ++_id

const STORAGE_KEY = 'clp-state-v5'

const initial = {
  view: 'intro',
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
      // Eerste bubble direct in beeld (anders blijft het scherm leeg met
      // typing-indicator), de rest in de release-queue.
      return {
        ...state,
        view: 'chat',
        messages: [
          { id: nextId(), kind: 'bot-text', text: `Hoi, ik ben ${bot.name} van ${bot.org}.` },
        ],
        messageQueue: [
          { kind: 'bot-text', text: 'Om de juiste brochure en prijzen met je te delen heb ik een korte vraag.' },
          { kind: 'bot-text', text: getLabel('intent', copyVariant) },
        ],
        currentQuestion: 'intent',
      }
    }
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
  highlights: { label: 'Waarom De Hofman' },
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

function moreInfoChips(persona, seen, temperature) {
  const order = MORE_INFO_PERSONA_ORDER[persona] || MORE_INFO_PERSONA_ORDER.onbekend
  const opts = []
  for (const id of order) {
    const def = MORE_INFO_DEFS[id]
    if (!def) continue
    if (seen.includes(id)) continue
    if (def.personas && !def.personas.includes(persona)) continue
    opts.push({ id, label: def.label })
  }

  const directContact = { id: '__contact', label: 'Direct contact' }
  const callback = { id: '__callback', label: 'Laat Jann mij bellen' }

  // Hot of warm: contact-opties bovenaan, plus expliciete callback-chip.
  if (temperature === 'hot') return [callback, directContact, ...opts]
  if (temperature === 'warm') return [directContact, ...opts]
  return [...opts, directContact]
}

function buildMoreInfoMessages(id, persona) {
  switch (id) {
    case 'location':
      return [{ kind: 'location', payload: { location: project.location, projectName: project.displayName } }]
    case 'sitePlan':
      return [{ kind: 'site-plan', payload: { sitePlan: project.sitePlan, units: project.units, persona } }]
    case 'gallery':
      return [{
        kind: 'gallery',
        payload: {
          images: project.gallery,
          intro: 'Sfeerbeelden van de buitenkant en mogelijke inrichtingen.',
        },
      }]
    case 'highlights':
      return [{
        kind: 'highlights',
        payload: {
          highlights: project.highlights,
          intro: 'Wat De Hofman onderscheidt.',
        },
      }]
    case 'price':
      return [{ kind: 'price', payload: { units: project.units } }]
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
          intro: 'Wat De Hofman voor beleggers interessant maakt.',
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

// Hoe lang we wachten voordat de volgende bot-bubble verschijnt. Korter voor
// korte tekst, langer voor lange tekst en rich cards. Levert een typing-bubble
// gevoel zonder te traag te worden.
function computeReleaseDelay(message) {
  if (!message) return 500
  if (message.kind === 'bot-text') {
    const len = message.text?.length || 30
    return Math.max(450, Math.min(900, 350 + len * 9))
  }
  // Rich cards en interactieve bubbles vragen iets meer aandacht. Lijst is
  // synchroon met ChatThread renderkinds; nieuwe rich bubbles hier toevoegen.
  if (['site-plan', 'usp-cards', 'unit-card', 'gallery', 'investor', 'price', 'price-compare', 'location', 'cta-card', 'warm-handoff', 'service-card', 'brochure', 'highlights', 'process', 'planning', 'content-card'].includes(message.kind)) {
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
      }
    }
    return init
  })
  const [answersOpen, setAnswersOpen] = useState(false)
  const [showRescue, setShowRescue] = useState(false)
  const chatActive = state.view === 'chat'
  const flowComplete = state.messages.some((m) => m.kind === 'cta-card')

  // Smart resume: bezoeker komt terug na ≥4u in onvoltooide chat MET
  // progressie (≥1 beantwoorde vraag). Banner toont count zodat user
  // weet wat er bewaard is — geen lege belofte bij nul antwoorden.
  const { offerResume, ageMs, answersCount, dismissResume } = useSmartResume(chatActive && !flowComplete)

  // Inactiviteit rescue: 30s niets gedaan → floating nudge.
  useInactivityRescue({
    active: chatActive && !flowComplete && !showRescue,
    onTrigger: () => setShowRescue(true),
  })

  // Exit intent: cursor verlaat top of tab gaat hidden → why-leaving prompt.
  // Alleen actief als bezoeker iets heeft gedaan en nog niet voltooid is —
  // anders is het te invasief op een verse pageview.
  const exitActive = chatActive && !flowComplete && Object.keys(state.answers).length >= 2
  const { showPrompt: showExitPrompt, dismiss: dismissExitPrompt } = useExitIntent({ active: exitActive })

  // Bewaart de currentQuestion van vóór een lead-edit zodat we na het
  // bijwerken van email/naam/06 terug kunnen naar waar de bezoeker was.
  const [editReturnQuestion, setEditReturnQuestion] = useState(null)
  // Bewaart de WhatsApp-summary en de plek waar de bezoeker was, wanneer
  // we een WA-klik onderbreken om eerst de naam op te halen. Na de naam
  // bouwen we de WA-link met de juiste naam en openen 'm alsnog.
  const [pendingWa, setPendingWa] = useState(null)

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
    // IP-detectie zodat eventuele uitsluiting van team-traffic werkt.
    // Faalt-soft als netwerk weigert; gewoon doorgaan met tracking aan.
    detectCurrentIp().catch(() => {})
  }, [])

  const persona = derivePersona(state.answers)
  const score = computeScore(state.answers)
  const stage = deriveStage(state.answers)
  const temperature = deriveTemperature(stage)
  const buying = computeBuyingSignals(state.answers, state.behaviors)

  // Veilige momenten om de warm-handoff in te schieten. Tijdens lead-capture
  // of een sub-flow zoals financingAsk willen we niet onderbreken.
  const SAFE_HANDOFF_QUESTIONS = ['moreInfo', 'followup', null]
  const isSafeMoment = SAFE_HANDOFF_QUESTIONS.includes(state.currentQuestion)

  // De handoff bubble is "actief" zodra hij getoond is en de bezoeker nog
  // niets heeft gekozen. Tijdens deze fase verbergen we chip-bar, input en
  // header-shortcuts zodat de bubble zelf de enige interactie is. Geldt voor
  // zowel de losse warm-handoff bubble als de gecombineerde service-card.
  const warmHandoffActive = !!state.behaviors?.warmHandoffShown && !state.behaviors?.warmHandoffOutcome
  const serviceCardActive = state.messages.some((m) => m.kind === 'service-card' && !m.payload?.outcome)

  useEffect(() => {
    if (state.view !== 'chat') return
    if (state.behaviors?.warmHandoffShown) return
    if (buying.temperature !== 'hot') return
    if (!isSafeMoment) return
    // Wacht totdat de release-queue leeg is, anders breekt de handoff-bubble
    // door het sequentiële reveal-ritme heen.
    if ((state.messageQueue?.length || 0) > 0) return
    // Geen handoff als bezoeker al expliciet om direct contact heeft gevraagd.
    if (state.answers.followup) return

    const personaForCopy = buying.inferredPersona !== 'onbekend' ? buying.inferredPersona : persona
    const lead = state.answers.lead || {}
    const phoneDeclined = !lead.phone && state.behaviors?.phoneAskedDeclined === true

    const summary = buildCustomerWaSummary(state.answers, project)
    const wa = whatsAppDeeplink(project, lead.firstName || '', summary)
    const phoneLink = buildPhoneLink(project.phoneNumber)

    trackEvent('warm-handoff:shown', {
      persona: personaForCopy,
      declaredPersona: buying.declaredPersona,
      temperature: buying.temperature,
      score: buying.score,
      signalCount: buying.signals.length,
      signalIds: buying.signals.map((s) => s.id),
      currentQuestion: state.currentQuestion,
    })

    const handoffCopy = buildHandoffCopy(personaForCopy, project, {
      signals: buying.signals,
      name: lead.firstName || '',
      hasPhone: !!lead.phone,
      phoneDeclined,
    })
    dispatch({ type: 'WARM_HANDOFF_SHOWN' })
    dispatch({
      type: 'ENQUEUE',
      messages: [
        {
          kind: 'warm-handoff',
          payload: {
            copy: handoffCopy,
            salesTeam: project.salesTeam,
            hasPhone: !!lead.phone,
            waLink: wa,
            waSummary: summary,
            phoneLink,
            phoneDisplay: project.phoneNumber,
            outcome: null,
          },
        },
      ],
    })
  }, [
    state.view,
    state.behaviors?.warmHandoffShown,
    buying.temperature,
    buying.score,
    isSafeMoment,
    state.answers.followup,
    state.messageQueue?.length,
  ])

  // Sticky copy-variant voor flow-questions (intent/brochureTrigger/timeline).
  // Onafhankelijk van CTA-variant voor de IntroScreen-knop, zodat we
  // beide A/B-experimenten orthogonaal kunnen analyseren in Plausible.
  const copyVariant = getOrAssignVariant()

  const start = (variant) => {
    startNewSession()
    trackEvent('session:start', { variant, copyVariant })
    trackEvent('intro:cta-clicked', { variant, copyVariant })
    logSessionStartConsent()
    dispatch({ type: 'START_CHAT', bot: project.salesTeam?.bot, copyVariant })
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

  const onChipPick = (opt) => {
    const q = state.currentQuestion
    if (!q) return

    if (q === 'intent') {
      const personaNext = opt.persona || 'onbekend'
      trackEvent('intent:answered', { id: opt.id, label: opt.label, persona: personaNext })

      // Huur-intentie: De Hofman is een koop-project, dus wij kanaliseren
      // huur-interesse direct naar de rent-match queue. Geen availability,
      // geen brochure-ja, geen size/timeline; meteen huurprijs-range vragen
      // zodat we beleggers in De Hofman die hun unit willen verhuren later
      // kunnen koppelen aan deze bezoeker.
      if (opt.id === 'huur' || personaNext === 'huurder') {
        dispatch({ type: 'ANSWER', key: 'intent', value: answerValue(opt), next: 'rentRange' })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: 'Helder. De Hofman is een koop-project, maar er zijn beleggers die hun unit verhuren. Met je voorkeur kunnen we je in de toekomst koppelen aan een belegger als er een match is.' },
          { kind: 'bot-text', text: flow.questions.rentRange.label },
        ])
        return
      }

      const microIntro = pickMicroIntro(personaNext)
      const cards = uspCardOrder(personaNext)
      dispatch({ type: 'ANSWER', key: 'intent', value: answerValue(opt), next: 'availabilityCheck' })
      // Aankondiging vóór de carousel zodat de bezoeker begrijpt dat
      // 't om meerdere kaarten gaat en weet dat 'ie naar rechts kan
      // vegen. Voorkomt dat de eerste kaart als enige bron wordt
      // gezien.
      sendSequence(userTextFromOpt(opt), [
        { kind: 'bot-text', text: microIntro },
        { kind: 'bot-text', text: 'Ik laat je een paar kaarten zien met meer uitleg en de belangrijke aspecten van het project. Veeg naar rechts om ze allemaal te bekijken.' },
        { kind: 'usp-cards', payload: { cards } },
        { kind: 'bot-text', text: flow.questions.availabilityCheck.label },
      ])
      return
    }

    // Live beschikbaarheid eerder in de flow: bezoeker ziet de situatietekening
    // voor het brochure-moment; dat geeft urgentie en concrete context.
    if (q === 'availabilityCheck') {
      trackEvent('availability-check:answered', { id: opt.id, label: opt.label })
      const botMessages = []
      if (opt.id === 'ja') {
        botMessages.push(
          { kind: 'bot-text', text: 'Hier zijn de 14 units met de actuele status. Tik op een unit voor meer informatie over die unit.' },
          { kind: 'site-plan', payload: { sitePlan: project.sitePlan, units: project.units, persona } },
        )
      }
      botMessages.push({ kind: 'bot-text', text: getLabel('brochureTrigger', copyVariant) })
      dispatch({ type: 'ANSWER', key: 'availabilityCheck', value: answerValue(opt), next: 'brochureTrigger' })
      sendSequence(userTextFromOpt(opt), botMessages)
      return
    }

    if (q === 'brochureTrigger') {
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
          { kind: 'bot-text', text: flow.questions.size.label },
        ])
        return
      }

      dispatch({ type: 'ANSWER', key: 'brochureTrigger', value: answerValue(opt), next: 'lead-email' })
      // Privacy-claim is bewust verplaatst naar NA de email-input
      // (zie handleLeadEmailText). Voor de input tonen voelt drempel-
      // verhogend en is een afhaak-risico.
      sendSequence(userTextFromOpt(opt), [
        { kind: 'bot-text', text: 'Wat is je e-mailadres?' },
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
        dispatch({ type: 'ANSWER', key: 'afhaakReason', value: answerValue(opt), next: 'rentRange' })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: 'Begrijpelijk. Bij De Hofman zijn er ook beleggers die hun unit verhuren.' },
          { kind: 'bot-text', text: 'Met je voorkeur kunnen we je in de toekomst koppelen aan een belegger als er een match is.' },
          { kind: 'bot-text', text: flow.questions.rentRange.label },
        ])
        return
      }

      trackEvent('flow:complete', { stage: 'afhaak', persona })
      const customerSummary = customerAfhaakSummary(opt.id)
      const wa = whatsAppDeeplink(project, state.answers.lead?.firstName || '', customerSummary)
      dispatch({ type: 'ANSWER', key: 'afhaakReason', value: answerValue(opt), next: null })
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
      dispatch({ type: 'ANSWER', key: 'rentRange', value: answerValue(opt), next: 'lead-email' })
      dispatch({ type: 'BEHAVIOR_RENT_MATCH_REQUESTED' })
      sendSequence(userTextFromOpt(opt), [
        { kind: 'bot-text', text: 'Helder. Om je voorkeur op te kunnen slaan en contact op te kunnen nemen zodra er een match is, heb ik je gegevens nodig.' },
        { kind: 'bot-text', text: 'Wat is je e-mailadres?' },
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
      const personaNext = derivePersona(merged)
      const copy = recommendCopy(personaNext, project)
      const confidence = leadConfidence(merged)
      trackEvent('timeline:answered', { id: opt.id, label: opt.label, recommendedUnit: unit.primary?.type })

      // Bereken buying-signals NA timeline zodat we het hot-moment in deze flow
      // direct kunnen detecteren ipv via de losse useEffect (die zou een aparte
      // bubble lanceren bovenop de unit-card en juist de flood produceren).
      const buyingNext = computeBuyingSignals(merged, state.behaviors)
      const isHot = buyingNext.temperature === 'hot'

      if (isHot) {
        // Service-card-pad: 1 personal lead-in bubble + 1 gecombineerde card
        // die unit-aanbeveling en handoff in 1 visueel object presenteert.
        // Geen recommendCopy (duplicaat van microIntro) en geen "wil je meer
        // info" bot-text — die rol neemt de card zelf over.
        const personaForCard =
          buyingNext.inferredPersona !== 'onbekend' ? buyingNext.inferredPersona : personaNext
        const lead = state.answers.lead || {}
        const phoneDeclined = !lead.phone && state.behaviors?.phoneAskedDeclined === true
        const summary = buildCustomerWaSummary(merged, project)
        const wa = whatsAppDeeplink(project, lead.firstName || '', summary)
        const phoneLink = buildPhoneLink(project.phoneNumber)

        trackEvent('service-card:shown', {
          persona: personaForCard,
          declaredPersona: buyingNext.declaredPersona,
          temperature: buyingNext.temperature,
          score: buyingNext.score,
          signalCount: buyingNext.signals.length,
          signalIds: buyingNext.signals.map((s) => s.id),
          recommendedUnit: unit.primary?.type,
          confidence,
        })

        // Markeer warmHandoff als getoond zodat de aparte useEffect deze
        // bezoeker niet later alsnog een tweede handoff-bubble injecteert.
        dispatch({ type: 'WARM_HANDOFF_SHOWN' })
        dispatch({ type: 'ANSWER', key: 'timeline', value: answerValue(opt), next: 'moreInfo' })

        const leadIn =
          confidence >= 2
            ? lead.firstName
              ? `Helder, ${lead.firstName}. Met die timeline kijken we even gericht.`
              : 'Helder. Met die timeline kijken we even gericht.'
            : lead.firstName
            ? `Dank, ${lead.firstName}. We zetten de meest concrete optie even op een rij.`
            : 'Dank. We zetten de meest concrete optie even op een rij.'

        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: leadIn },
          {
            kind: 'service-card',
            payload: {
              unit,
              copy: buildHandoffCopy(personaForCard, project, {
                signals: buyingNext.signals,
                name: lead.firstName || '',
                hasPhone: !!lead.phone,
                phoneDeclined,
              }),
              salesTeam: project.salesTeam,
              hasPhone: !!lead.phone,
              phoneDisplay: lead.phone || '',
              waLink: wa,
              waSummary: summary,
              phoneLink,
              phoneTextDisplay: project.phoneNumber,
              outcome: null,
            },
          },
        ])
        return
      }

      // Niet-hot: huidige flow blijft ongewijzigd in deze ronde.
      const botMessages = []
      if (confidence >= 2) {
        botMessages.push(
          { kind: 'bot-text', text: `Op basis van je antwoorden lijkt vooral de ${unit.primary.type}-unit interessant.` },
          { kind: 'unit-card', payload: unit },
        )
      } else {
        botMessages.push(
          { kind: 'bot-text', text: 'Je hebt nog niet veel voorkeuren ingegeven. We sturen je eerst een overzicht van de beschikbare opties; via WhatsApp denken we graag mee.' },
          { kind: 'unit-card', payload: unit },
        )
      }
      botMessages.push(
        { kind: 'bot-text', text: copy },
        { kind: 'bot-text', text: 'Wil je nog ergens meer over weten, of direct contact?' },
      )
      dispatch({ type: 'ANSWER', key: 'timeline', value: answerValue(opt), next: 'moreInfo' })
      sendSequence(userTextFromOpt(opt), botMessages)
      return
    }

    if (q === 'moreInfo') {
      if (opt.id === '__callback') {
        const merged = state.answers
        const personaNext = derivePersona(merged)
        trackEvent('warm-handoff:callback-chip-clicked', { persona: personaNext, temperature: buying.temperature })
        dispatch({ type: 'WARM_HANDOFF_OUTCOME', outcome: 'callback' })
        if (state.answers.lead?.phone) {
          sendSequence(userTextFromOpt(opt), [
            { kind: 'bot-text', text: `Top. Mijn collega Jann belt je ${getCallbackPromise(getTimeContext())} op ${state.answers.lead.phone}.` },
          ])
        } else {
          sendSequence(userTextFromOpt(opt), [
            { kind: 'bot-text', text: 'Top. Wat is je 06-nummer? Dan zorg ik dat Jann je belt.' },
          ])
          dispatch({ type: 'SET_QUESTION', next: 'lead-phone' })
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
        return
      }
      if (opt.id === 'financing') {
        trackEvent('more-info:viewed', { id: opt.id, label: opt.label })
        dispatch({ type: 'MORE_INFO_SEEN', id: 'financing' })
        dispatch({ type: 'BEHAVIOR_MORE_INFO_VIEWED', id: 'financing' })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: 'Onze partner Credion kan vrijblijvend met je meedenken over de financiering.' },
          { kind: 'bot-text', text: 'Mag ik je naam, e-mailadres en 06 met Credion delen voor een vrijblijvende financieringsscan? Zonder je akkoord doen we dat niet.' },
        ])
        dispatch({ type: 'SET_QUESTION', next: 'financingAsk' })
        return
      }
      trackEvent('more-info:viewed', { id: opt.id, label: opt.label })
      dispatch({ type: 'MORE_INFO_SEEN', id: opt.id })
      dispatch({ type: 'BEHAVIOR_MORE_INFO_VIEWED', id: opt.id })
      sendSequence(userTextFromOpt(opt), buildMoreInfoMessages(opt.id, persona))
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
        })
        sendSequence(userTextFromOpt(opt), [
          { kind: 'bot-text', text: 'Top. We delen je gegevens met Credion. Zij nemen vrijblijvend contact met je op.' },
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

      // Credion-eerst-pad heeft 06 nodig (geen Yes/No-vraag). Focus op de
      // belofte dat Credion belt; brochure is bonus.
      if (state.behaviors?.credionRequested && !draft.phone) {
        sendSequence(text, [
          { kind: 'bot-text', text: 'Dank. De brochure komt zo naar je toe.' },
          { kind: 'bot-text', text: 'We delen je gegevens met Credion zodat ze je kunnen bellen voor de financieringsscan. Hoe we daarmee omgaan staat in onze [privacystatement](/privacy.html).' },
          { kind: 'bot-text', text: `Top, ${draft.firstName}.` },
          { kind: 'bot-text', text: 'Tot slot je 06, zodat Credion je kan bereiken voor de scan.' },
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
        { kind: 'bot-text', text: 'Dank. Ik zorg dat de brochure zo naar je toe komt.' },
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
    // Brochure is bonus zodat de bezoeker iets te lezen heeft tot Credion belt.
    if (state.behaviors?.credionRequested) {
      sendSequence(text, [
        { kind: 'bot-text', text: 'Dank. De brochure komt zo naar je toe.' },
        { kind: 'bot-text', text: 'We delen je gegevens met Credion zodat ze je kunnen bellen voor de financieringsscan. Hoe we daarmee omgaan staat in onze [privacystatement](/privacy.html).' },
        { kind: 'bot-text', text: 'Wat is je naam?' },
      ])
      dispatch({ type: 'SET_QUESTION', next: 'lead-name' })
      return
    }
    sendSequence(text, [
      { kind: 'bot-text', text: 'Dank. Ik zorg dat de brochure zo naar je toe komt.' },
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
    // en vraag direct het nummer.
    if (state.behaviors?.credionRequested && !draft.phone) {
      sendSequence(text, [
        { kind: 'bot-text', text: `Top, ${firstName}.` },
        { kind: 'bot-text', text: 'Tot slot je 06, zodat Credion je zo snel mogelijk kan bellen voor de financieringsscan.' },
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

  function finishLead(lead, prependMessages = []) {
    dispatch({ type: 'LEAD_DRAFT', draft: lead })

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

    // prependMessages bevat user-text + eventueel een bot-bevestiging.
    // Splits: user-text direct, bot-bubbles in de queue.
    const userMsgs = prependMessages.filter((m) => m.kind === 'user-text')
    const botPrepend = prependMessages.filter((m) => m.kind !== 'user-text')
    if (userMsgs.length > 0) {
      dispatch({ type: 'APPEND', messages: userMsgs })
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
      })
      const credionConfirmation = [
        { kind: 'bot-text', text: 'Top. We delen je gegevens met Credion zodat ze je zo snel mogelijk kunnen bellen voor de financieringsscan.' },
        { kind: 'bot-text', text: 'De brochure sturen we naar het opgegeven e-mailadres, zodat je het project alvast rustig kunt doorlezen.' },
      ]
      const sizeTail = sizeDone
        ? []
        : [
            { kind: 'bot-text', text: 'Nog een korte vraag, zodat we de juiste prijslijst en plattegronden meesturen.' },
            { kind: 'bot-text', text: flow.questions.size.label },
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
          { kind: 'bot-text', text: flow.questions.size.label },
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
    // Header WhatsApp-icoon: gebruikt een generieke summary. Door dezelfde
    // requestWhatsAppOpen heen zodat ook hier de naam-vraag werkt.
    requestWhatsAppOpen(e, '', 'header')
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
  const onCredionRequest = () => {
    trackEvent('credion:requested-from-calc', {
      hasEmail: !!state.answers.lead?.email,
      hasName: !!state.answers.lead?.firstName,
      hasPhone: !!state.answers.lead?.phone,
    })

    const lead = state.answers.lead || {}
    const hasEmail = !!lead.email
    const hasName  = !!lead.firstName

    // Pad A: gegevens al binnen → bestaande Yes/No-vraag
    if (hasEmail && hasName) {
      sendSequence('Vraag financieringsscan via Credion', [
        { kind: 'bot-text', text: 'Onze partner Credion kan vrijblijvend met je meedenken over de financiering.' },
        { kind: 'bot-text', text: 'Mag ik je naam, e-mailadres en 06 met Credion delen voor een vrijblijvende financieringsscan? Zonder je akkoord doen we dat niet.' },
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
    sendSequence('Vraag financieringsscan via Credion', [
      { kind: 'bot-text', text: 'Mooi. Onze partner Credion belt je zo snel mogelijk om vrijblijvend met je door de financiering te lopen.' },
      { kind: 'bot-text', text: 'We sturen je ook meteen de brochure per mail, zodat je het project alvast rustig kunt doorlezen.' },
      { kind: 'bot-text', text: 'Wat is je e-mailadres?' },
    ])
    // Markeer brochureTrigger impliciet als "ja" (bezoeker heeft via deze
    // route al voor brochure + Credion gekozen) — zodat de flow na lead-
    // capture niet alsnog de brochure-vraag stelt. ANSWER wint van
    // SET_QUESTION wanneer ze in dezelfde dispatch-batch zitten, dus deze
    // ANSWER dispatch heeft expliciet next: 'lead-email' nodig.
    dispatch({ type: 'ANSWER', key: 'brochureTrigger', value: { id: 'ja', label: 'Ja, stuur maar', _msgCountBefore: state.messages.length, _viaCredion: true }, next: 'lead-email' })
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
  // bericht zodat de visuele feedback (groen vinkje, "Jann belt je vandaag")
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

    // Bij callback en geen telefoon-nummer in lead: ask phone.
    if (outcome === 'callback' && !state.answers.lead?.phone) {
      dispatch({
        type: 'ENQUEUE',
        messages: [
          { kind: 'bot-text', text: 'Top. Wat is je 06-nummer? Dan zorg ik dat Jann je belt.' },
        ],
      })
      dispatch({ type: 'SET_QUESTION', next: 'lead-phone' })
    }
  }

  const onPhoneClick = () => {
    trackEvent('cta:phone-clicked', { location: 'header' })
  }

  const headerWaLink = whatsAppDeeplink(project, state.answers.lead?.firstName || '', 'Graag info over De Hofman')
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
  if (state.currentQuestion === 'intent') chipQuestion = flow.questions.intent
  else if (state.currentQuestion === 'availabilityCheck') chipQuestion = flow.questions.availabilityCheck
  else if (state.currentQuestion === 'brochureTrigger') chipQuestion = flow.questions.brochureTrigger
  else if (state.currentQuestion === 'afhaakReasons' || state.currentQuestion === 'afhaakReason') chipQuestion = flow.questions.afhaakReasons
  else if (state.currentQuestion === 'rentRange') chipQuestion = flow.questions.rentRange
  else if (state.currentQuestion === 'size') chipQuestion = flow.questions.size
  else if (state.currentQuestion === 'timeline') chipQuestion = flow.questions.timeline
  else if (state.currentQuestion === 'followup') chipQuestion = flow.questions.followup
  else if (state.currentQuestion === 'moreInfo') {
    chipQuestion = {
      key: 'moreInfo',
      label: 'meer info',
      options: moreInfoChips(persona, state.moreInfoSeen, buying.temperature),
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
  }

  const answeredCount = ['intent', 'brochureTrigger', 'lead', 'size', 'timeline', 'followup']
    .filter((k) => state.answers[k]).length
  const progress = state.view === 'chat' ? { current: Math.min(6, Math.max(1, answeredCount + 1)), total: 6 } : null

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
    >
      {state.view === 'intro' && <IntroScreen onStart={start} />}

      {offerResume && (
        <SmartResumeBanner ageMs={ageMs} answersCount={answersCount} onDismiss={dismissResume} />
      )}

      {state.view === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 mx-auto w-full max-w-md">
          <ChatThread
            messages={state.messages}
            showTyping={(state.messageQueue?.length || 0) > 0}
            onBrochure={onBrochure}
            onUnitView={onUnitView}
            onCalcInteract={onCalcInteract}
            onCredionRequest={onCredionRequest}
            onHandoffAction={onHandoffAction}
            onServiceCardAction={onServiceCardAction}
            onServiceCardSubmitPhone={onServiceCardSubmitPhone}
            onWaRequest={requestWhatsAppOpen}
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
            // Hergebruik de bestaande direct-contact-flow (dispatched
            // 'flow:complete' met stage sales_ready). De bezoeker krijgt
            // de service-card / handoff zonder extra UI te bouwen.
            trackEvent('direct-contact:requested', { from: 'rescue-nudge' })
            const lead = state.answers.lead || {}
            if (project.phoneNumber) {
              window.open(buildPhoneLink(project.phoneNumber), '_self')
            } else {
              const summary = buildCustomerWaSummary(state.answers, project)
              window.open(whatsAppDeeplink(project, lead.firstName || '', summary), '_blank', 'noopener,noreferrer')
            }
          }}
        />
      )}

      {showExitPrompt && (
        <ExitIntentPrompt onDismiss={dismissExitPrompt} />
      )}
    </AppShell>
  )
}
