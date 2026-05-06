import { trackEvent } from '../lib/analytics.js'

// Vriendelijke banner bovenaan de chat zodra een bezoeker terugkeert
// na ≥4u afwezigheid. Twee acties:
//   - "Verder waar je gebleven was" → state blijft staan, banner sluit
//   - "Begin opnieuw" → state + events wissen, page reload
// Geen intrusieve modal — past in de paper-stijl van de chat.
export default function SmartResumeBanner({ ageMs, onDismiss }) {
  const hours = Math.max(1, Math.round(ageMs / 3600000))
  const ageLabel = hours < 24 ? `${hours} uur` : `${Math.round(hours / 24)} dagen`

  function onContinue() {
    trackEvent('resume:accepted', { ageHours: hours })
    onDismiss()
  }
  function onRestart() {
    trackEvent('resume:rejected', { ageHours: hours })
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem('clp-state-v2')
      window.localStorage.removeItem('clp-events-v1')
      window.localStorage.removeItem('clp-session-id')
    } catch {}
    window.location.reload()
  }

  return (
    <div className="px-4 pt-3 pb-1 sticky top-0 z-20">
      <div className="rounded-2xl border border-gold/40 bg-paper shadow-sm px-4 py-3 flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center shrink-0 text-gold text-[14px]" aria-hidden>↻</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-ink">Je was ~{ageLabel} geleden bezig</div>
          <div className="text-[11.5px] text-ink-soft mt-0.5 leading-snug">
            We hebben je antwoorden bewaard. Verder waar je gebleven was, of opnieuw beginnen?
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onRestart}
            className="text-[11.5px] text-ink-soft hover:text-ink border border-mist hover:border-midnite px-2.5 py-1 rounded-full transition whitespace-nowrap"
          >
            Opnieuw
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="text-[11.5px] text-paper bg-midnite hover:bg-midnite-soft px-3 py-1 rounded-full transition whitespace-nowrap"
          >
            Verder
          </button>
        </div>
      </div>
    </div>
  )
}
