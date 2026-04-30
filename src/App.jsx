import { useEffect, useReducer } from 'react'
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
import { parseLeadInput, mergeLead } from './lib/parseLead.js'

import AppShell from './components/AppShell.jsx'
import IntroScreen from './components/IntroScreen.jsx'
import ChatThread from './components/ChatThread.jsx'
import SuggestedChips from './components/SuggestedChips.jsx'
import ChatInput from './components/ChatInput.jsx'
import DebugPanel from './components/DebugPanel.jsx'

let _id = 0
const nextId = () => ++_id

const initial = {
  view: 'intro',
  messages: [],
  currentQuestion: null,
  answers: {},
  leadDraft: {},
  moreInfoSeen: [],
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

function pickMicroIntro(persona, intent) {
  if (persona === 'belegger') return 'helder voor jou tellen vooral verhuur en schaarste'
  if (intent?.id === 'units_beschikbaar') return 'helder de l units zijn nu het meest concreet beschikbaar xl is uit en xxl volgt later'
  if (intent?.id === 'prijzen_plattegronden') return 'duidelijk we sturen je zo plattegronden prijslijst en m² prijs'
  if (intent?.id === 'past_bij_bedrijf') return 'tof we kijken even waar de hofman aansluit op wat jij zoekt'
  if (intent?.id === 'kijkt_rond') return 'no stress laat me je in 30 seconden de essentie geven'
  return 'duidelijk we zetten direct de juiste info voor je klaar'
}

function userTextFromOpt(opt) {
  return opt.label
}

function buildAnswerSummary(answers) {
  const parts = []
  if (answers.intent) parts.push(answers.intent.label)
  if (answers.focus) parts.push(answers.focus.label)
  if (answers.size) parts.push(answers.size.label)
  if (answers.timeline) parts.push(answers.timeline.label)
  return parts.join('  en  ')
}

// max 5 a 6 chips voor moreInfo zoals brief vraagt
const MORE_INFO_DEFS = {
  location: { label: 'meer over locatie' },
  sitePlan: { label: 'situatietekening' },
  price: { label: 'prijslijst' },
  process: { label: 'aankoopproces' },
  investor: { label: 'belegger voordelen', personas: ['belegger', 'onbekend'] },
}

function moreInfoChips(persona, seen) {
  const opts = []
  for (const [id, def] of Object.entries(MORE_INFO_DEFS)) {
    if (seen.includes(id)) continue
    if (def.personas && !def.personas.includes(persona)) continue
    opts.push({ id, label: def.label })
  }
  opts.push({ id: '__continue', label: 'meteen verder' })
  return opts
}

function buildMoreInfoMessages(id) {
  switch (id) {
    case 'location':
      return [{ kind: 'location', payload: { location: project.location, projectName: project.displayName } }]
    case 'sitePlan':
      return [{ kind: 'site-plan', payload: { sitePlan: project.sitePlan } }]
    case 'price':
      return [{ kind: 'price', payload: { units: project.units } }]
    case 'process':
      return [{ kind: 'process', payload: { steps: project.process } }]
    case 'investor':
      return [{ kind: 'investor', payload: { benefits: project.investorBenefits, intro: 'kort wat de hofman voor beleggers interessant maakt' } }]
    default:
      return []
  }
}

function isValidPhoneText(text) {
  const stripped = (text || '').replace(/[\s-]/g, '')
  return /(?:\+?316|06)\d{8}/.test(stripped)
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial)

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

  // chip handler voor multi keuze stappen
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
      dispatch({ type: 'ANSWER', key: 'focus', value: opt, next: 'lead' })
      dispatch({
        type: 'APPEND',
        messages: [
          { kind: 'user-text', text: userTextFromOpt(opt) },
          { kind: 'bot-text', text: microIntro },
          { kind: 'gallery', payload: { images: project.gallery, intro: 'een paar sfeerbeelden van de hofman' } },
          { kind: 'bot-text', text: 'stel jezelf even kort voor voornaam mailadres en als je wilt je 06 zodat ik je info kan sturen' },
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
            { kind: 'bot-text', text: 'top tap je 06 in' },
          ],
        })
        dispatch({ type: 'SET_QUESTION', next: 'lead-phone' })
      } else {
        finishLead(state.leadDraft, [{ kind: 'user-text', text: userTextFromOpt(opt) }, { kind: 'bot-text', text: 'helemaal goed' }])
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
      dispatch({ type: 'ANSWER', key: 'size', value: opt, next: 'moreInfo' })
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
          { kind: 'bot-text', text: 'wil je nog ergens meer over weten of meteen verder' },
        ],
      })
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
          { kind: 'cta-card', payload: { waLink: wa, summary: sum } },
        ],
      })
      return
    }
  }

  // text handler voor chat input vrije tekst
  const onChatInputSend = (text) => {
    const q = state.currentQuestion
    if (q === 'lead') {
      handleLeadFreeText(text)
    } else if (q === 'lead-phone') {
      handleLeadPhoneText(text)
    }
  }

  function handleLeadFreeText(text) {
    const parsed = parseLeadInput(text)
    const draft = mergeLead(state.leadDraft, parsed)

    const userBubble = { kind: 'user-text', text }

    if (!draft.firstName && !draft.email) {
      dispatch({ type: 'LEAD_DRAFT', draft })
      dispatch({
        type: 'APPEND',
        messages: [
          userBubble,
          { kind: 'bot-text', text: 'kreeg er even niet helemaal uit wat je naam en mailadres zijn kun je ze opnieuw typen' },
        ],
      })
      return
    }

    if (!draft.email) {
      dispatch({ type: 'LEAD_DRAFT', draft })
      dispatch({
        type: 'APPEND',
        messages: [
          userBubble,
          { kind: 'bot-text', text: `dankje ${draft.firstName.toLowerCase()} en je mailadres` },
        ],
      })
      return
    }

    if (!draft.firstName) {
      dispatch({ type: 'LEAD_DRAFT', draft })
      dispatch({
        type: 'APPEND',
        messages: [
          userBubble,
          { kind: 'bot-text', text: 'kreeg je mailadres en hoe heet je' },
        ],
      })
      return
    }

    // beide gevonden eventueel ook telefoon
    if (draft.phone) {
      finishLead(draft, [userBubble])
      return
    }

    // vraag of we ook 06 mogen
    dispatch({ type: 'LEAD_DRAFT', draft })
    dispatch({
      type: 'APPEND',
      messages: [
        userBubble,
        { kind: 'bot-text', text: `dankje ${draft.firstName.toLowerCase()} wil je ook je 06 zodat ik je via whatsapp persoonlijk kan helpen` },
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
          { kind: 'bot-text', text: 'kreeg er geen 06 nummer uit kun je het opnieuw tikken' },
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
        { kind: 'bot-text', text: `dankje ${lead.firstName.toLowerCase()}` },
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

  // welke chips horen bij huidige stap
  let chipQuestion = null
  let inputConfig = null
  if (state.currentQuestion === 'intent') chipQuestion = flow.questions.intent
  else if (state.currentQuestion === 'focus') {
    chipQuestion = flow.questions[flow.focusVariant(derivePersona({ intent: state.answers.intent }))]
  } else if (state.currentQuestion === 'timeline') chipQuestion = flow.questions.timeline
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
        { id: 'yes', label: 'ja prima' },
        { id: 'no', label: 'liever niet' },
      ],
    }
  } else if (state.currentQuestion === 'lead') {
    inputConfig = { placeholder: 'je antwoord typ hier', inputMode: 'email' }
  } else if (state.currentQuestion === 'lead-phone') {
    inputConfig = { placeholder: '06 12 34 56 78', inputMode: 'tel', validate: isValidPhoneText }
  }

  const answeredCount = ['intent', 'focus', 'lead', 'timeline', 'size', 'followup']
    .filter((k) => state.answers[k]).length
  const progress = state.view === 'chat' ? { current: Math.min(6, Math.max(1, answeredCount + 1)), total: 6 } : null

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
            onBrochure={onBrochure}
            onReset={reset}
          />
          {chipQuestion && (
            <SuggestedChips
              options={chipQuestion.options}
              onPick={onChipPick}
            />
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
