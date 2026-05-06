import { trackEvent } from '../lib/analytics.js'

// Floating nudge die rechts-onderin verschijnt na 30s inactiviteit
// in een onvoltooide chat. Subtiel, niet overheersend; tap = direct
// contact-actie of dismiss. Doel: lower-funnel-bouncers terugwinnen.
export default function RescueNudge({ onDismiss, onContact, project }) {
  function handleContact() {
    trackEvent('dropoff-rescue:clicked', { action: 'contact' })
    onContact?.()
  }
  function handleDismiss() {
    trackEvent('dropoff-rescue:dismissed', {})
    onDismiss?.()
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-[320px] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-2xl border border-mist-light bg-paper shadow-lg px-4 py-3.5 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-midnite/10 flex items-center justify-center shrink-0 text-midnite text-[14px]" aria-hidden>💬</div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-ink">Vragen onderweg?</div>
          <div className="text-[11.5px] text-ink-soft mt-1 leading-snug">
            {project?.bot?.name || 'Jesse'} kan je ook direct helpen via WhatsApp of bellen.
          </div>
          <div className="flex items-center gap-1.5 mt-2.5">
            <button
              type="button"
              onClick={handleContact}
              className="text-[11.5px] text-paper bg-midnite hover:bg-midnite-soft px-2.5 py-1 rounded-full transition"
            >
              Direct contact
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11.5px] text-ink-mute hover:text-ink px-2 py-1 transition"
            >
              Later
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Sluit"
          className="text-ink-mute hover:text-ink text-[14px] -mt-1 -mr-1 leading-none p-1"
        >×</button>
      </div>
    </div>
  )
}
