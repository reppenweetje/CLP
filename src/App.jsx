import { useEffect, useReducer, useState } from 'react'
import { project, uspCardOrder } from './data/project.js'
import { flow } from './data/flow.js'
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
  leadConfidence,
} from './lib/recommendation.js'
import { parseLeadInput, mergeLead } from './lib/parseLead.js'
import { startNewSession, trackEvent } from './lib/analytics.js'

import AppShell from './components/AppShell.jsx'
import IntroScreen from './components/IntroScreen.jsx'
import ChatThread from './components/ChatThread.jsx'
import SuggestedChips from './components/SuggestedChips.jsx'
import ChatInput from './components/ChatInput.jsx'
import DebugPanel from './components/DebugPanel.jsx'
import AnswersSheet from './components/AnswersSheet.jsx'
import AdminScreen from './screens/AdminScreen.jsx'

let _id = 0
const nextId = () => ++_id

const STORAGE_KEY = 'clp-state-v5'

const initial = {
  view: 'intro',
  messages: [],
  currentQuestion: null,
  answers: {},
  leadDraft: {},
  moreInfoSeen: [],
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
const ANSWER_ORDER = ['intent', 'availabilityCheck', 'brochureTrigger', 'afhaakReason', 'size', 'timeline', 'followup']

function downstreamKeys(fromKey) {
  const idx = ANSWER_ORDER.indexOf(fromKey)
  if (idx === -1) return [fromKey]
  return ANSWER_ORDER.slice(idx)
}

function reducer(state, action) {
  switch (action.type) {
    case 'START_CHAT': {
      const intentQ = flow.questions.intent
      return {
        ...state,
        view: 'chat',
        messages: [
          { id: nextId(), kind: 'bot-text', text: 'Hoi, ik ben Jesse van REPP.' },
          { id: nextId(), kind: 'bot-text', text: 'Om de juiste brochure en prijzen met je te delen heb ik een korte vraag.' },
          { id: nextId(), kind: 'bot-text', text: intentQ.label },
        ],
        currentQuestion: 'intent',
      }
    }
    case 'APPEND':
      return {
        ...state,
        messages: [...state.messages, ...action.messages.map((m) => ({ id: nextId(), ...m }))],
      }
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
      return {
        ...state,
        messages: state.messages.slice(0, idx),
        answers: newAnswers,
        currentQuestion: action.key === 'followup' || action.key === 'timeline' || action.key === 'size' ? action.key : action.key,
        moreInfoSeen: ['size', 'timeline', 'followup'].includes(action.key) ? [] : state.moreInfoSeen,
      }
    }
    case 'FORGET_LEAD':
      return { ...state, leadDraft: {}, answers: { ...state.answers, lead: undefined } }
    case 'RESET':
      return { ...initial, debugOpen: state.debugOpen }
    default:
      return state
  }
}

