import { trackEvent } from '../lib/analytics.js'

// Vriendelijke banner bovenaan de chat zodra een bezoeker terugkeert
// na ≥4u afwezigheid in een chat met daadwerkelijke progressie.
// Twee acties:
//   - "Verder" → banner sluit, scrollt naar laatste bericht zodat user
//     direct ziet WAAR hij/zij gebleven was (anders lijkt 't of er niets
//     gebeurt)
//   - "Opnieuw" → state + events wissen, page reload
// Geen intrusieve modal — past in de paper-stijl van de chat.
export default function SmartResumeBanner({ ageMs, answersCount = 0, onDismiss }) {
  const hours = Math.max(1, Math.round(ageMs / 3600000))
  const ageLabel = hours < 24 ? `${hours} uur` : `${Math.round(hours / 24)} dagen`

  function onContinue() {
    trackEvent('resume:accepted', { ageHours: hours, answersCount })
    onDismiss()
    // Twee-laagse feedback zodat 't nooit als dood-knop voelt:
    //  1. scroll het chat-thread-container naar onderkant (laatste bericht
    //     in beeld) — instant zodat de bezoeker direct ziet waar 'ie was
    //  2. korte pulse-highlight op het laatste bericht zodat 't oog 'm
    //     direct vindt
    setTimeout(() => {
      if (typeof window === 'undefined') return
      const msgs = document.querySelectorAll('[data-msg-idx]')
      const last = msgs[msgs.length - 1]
      if (!last) return
      // Vind de scroll-eigenaar (chat-thread `overflow-y-auto`).
      let el = last.parentElement
      while (el && el !== document.body) {
        const overflowY = getComputedStyle(el).overflowY
        if (overflowY === 'auto' || overflowY === 'scroll') {
          // Instant scroll — smooth blokkeert in headless/preview, en
          // gebruiker wil sowieso onmiddellijke feedback.
          el.scrollTop = el.scrollHeight
          break
        }
        el = el.parentElement
      }
      // Pulse-highlight om de aandacht te trekken op waar je was.
      last.classList.add('clp-resume-pulse')
      setTimeout(() => last.classList.remove('clp-resume-pulse'), 1400)
    }, 50)
  }
  function onRestart() {
    trackEvent('resume:rejected', { ageHours: hours, answersCount })
    if (typeof window === 'undefined') return
    try {
      // Wis alle clp-* state keys behalve consent-log en variant-keys.
      // Door dynamisch te scannen ben je niet afhankelijk van een
      // hardcoded version-suffix (bv. clp-state-v5 vandaag, v6 morgen).
      const keys = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (!k) continue
        if (k.startsWith('clp-state-')) keys.push(k)
        if (k === 'clp-events-v1') keys.push(k)
        if (k === 'clp-session-id') keys.push(k)
      }
      for (const k of keys) window.localStorage.removeItem(k)
    } catch {}
    window.location.reload()
  }

  // Copy past zich aan: bij 1 antwoord = "1 antwoord bewaard", >1 = "X antwoorden bewaard"
  const savedCopy = answersCount === 1
    ? '1 antwoord bewaard.'
    : `${answersCount} antwoorden bewaard.`

  return (
    <div className="px-4 pt-3 pb-1 sticky top-0 z-20">
      <div className="rounded-2xl border border-gold/40 bg-paper shadow-sm px-4 py-3 flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center shrink-0 text-gold text-[15px]" aria-hidden>↻</span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink">Je was ~{ageLabel} geleden bezig</div>
          <div className="text-[12.5px] text-ink-soft mt-0.5 leading-snug">
            {savedCopy} Verder waar je gebleven was, of opnieuw beginnen?
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onRestart}
            className="text-[12.5px] text-ink-soft hover:text-ink border border-mist hover:border-midnite px-2.5 py-1 rounded-full transition whitespace-nowrap"
          >
            Opnieuw
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="text-[12.5px] text-paper bg-midnite hover:bg-midnite-soft px-3 py-1 rounded-full transition whitespace-nowrap"
          >
            Verder
          </button>
        </div>
      </div>
    </div>
  )
}
