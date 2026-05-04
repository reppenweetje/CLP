import { useEffect, useReducer } from 'react'
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

import AppShell from './components/AppShell.jsx'
import IntroScreen from './components/IntroScreen.jsx'
import ChatThread from './components/ChatThread.jsx'
import SuggestedChips from './components/SuggestedChips.jsx'
import ChatInput from './components/ChatInput.jsx'
import DebugPanel from './components/DebugPanel.jsx'

let _id = 0
const nextId = () => ++_id

const STORAGE_KEY = 'clp-state-v3'

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

function reducer(state, action) {
  switch (action.type) {
    case 'START_CHAT': {
      const intentQ = flow.questions.intent
      return {
        ...state,
        view: 'chat',
        messages: [
          { id: nextId(), kind: 'bot-text', text: 'Hoi, ik ben Jesse van REPP.' },
          { id: nextId(), kind: 'bot-text', text: 'Ik help je snel de juiste informatie over De Hofman te vinden.' },
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
    case 'RESET':
      return { ...initial, debugOpen: state.debugOpen }
    default:
      return state
  }
}

// Korte ack na de persona-keuze, direct gevolgd door USP-kaarten.
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

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial, (init) => {
    const loaded = loadPersisted()
    if (loaded) return { ...init, ...loaded, debugOpen: false }
    return init
  })

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

  const start = () => dispatch({ type: 'START_CHAT' })

  const onChipPick = (opt) => {
    const q = state.currentQuestion
    if (!q) return

    if (q === 'intent') {
      const personaNext = opt.persona || 'onbekend'
      const microIntro = pickMicroIntro(personaNext)
      const cards = uspCardOrder(personaNext)
      dispatch({ type: 'ANSWER', key: 'intent', value: opt, next: 'lead-name' })
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text: userTextFromOpt(opt) },
          { kind: 'bot-text', text: microIntro },
          { kind: 'usp-cards', payload: { cards } },
          { kind: 'bot-text', text: 'Wat is je naam?' },
        ],
      })
      return
    }

    if (q === 'lead-phoneAsk') {
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
          { kind: 'bot-text', text: 'Geen probleem. Ons nummer staat ook in de mail als je later wilt schakelen.' },
        ])
      }
      return
    }

    if (q === 'timeline') {
      dispatch({ type: 'ANSWER', key: 'timeline', value: opt, next: 'size' })
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text: userTextFromOpt(opt) },
          { kind: 'bot-text', text: flow.questions.size.label },
        ],
      })
      return
    }

    if (q === 'size') {
      const merged = { ...state.answers, size: opt }
      const unit = recommendUnit(merged, project)
      const personaNext = derivePersona(merged)
      const copy = recommendCopy(personaNext)
      const confidence = leadConfidence(merged)
      const messages = [
        { kind: 'user-text', text: userTextFromOpt(opt) },
      ]
      if (confidence >= 2) {
        messages.push(
          { kind: 'bot-text', text: `Op basis van je antwoorden lijkt vooral de ${unit.primary.type}-unit interessant.` },
          { kind: 'unit-card', payload: unit },
        )
      } else {
        messages.push(
          { kind: 'bot-text', text: 'Je hebt nog niet veel voorkeuren ingegeven. We sturen je eerst een overzicht van de beschikbare opties en kunnen via WhatsApp meedenken.' },
          { kind: 'unit-card', payload: unit },
        )
      }
      messages.push(
        { kind: 'bot-text', text: copy },
        { kind: 'bot-text', text: 'Wil je nog ergens meer over weten, of meteen verder?' },
      )
      dispatch({ type: 'ANSWER', key: 'size', value: opt, next: 'moreInfo' })
      dispatch({ type: 'APPEND', messages })
      return
    }

    if (q === 'moreInfo') {
      if (opt.id === '__continue') {
        dispatch({ type: 'SET_QUESTION', next: 'followup' })
        dispatch({
          type: 'APPEND',
          messages: [
            { kind: 'user-text', text: userTextFromOpt(opt) },
            { kind: 'bot-text', text: flow.questions.followup.label },
          ],
        })
      } else {
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
      dispatch({ type: 'ANSWER', key: 'followup', value: opt, next: null })
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text: userTextFromOpt(opt) },
          { kind: 'bot-text', text: tc.lead },
          { kind: 'bot-text', text: tc.body },
          { kind: 'cta-card', payload: { waLink: wa, summary: sum, brochureUrl: project.brochureUrl } },
        ],
      })
      return
    }
  }

  const onChatInputSend = (text) => {
    const q = state.currentQuestion
    if (q === 'lead-name') return handleLeadNameText(text)
    if (q === 'lead-email') return handleLeadEmailText(text)
    if (q === 'lead-phone') return handleLeadPhoneText(text)
  }

  function handleLeadNameText(text) {
    const parsed = parseLeadInput(text)
    const draft = mergeLead(state.leadDraft, parsed)
    const userBubble = { kind: 'user-text', text }

    if (!draft.firstName && !draft.email) {
      dispatch({ type: 'LEAD_DRAFT', draft })
      dispatch({
        type: 'APPEND',
        messages: [
          userBubble,
          { kind: 'bot-text', text: 'Kreeg je naam niet helemaal mee. Kun je het opnieuw typen?' },
        ],
      })
      return
    }

    if (draft.email && draft.firstName) {
      dispatch({ type: 'LEAD_DRAFT', draft })
      dispatch({
        type: 'APPEND',
        messages: [
          userBubble,
          { kind: 'bot-text', text: 'Dank. We zorgen dat je de brochure straks naar je toe krijgt.' },
          { kind: 'bot-text', text: 'Wij houden bij dit soort projecten vaak kort contact via WhatsApp, bijvoorbeeld over beschikbaarheid of als je nog vragen hebt. Vind je dat prettig?' },
        ],
      })
      dispatch({ type: 'SET_QUESTION', next: 'lead-phoneAsk' })
      return
    }

    if (draft.email && !draft.firstName) {
      dispatch({ type: 'LEAD_DRAFT', draft })
      dispatch({
        type: 'APPEND',
        messages: [
          userBubble,
          { kind: 'bot-text', text: 'Dank. En hoe heet je?' },
        ],
      })
      return
    }

    dispatch({ type: 'LEAD_DRAFT', draft })
    dispatch({
      type: 'APPEND',
      messages: [
        userBubble,
        { kind: 'bot-text', text: 'Mag ik je e-mailadres, zodat we je de brochure alvast kunnen mailen?' },
      ],
    })
    dispatch({ type: 'SET_QUESTION', next: 'lead-email' })
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

    dispatch({ type: 'LEAD_DRAFT', draft })
    dispatch({
      type: 'APPEND',
      messages: [
        userBubble,
        { kind: 'bot-text', text: 'Dank. We zorgen dat je de brochure straks naar je toe krijgt.' },
        { kind: 'bot-text', text: 'Wij houden bij dit soort projecten vaak kort contact via WhatsApp, bijvoorbeeld over beschikbaarheid of als je nog vragen hebt. Vind je dat prettig?' },
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
    const lead = { ...state.leadDraft, phone: parsed.phone }
    finishLead(lead, [{ kind: 'user-text', text }])
  }

  function finishLead(lead, prependMessages = []) {
    dispatch({ type: 'LEAD_DRAFT', draft: lead })
    dispatch({ type: 'ANSWER', key: 'lead', value: lead, next: 'timeline' })
    dispatch({
      type: 'APPEND',
      messages: [
        ...prependMessages,
        {
          kind: 'bot-text',
          text: 'Goed. Nog één vraag, zodat we weten welke plattegrond en prijsinformatie het meest relevant is.',
        },
        { kind: 'bot-text', text: flow.questions.timeline.label },
      ],
    })
  }

  const onBrochure = () => {
    if (typeof window !== 'undefined') {
      if (project.brochureUrl && project.brochureUrl !== '#') {
        window.open(project.brochureUrl, '_blank', 'noopener,noreferrer')
      } else {
        window.alert('Demo: brochure download zou hier starten.')
      }
    }
  }

  const headerWaLink = whatsAppDeeplink(project, state.answers.lead?.firstName || '', 'Graag info over De Hofman')

  const reset = () => {
    clearPersisted()
    _id = 0
    dispatch({ type: 'RESET' })
  }
  const toggleDebug = () => dispatch({ type: 'TOGGLE_DEBUG' })

  let chipQuestion = null
  let inputConfig = null
  if (state.currentQuestion === 'intent') chipQuestion = flow.questions.intent
  else if (state.currentQuestion === 'timeline') chipQuestion = flow.questions.timeline
  else if (state.currentQuestion === 'size') chipQuestion = flow.questions.size
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
        { id: 'yes', label: 'Ja, WhatsApp is handig' },
        { id: 'no', label: 'Liever alleen per mail' },
      ],
    }
  } else if (state.currentQuestion === 'lead-name') {
    inputConfig = { placeholder: 'Je naam', inputMode: undefined }
  } else if (state.currentQuestion === 'lead-email') {
    inputConfig = { placeholder: 'Je e-mailadres', inputMode: 'email' }
  } else if (state.currentQuestion === 'lead-phone') {
    inputConfig = { placeholder: '06 12 34 56 78', inputMode: 'tel', validate: isValidPhoneText }
  }

  const answeredCount = ['intent', 'lead', 'timeline', 'size', 'followup']
    .filter((k) => state.answers[k]).length
  const progress = state.view === 'chat' ? { current: Math.min(5, Math.max(1, answeredCount + 1)), total: 5 } : null

  return (
    <AppShell
      progress={progress}
      onDebugToggle={toggleDebug}
      debugOpen={state.debugOpen}
      hideHeader={state.view === 'intro'}
      waLink={headerWaLink}
    >
      {state.view === 'intro' && <IntroScreen onStart={start} />}

      {state.view === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 mx-auto w-full max-w-md">
          <ChatThread
            messages={state.messages}
            onBrochure={onBrochure}
            onReset={reset}
          />
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

      <DebugPanel
        open={state.debugOpen}
        state={state}
        score={score}
        persona={persona}
        stage={stage}
        temperature={temperature}
        onClose={toggleDebug}
        onReset={reset}
      />
    </AppShell>
  )
}