function pickMicroIntro(persona) {
  if (persona === 'belegger') return 'Helder. Voor jou tellen vooral verhuurbaarheid, schaarste en prijs per m².'
  if (persona === 'eigen_gebruiker') return 'Helder. Dan zijn vooral bereikbaarheid, parkeren en flexibele indeling belangrijk.'
  if (persona === 'beide') return 'Helder. Dan kijken we vanuit beide kanten: eigen gebruik én beleggingsperspectief.'
  return 'Goed om te weten. We tonen de informatie die voor jouw situatie het meest relevant is.'
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

const MORE_INFO_DEFS = {
  location: { label: 'Meer over locatie' },
  sitePlan: { label: 'Situatietekening' },
  price: { label: 'Prijslijst' },
  process: { label: 'Aankoopproces' },
  brochure: { label: 'Open brochure' },
  investor: { label: 'Belegger voordelen', personas: ['belegger', 'beide', 'onbekend'] },
}

function moreInfoChips(persona, seen) {
  const opts = []
  for (const [id, def] of Object.entries(MORE_INFO_DEFS)) {
    if (seen.includes(id)) continue
    if (def.personas && !def.personas.includes(persona)) continue
    opts.push({ id, label: def.label })
  }
  opts.push({ id: '__continue', label: 'Meteen verder' })
  return opts
}

function buildMoreInfoMessages(id) {
  switch (id) {
    case 'location':
      return [{ kind: 'location', payload: { location: project.location, projectName: project.displayName } }]
    case 'sitePlan':
      return [{ kind: 'site-plan', payload: { sitePlan: project.sitePlan, units: project.units } }]
    case 'price':
      return [{ kind: 'price', payload: { units: project.units } }]
    case 'process':
      return [{ kind: 'process', payload: { steps: project.process } }]
    case 'brochure':
      return [{ kind: 'brochure', payload: { url: project.brochureUrl, hero: project.hero, projectName: project.displayName } }]
    case 'investor':
      return [{ kind: 'investor', payload: { benefits: project.investorBenefits, intro: 'Wat De Hofman voor beleggers interessant maakt.' } }]
    default:
      return []
  }
}

function isValidPhoneText(text) {
  const stripped = (text || '').replace(/[\s-]/g, '')
  return /^(?:\+316\d{8}|316\d{8}|06\d{8})$/.test(stripped)
}

function capitalize(s) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
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
    if (loaded) return { ...init, ...loaded, debugOpen: false }
    return init
  })
  const [answersOpen, setAnswersOpen] = useState(false)

  useEffect(() => {
    if (state.view === 'chat') persist(state)
  }, [state])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('debug') === '1') dispatch({ type: 'TOGGLE_DEBUG' })
  }, [])

  const persona = derivePersona(state.answers)
  const score = computeScore(state.answers)
  const stage = deriveStage(state.answers)
  const temperature = deriveTemperature(stage)

  const start = (variant) => {
    startNewSession()
    trackEvent('session:start', { variant })
    trackEvent('intro:cta-clicked', { variant })
    dispatch({ type: 'START_CHAT' })
  }

  // Helper: maakt een answer-value met _msgCountBefore zodat ROLLBACK
  // weet tot waar in de messages array geknipt moet worden.
  const answerValue = (opt) => ({
    ...opt,
    _msgCountBefore: state.messages.length,
  })

  const onChipPick = (opt) => {
    const q = state.currentQuestion
    if (!q) return

    if (q === 'intent') {
      const personaNext = opt.persona || 'onbekend'
      const microIntro = pickMicroIntro(personaNext)
      const cards = uspCardOrder(personaNext)
      trackEvent('intent:answered', { id: opt.id, label: opt.label, persona: personaNext })
      dispatch({ type: 'ANSWER', key: 'intent', value: answerValue(opt), next: 'availabilityCheck' })
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text: userTextFromOpt(opt) },
          { kind: 'bot-text', text: microIntro },
          { kind: 'usp-cards', payload: { cards } },
          { kind: 'bot-text', text: flow.questions.availabilityCheck.label },
        ],
      })
      return
    }

    // Live beschikbaarheid eerder in de flow: bezoeker ziet de situatietekening
    // voor het brochure-moment; dat geeft urgentie en concrete context.
    if (q === 'availabilityCheck') {
      trackEvent('availability-check:answered', { id: opt.id, label: opt.label })
      const messages = [{ kind: 'user-text', text: userTextFromOpt(opt) }]
      if (opt.id === 'ja') {
        messages.push(
          { kind: 'bot-text', text: 'Hier zijn de 14 units met de actuele status. Tik op een unit voor de specs.' },
          { kind: 'site-plan', payload: { sitePlan: project.sitePlan, units: project.units } },
        )
      }
      messages.push({ kind: 'bot-text', text: flow.questions.brochureTrigger.label })
      dispatch({ type: 'ANSWER', key: 'availabilityCheck', value: answerValue(opt), next: 'brochureTrigger' })
      dispatch({ type: 'APPEND', messages })
      return
    }

    if (q === 'brochureTrigger') {
      trackEvent('brochure-trigger:answered', { id: opt.id, label: opt.label, isAfhaak: !!opt.afhaak })

      if (opt.afhaak) {
        dispatch({ type: 'ANSWER', key: 'brochureTrigger', value: answerValue(opt), next: 'afhaakReasons' })
        dispatch({
          type: 'APPEND',
          messages: [
            { kind: 'user-text', text: userTextFromOpt(opt) },
            { kind: 'bot-text', text: 'Geen probleem.' },
            { kind: 'bot-text', text: flow.questions.afhaakReasons.label },
          ],
        })
        return
      }

      // Brochure-ja, lead al bekend? Sla lead-capture over en spring naar size.
      if (state.answers.lead) {
        dispatch({ type: 'ANSWER', key: 'brochureTrigger', value: answerValue(opt), next: 'size' })
        dispatch({
          type: 'APPEND',
          messages: [
            { kind: 'user-text', text: userTextFromOpt(opt) },
            { kind: 'bot-text', text: 'Top, we sturen je de juiste info.' },
            { kind: 'bot-text', text: flow.questions.size.label },
          ],
        })
        return
      }

      dispatch({ type: 'ANSWER', key: 'brochureTrigger', value: answerValue(opt), next: 'lead-email' })
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text: userTextFromOpt(opt) },
          { kind: 'bot-text', text: 'Wat is je e-mailadres?' },
        ],
      })
      return
    }

    // Afhaak-pad: registreer reden, sluit af met sterke WhatsApp-uitnodiging.
    if (q === 'afhaakReasons') {
      trackEvent('afhaak-reason:answered', { id: opt.id, label: opt.label })
      trackEvent('flow:complete', { stage: 'afhaak', persona })
      const wa = whatsAppDeeplink(project, state.answers.lead?.firstName || '', `Geen match: ${opt.label.toLowerCase()}`)
      dispatch({ type: 'ANSWER', key: 'afhaakReason', value: answerValue(opt), next: null })
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text: userTextFromOpt(opt) },
          { kind: 'bot-text', text: 'Dank voor je eerlijkheid.' },
          { kind: 'bot-text', text: 'Misschien kunnen we via WhatsApp samen kijken naar wat wel past. Sommige projecten staan nog niet online en we denken graag mee.' },
          {
            kind: 'cta-card',
            payload: {
              waLink: wa,
              summary: `Niet matchend: ${opt.label}`,
              hideBrochure: true,
            },
          },
        ],
      })
      return
    }

    if (q === 'lead-phoneAsk') {
      trackEvent('lead-phone-ask:answered', { id: opt.id, label: opt.label })
      if (opt.id === 'yes') {
        dispatch({
          type: 'APPEND',
          messages: [
            { kind: 'user-text', text: userTextFromOpt(opt) },
            { kind: 'bot-text', text: 'Wat is je 06-nummer?' },
          ],
        })
        dispatch({ type: 'SET_QUESTION', next: 'lead-phone' })
      } else {
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
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text: userTextFromOpt(opt) },
          { kind: 'bot-text', text: flow.questions.timeline.label },
        ],
      })
      return
    }

    if (q === 'timeline') {
      const merged = { ...state.answers, timeline: opt }
      const unit = recommendUnit(merged, project)
      const personaNext = derivePersona(merged)
      const copy = recommendCopy(personaNext)
      const confidence = leadConfidence(merged)
      trackEvent('timeline:answered', { id: opt.id, label: opt.label, recommendedUnit: unit.primary?.type })
      const messages = [{ kind: 'user-text', text: userTextFromOpt(opt) }]
      if (confidence >= 2) {
        messages.push(
          { kind: 'bot-text', text: `Op basis van je antwoorden lijkt vooral de ${unit.primary.type}-unit interessant.` },
          { kind: 'unit-card', payload: unit },
        )
      } else {
        messages.push(
          { kind: 'bot-text', text: 'Je hebt nog niet veel voorkeuren ingegeven. We sturen je eerst een overzicht van de beschikbare opties; via WhatsApp denken we graag mee.' },
          { kind: 'unit-card', payload: unit },
        )
      }
      messages.push(
        { kind: 'bot-text', text: copy },
        { kind: 'bot-text', text: 'Wil je nog ergens meer over weten, of meteen verder?' },
      )
      dispatch({ type: 'ANSWER', key: 'timeline', value: answerValue(opt), next: 'moreInfo' })
      dispatch({ type: 'APPEND', messages })
      return
    }

    if (q === 'moreInfo') {
      if (opt.id === '__continue') {
        trackEvent('more-info:continue', {})
        dispatch({ type: 'SET_QUESTION', next: 'followup' })
        dispatch({
          type: 'APPEND',
          messages: [
            { kind: 'user-text', text: userTextFromOpt(opt) },
            { kind: 'bot-text', text: flow.questions.followup.label },
          ],
        })
      } else {
        trackEvent('more-info:viewed', { id: opt.id, label: opt.label })
        dispatch({ type: 'MORE_INFO_SEEN', id: opt.id })
        dispatch({
          type: 'APPEND',
          messages: [
            { kind: 'user-text', text: userTextFromOpt(opt) },
            ...buildMoreInfoMessages(opt.id),
          ],
        })
      }
      return
    }

    if (q === 'followup') {
      const merged = { ...state.answers, followup: opt }
      const personaNext = derivePersona(merged)
      const stageNext = deriveStage(merged)
      const tc = thankYouCopy(stageNext, personaNext, state.answers.lead?.firstName)
      const sum = buildAnswerSummary(merged)
      const wa = whatsAppDeeplink(project, state.answers.lead?.firstName, sum)
      trackEvent('followup:answered', { id: opt.id, label: opt.label })
      trackEvent('flow:complete', { stage: stageNext, persona: personaNext })
      dispatch({ type: 'ANSWER', key: 'followup', value: answerValue(opt), next: null })
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text: userTextFromOpt(opt) },
          { kind: 'bot-text', text: tc.lead },
          { kind: 'bot-text', text: tc.body },
          { kind: 'cta-card', payload: { waLink: wa, summary: sum } },
        ],
      })
      return
    }
  }

  const onChatInputSend = (text) => {
    const q = state.currentQuestion
    if (q === 'lead-email') return handleLeadEmailText(text)
    if (q === 'lead-name') return handleLeadNameText(text)
    if (q === 'lead-phone') return handleLeadPhoneText(text)
  }

  function handleLeadEmailText(text) {
    const parsed = parseLeadInput(text)
    const draft = mergeLead(state.leadDraft, parsed)
    const userBubble = { kind: 'user-text', text }
    const triedEmail = text.includes('@')

    if (!draft.email) {
      dispatch({ type: 'LEAD_DRAFT', draft })
      dispatch({
        type: 'APPEND',
        messages: [
          userBubble,
          {
            kind: 'bot-text',
            text: triedEmail
              ? 'Het mailadres lijkt niet helemaal te kloppen. Kun je het opnieuw tikken?'
              : 'Daar zat geen mailadres in. Kun je het opnieuw typen?',
          },
        ],
      })
      return
    }

    trackEvent('lead-email:submitted', { email: draft.email })

    if (draft.firstName) {
      dispatch({ type: 'LEAD_DRAFT', draft })
      dispatch({
        type: 'APPEND',
        messages: [
          userBubble,
          { kind: 'bot-text', text: 'Dank. Ik zorg dat deze zo naar je toe komt.' },
          { kind: 'bot-text', text: `Top, ${draft.firstName}.` },
          { kind: 'bot-text', text: 'We houden bij dit soort projecten vaak kort contact via WhatsApp, bijvoorbeeld over beschikbaarheid of als je nog vragen hebt. Vind je dat prettig?' },
        ],
      })
      dispatch({ type: 'SET_QUESTION', next: 'lead-phoneAsk' })
      return
    }

    dispatch({ type: 'LEAD_DRAFT', draft })
    dispatch({
      type: 'APPEND',
      messages: [
        userBubble,
        { kind: 'bot-text', text: 'Dank. Ik zorg dat deze zo naar je toe komt.' },
        { kind: 'bot-text', text: 'Oh wacht. Ook nog handig om je naam te weten, zodat we weten aan wie we het sturen.' },
        { kind: 'bot-text', text: 'Wat is je naam?' },
      ],
    })
    dispatch({ type: 'SET_QUESTION', next: 'lead-name' })
  }

  function handleLeadNameText(text) {
    const parsed = parseLeadInput(text)
    const fallbackFirst = text.trim().split(/\s+/)[0]
    const firstName = parsed.firstName || (fallbackFirst ? capitalize(fallbackFirst) : null)

    if (!firstName) {
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text },
          { kind: 'bot-text', text: 'Kreeg je naam niet helemaal mee. Kun je het opnieuw typen?' },
        ],
      })
      return
    }

    trackEvent('lead-name:submitted', { firstName })
    const draft = { ...state.leadDraft, firstName, email: parsed.email || state.leadDraft.email }
    dispatch({ type: 'LEAD_DRAFT', draft })
    dispatch({
      type: 'APPEND',
      messages: [
        { kind: 'user-text', text },
        { kind: 'bot-text', text: `Top, ${firstName}.` },
        { kind: 'bot-text', text: 'We houden bij dit soort projecten vaak kort contact via WhatsApp, bijvoorbeeld over beschikbaarheid of als je nog vragen hebt. Vind je dat prettig?' },
      ],
    })
    dispatch({ type: 'SET_QUESTION', next: 'lead-phoneAsk' })
  }

  function handleLeadPhoneText(text) {
    const parsed = parseLeadInput(text)
    if (!parsed.phone) {
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text },
          { kind: 'bot-text', text: 'Daar zat geen geldig 06-nummer in. Kun je het opnieuw tikken?' },
        ],
      })
      return
    }
    trackEvent('lead-phone:submitted', { phone: parsed.phone })
    const lead = { ...state.leadDraft, phone: parsed.phone }
    finishLead(lead, [{ kind: 'user-text', text }])
  }

  function finishLead(lead, prependMessages = []) {
    dispatch({ type: 'LEAD_DRAFT', draft: lead })
    dispatch({ type: 'ANSWER', key: 'lead', value: lead, next: 'size' })
    dispatch({
      type: 'APPEND',
      messages: [
        ...prependMessages,
        { kind: 'bot-text', text: 'Goed. Nog even, zodat we de juiste prijslijst en plattegronden meesturen.' },
        { kind: 'bot-text', text: flow.questions.size.label },
      ],
    })
  }

  const onBrochure = () => {
    trackEvent('cta:brochure-clicked', { location: state.currentQuestion || 'thankyou' })
    if (typeof window !== 'undefined' && project.brochureUrl && project.brochureUrl !== '#') {
      window.open(project.brochureUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const onWaClick = () => {
    trackEvent('cta:whatsapp-clicked', { location: 'header' })
  }

  const headerWaLink = whatsAppDeeplink(project, state.answers.lead?.firstName || '', 'Graag info over De Hofman')

  // Wijzig een eerder gegeven antwoord vanuit de antwoorden-sheet:
  // de flow rolt terug naar dat punt en de bezoeker mag opnieuw kiezen.
  const onEditAnswer = (key) => {
    trackEvent('answer:edit', { key })
    dispatch({ type: 'ROLLBACK', key })
    // Re-prompt de vraag onder zijn target index
    const questionLabel = key === 'afhaakReason'
      ? flow.questions.afhaakReasons.label
      : flow.questions[key]?.label
    if (questionLabel) {
      dispatch({
        type: 'APPEND',
        messages: [{ kind: 'bot-text', text: questionLabel }],
      })
    }
  }

  const onForgetLead = () => {
    trackEvent('answer:forget-lead', {})
    dispatch({ type: 'FORGET_LEAD' })
  }

  const toggleDebug = () => dispatch({ type: 'TOGGLE_DEBUG' })

  let chipQuestion = null
  let inputConfig = null
  if (state.currentQuestion === 'intent') chipQuestion = flow.questions.intent
  else if (state.currentQuestion === 'availabilityCheck') chipQuestion = flow.questions.availabilityCheck
  else if (state.currentQuestion === 'brochureTrigger') chipQuestion = flow.questions.brochureTrigger
  else if (state.currentQuestion === 'afhaakReasons' || state.currentQuestion === 'afhaakReason') chipQuestion = flow.questions.afhaakReasons
  else if (state.currentQuestion === 'size') chipQuestion = flow.questions.size
  else if (state.currentQuestion === 'timeline') chipQuestion = flow.questions.timeline
  else if (state.currentQuestion === 'followup') chipQuestion = flow.questions.followup
  else if (state.currentQuestion === 'moreInfo') {
    chipQuestion = {
      key: 'moreInfo',
      label: 'meer info',
      options: moreInfoChips(persona, state.moreInfoSeen),
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
  } else if (state.currentQuestion === 'lead-email') {
    inputConfig = { placeholder: 'Je e-mailadres', inputMode: 'email' }
  } else if (state.currentQuestion === 'lead-name') {
    inputConfig = { placeholder: 'Je naam', inputMode: undefined }
  } else if (state.currentQuestion === 'lead-phone') {
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
      waLink={headerWaLink}
      onWaClick={onWaClick}
      showAnswersButton={showAnswersButton}
      onAnswersOpen={() => setAnswersOpen(true)}
    >
      {state.view === 'intro' && <IntroScreen onStart={start} />}

      {state.view === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 mx-auto w-full max-w-md">
          <ChatThread messages={state.messages} onBrochure={onBrochure} />
          {chipQuestion && (
            <SuggestedChips options={chipQuestion.options} onPick={onChipPick} />
          )}
          {inputConfig && (
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
        onForgetLead={onForgetLead}
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
    </AppShell>
  )
}
