import { useEffect, useReducer, useRef } from 'react'
import { project } from './data/project.js'
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
} from './lib/recommendation.js'

import AppShell from './components/AppShell.jsx'
import IntroScreen from './components/IntroScreen.jsx'
import ChatThread from './components/ChatThread.jsx'
import SuggestedChips from './components/SuggestedChips.jsx'
import DebugPanel from './components/DebugPanel.jsx'

let _id = 0
const nextId = () => ++_id

const initial = {
  view: 'intro',
  messages: [],
  currentQuestion: null,
  answers: {},
  debugOpen: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'START_CHAT': {
      const intentQ = flow.questions.intent
      return {
        ...state,
        view: 'chat',
        messages: [
          { id: nextId(), kind: 'bot-text', text: 'hoi ik ben r van repp' },
          { id: nextId(), kind: 'bot-text', text: 'ik help je in 60 seconden ontdekken wat de hofman voor jou interessant maakt' },
          { id: nextId(), kind: 'bot-text', text: intentQ.label },
        ],
        currentQuestion: 'intent',
      }
    }

    case 'APPEND': {
      return {
        ...state,
        messages: [...state.messages, ...action.messages.map((m) => ({ id: nextId(), ...m }))],
      }
    }

    case 'ANSWER': {
      return {
        ...state,
        answers: { ...state.answers, [action.key]: action.value },
        currentQuestion: action.next ?? null,
      }
    }

    case 'TOGGLE_DEBUG':
      return { ...state, debugOpen: !state.debugOpen }

    case 'RESET':
      return { ...initial, debugOpen: state.debugOpen }

    default:
      return state
  }
}

// kies een korte content card en intro voor het micro value moment
function pickMicroIntro(persona, intent) {
  if (persona === 'belegger') return 'helder voor jou tellen vooral verhuur en schaarste'
  if (intent?.id === 'units_beschikbaar') return 'helder de l units zijn nu het meest concreet beschikbaar xl is uit en xxl volgt later'
  if (intent?.id === 'prijzen_plattegronden') return 'duidelijk we sturen je zo plattegronden prijslijst en m² prijs'
  if (intent?.id === 'past_bij_bedrijf') return 'tof we kijken even waar de hofman aansluit op wat jij zoekt'
  if (intent?.id === 'kijkt_rond') return 'no stress laat me je in 30 seconden de essentie geven'
  return 'duidelijk we zetten direct de juiste info voor je klaar'
}

function pickMicroCardId(persona, intent) {
  if (persona === 'belegger') return 'investor'
  if (intent?.id === 'units_beschikbaar') return 'scarcity'
  if (intent?.id === 'prijzen_plattegronden') return 'price'
  if (intent?.id === 'past_bij_bedrijf') return 'features'
  return 'project'
}

// build user message text from a chosen option
function userTextFromOpt(opt) {
  return opt.label
}

function leadSummary(lead) {
  const parts = [lead.firstName, lead.email]
  if (lead.phone) parts.push(lead.phone)
  return parts.join('  ')
}

