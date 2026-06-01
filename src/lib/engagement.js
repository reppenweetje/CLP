// Engagement-helpers voor smart resume, drop-off rescue en exit intent.
// Pure logica + custom hooks zonder UI — UI zit in eigen components zodat
// App.jsx slank blijft.

import { useEffect, useRef, useState } from 'react'
import { loadEvents, trackEvent } from './analytics.js'

const RESUME_THRESHOLD_MS = 4 * 60 * 60 * 1000  // 4u
const IDLE_THRESHOLD_MS   = 30 * 1000           // 30s

// ── Smart Resume ────────────────────────────────────────────────────────────
//
// Detecteert of de bezoeker terugkomt na ≥4u afwezigheid in een onvoltooide
// chat *met daadwerkelijke progressie*. We tonen alleen de banner wanneer
// er minstens één antwoord is gegeven — anders is er niets om te "verder
// gaan" en zou de banner een lege belofte zijn.
//
// `chatActive` = state.view === 'chat'  (chat is daadwerkelijk gestart)
// Returnt:
//   { offerResume, dismissResume, ageMs, answersCount }
//   - offerResume:   true als banner getoond moet worden
//   - dismissResume: user kiest "Verder" of klikt sluit-knop
//   - ageMs:         hoe oud is de gepauzeerde sessie
//   - answersCount:  aantal beantwoorde vragen (voor copy in banner)
// Welke events tellen als "echte progressie". Alle answered/submitted events
// zijn user-acties; rest is bot-rendering of system. Als één van deze gefired
// is heeft de bezoeker iets beantwoord en is er iets om naar terug te keren.
const PROGRESS_EVENT_TYPES = new Set([
  'intent:answered',
  'availability-check:answered',
  'brochure-trigger:answered',
  'afhaak-reason:answered',
  'lead-email:submitted',
  'lead-name:submitted',
  'lead-phone-ask:answered',
  'lead-phone:submitted',
  'size:answered',
  'timeline:answered',
  'followup:answered',
  'rent-match:registered',
])

export function useSmartResume(chatActive) {
  const [state, setState] = useState({ offerResume: false, ageMs: 0, answersCount: 0 })
  const offeredRef = useRef(false)

  useEffect(() => {
    if (!chatActive) return
    if (offeredRef.current) return
    if (typeof window === 'undefined') return

    const events = loadEvents()
    if (events.length === 0) return

    // Tellen alleen events die daadwerkelijke progressie betekenen.
    // Geen progressie = niets om te resumen = geen banner.
    const progressEvents = events.filter((e) => PROGRESS_EVENT_TYPES.has(e.type))
    if (progressEvents.length === 0) return

    const lastEvent = progressEvents[progressEvents.length - 1]
    const completed = events.some((e) => e.type === 'flow:complete')
    if (completed) return

    const ageMs = Date.now() - lastEvent.timestamp
    if (ageMs < RESUME_THRESHOLD_MS) return

    offeredRef.current = true
    setState({ offerResume: true, ageMs, answersCount: progressEvents.length })
    trackEvent('resume:offered', {
      ageHours: Math.round(ageMs / 3600000),
      answersCount: progressEvents.length,
    })
  }, [chatActive])

  const dismissResume = () => {
    setState((s) => ({ ...s, offerResume: false }))
  }

  return { ...state, dismissResume }
}

// ── Inactivity Rescue ────────────────────────────────────────────────────────
//
// Detecteert 30s zonder activiteit terwijl de bezoeker in chat-mode is en
// niet voltooid. Roept onTrigger() aan om een nudge-bubble te tonen.
// Vuurt maximaal één keer per sessie (per page-load) zodat we niet
// pesten.
export function useInactivityRescue({ active, onTrigger }) {
  const triggeredRef = useRef(false)
  const lastActivityRef = useRef(Date.now())
  const timerRef = useRef(null)

  useEffect(() => {
    if (!active) return
    if (typeof window === 'undefined') return

    function bumpActivity() {
      lastActivityRef.current = Date.now()
      if (timerRef.current) clearTimeout(timerRef.current)
      if (triggeredRef.current) return
      timerRef.current = setTimeout(check, IDLE_THRESHOLD_MS + 100)
    }
    function check() {
      if (triggeredRef.current) return
      if (Date.now() - lastActivityRef.current >= IDLE_THRESHOLD_MS) {
        triggeredRef.current = true
        trackEvent('dropoff-rescue:shown', { idleMs: Date.now() - lastActivityRef.current })
        onTrigger?.()
      }
    }

    const evts = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    for (const ev of evts) window.addEventListener(ev, bumpActivity, { passive: true })
    bumpActivity()
    return () => {
      for (const ev of evts) window.removeEventListener(ev, bumpActivity)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [active, onTrigger])
}

// ── Exit Intent ──────────────────────────────────────────────────────────────
//
// Detecteert wanneer de bezoeker op het punt staat de pagina te verlaten:
//   - desktop: mouseleave bovenaan (Y <= 10)
//   - alle platforms: visibilitychange naar hidden
// Vuurt één keer per sessie. Geeft een setter voor de UI.
export function useExitIntent({ active }) {
  const [showPrompt, setShowPrompt] = useState(false)
  const triggeredRef = useRef(false)

  useEffect(() => {
    if (!active) return
    if (typeof window === 'undefined') return

    function trigger(reason) {
      if (triggeredRef.current) return
      triggeredRef.current = true
      trackEvent('why-leaving:shown', { reason })
      setShowPrompt(true)
    }

    function onMouseLeave(e) {
      if (e.clientY <= 10) trigger('mouse-top')
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') trigger('tab-hidden')
    }

    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [active])

  const dismiss = () => setShowPrompt(false)
  return { showPrompt, dismiss }
}

// ── A/B variant assignment ──────────────────────────────────────────────────
//
// Plak een sticky variant ('a' of 'b') aan de bezoeker en bewaar 'm in
// localStorage zodat refresh hetzelfde resultaat geeft. Caller hangt copy
// of UX-keuze aan deze variant.
//
// LET OP: bewust andere key dan 'clp-cta-variant' (= IntroScreen CTA-knop
// rotatie A/B/C/D in src/lib/cta.js). Deze 'clp-variant' is binair a/b en
// stuurt copy in flow.js (intent/brochureTrigger/timeline labels). Door
// twee orthogonale dimensies te houden kunnen we beide experimenten
// onafhankelijk meten in Plausible.
const VARIANT_KEY = 'clp-variant'

export function getOrAssignVariant() {
  if (typeof window === 'undefined') return 'a'
  try {
    const existing = window.localStorage.getItem(VARIANT_KEY)
    if (existing === 'a' || existing === 'b') return existing
    const v = Math.random() < 0.5 ? 'a' : 'b'
    window.localStorage.setItem(VARIANT_KEY, v)
    return v
  } catch {
    return 'a'
  }
}

// Gebruik in componentcode:
//   const copy = pickByVariant(variant, { a: 'Variant A copy', b: 'Variant B copy' })
export function pickByVariant(variant, options) {
  return options[variant] ?? options.a ?? Object.values(options)[0]
}

// ── Intro-screen A/B variant ────────────────────────────────────────────────
//
// Bepaalt of een nieuwe bezoeker eerst de IntroScreen ziet ('show') of meteen
// in de chat landt ('skip'). 50/50 random bij eerste bezoek, sticky in
// localStorage zodat refreshes en revisits dezelfde ervaring krijgen.
// Variant wordt door analytics.js autoSessionProps automatisch op elk event
// gehangen als `introVariant`, dus Plausible/Supabase kunnen vergelijken
// op conversie-stappen (lead-capture, reservation, etc.) zonder dat elke
// trackEvent-call de variant expliciet hoeft mee te geven.
//
// Aparte key dan 'clp-variant' (copy A/B) en 'clp-cta-variant' (CTA-rotatie)
// zodat de drie dimensies onafhankelijk meetbaar blijven.
const INTRO_VARIANT_KEY = 'clp-intro-variant'

export function getOrAssignIntroVariant() {
  if (typeof window === 'undefined') return 'show'
  try {
    const existing = window.localStorage.getItem(INTRO_VARIANT_KEY)
    if (existing === 'show' || existing === 'skip') return existing
    const v = Math.random() < 0.5 ? 'show' : 'skip'
    window.localStorage.setItem(INTRO_VARIANT_KEY, v)
    return v
  } catch {
    return 'show'
  }
}