function buildAnswerSummary(answers) {
  const parts = []
  if (answers.intent) parts.push(answers.intent.label)
  if (answers.focus) parts.push(answers.focus.label)
  if (answers.size) parts.push(answers.size.label)
  if (answers.timeline) parts.push(answers.timeline.label)
  return parts.join('  en  ')
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial)

  // ?debug=1 opent debug panel direct
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('debug') === '1') {
      dispatch({ type: 'TOGGLE_DEBUG' })
    }
  }, [])

  const persona = derivePersona(state.answers)
  const score = computeScore(state.answers)
  const stage = deriveStage(state.answers)
  const temperature = deriveTemperature(stage)

  const start = () => dispatch({ type: 'START_CHAT' })

  // when user picks a chip we append messages and set next question
  const onChipPick = (opt) => {
    const q = state.currentQuestion
    if (!q) return

    if (q === 'intent') {
      const personaNext = derivePersona({ intent: opt })
      const focusKey = flow.focusVariant(personaNext)
      const focusQ = flow.questions[focusKey]
      dispatch({ type: 'ANSWER', key: 'intent', value: opt, next: 'focus' })
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text: userTextFromOpt(opt) },
          { kind: 'bot-text', text: focusQ.label },
        ],
      })
      return
    }

    if (q === 'focus') {
      const merged = { ...state.answers, focus: opt }
      const personaNext = derivePersona(merged)
      const microIntro = pickMicroIntro(personaNext, state.answers.intent)
      const cardId = pickMicroCardId(personaNext, state.answers.intent)
      const card = project.contentCards.find((c) => c.id === cardId)
      dispatch({ type: 'ANSWER', key: 'focus', value: opt, next: null })
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text: userTextFromOpt(opt) },
          { kind: 'bot-text', text: microIntro },
          card ? { kind: 'content-card', payload: card } : null,
          { kind: 'bot-text', text: 'laat even weten hoe ik je het beste kan bereiken' },
          { kind: 'lead-form' },
        ].filter(Boolean),
      })
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
      dispatch({ type: 'ANSWER', key: 'size', value: opt, next: 'followup' })
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text: userTextFromOpt(opt) },
          {
            kind: 'bot-text',
            text: `op basis van je antwoorden lijkt vooral unit ${unit.primary.type.toLowerCase()} interessant`,
          },
          { kind: 'unit-card', payload: unit },
          { kind: 'bot-text', text: copy },
          { kind: 'bot-text', text: flow.questions.followup.label },
        ],
      })
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
          { kind: 'cta-card', payload: { waLink: wa, summary: sum } },
        ],
      })
      return
    }
  }

  const onLeadSubmit = (lead) => {
    dispatch({ type: 'ANSWER', key: 'lead', value: lead, next: 'timeline' })
    dispatch({
      type: 'APPEND',
      messages: [
        { kind: 'user-text', text: leadSummary(lead) },
        { kind: 'bot-text', text: `mooi ${lead.firstName.toLowerCase()}` },
        { kind: 'bot-text', text: flow.questions.timeline.label },
      ],
    })
  }

  const onBrochure = () => {
    if (typeof window !== 'undefined') {
      window.alert('demo brochure download zou hier starten')
    }
  }

  const reset = () => dispatch({ type: 'RESET' })
  const toggleDebug = () => dispatch({ type: 'TOGGLE_DEBUG' })

  // current question gives us the right chip-set
  let chipQuestion = null
  if (state.currentQuestion === 'intent') chipQuestion = flow.questions.intent
  else if (state.currentQuestion === 'focus') {
    chipQuestion = flow.questions[flow.focusVariant(derivePersona({ intent: state.answers.intent }))]
  } else if (state.currentQuestion === 'timeline') chipQuestion = flow.questions.timeline
  else if (state.currentQuestion === 'size') chipQuestion = flow.questions.size
  else if (state.currentQuestion === 'followup') chipQuestion = flow.questions.followup

  // progress: count answered chip-questions (5 total: intent, focus, timeline, size, followup)
  // + lead form. Total = 6
  const answeredCount = ['intent', 'focus', 'lead', 'timeline', 'size', 'followup']
    .filter((k) => state.answers[k]).length
  const progress = state.view === 'chat' ? { current: Math.max(1, answeredCount + 1), total: 6 } : null

  return (
    <AppShell
      progress={progress}
      onDebugToggle={toggleDebug}
      debugOpen={state.debugOpen}
      hideHeader={state.view === 'intro'}
    >
      {state.view === 'intro' && <IntroScreen onStart={start} />}

      {state.view === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 mx-auto w-full max-w-md">
          <ChatThread
            messages={state.messages}
            onLeadSubmit={onLeadSubmit}
            onBrochure={onBrochure}
            onReset={reset}
          />
          {chipQuestion && (
            <SuggestedChips options={chipQuestion.options} onPick={onChipPick} />
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
