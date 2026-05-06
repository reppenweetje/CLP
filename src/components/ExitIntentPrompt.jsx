import { useState } from 'react'
import { trackEvent } from '../lib/analytics.js'

// Bottom-sheet style prompt die verschijnt als de bezoeker
// op het punt staat de pagina te verlaten (mouseleave bovenaan,
// of tab-hidden). Vraagt waarom — helpt ons passieve drop-offs te
// begrijpen die anders ongezien wegklikken.
//
// Antwoord-chips komen overeen met de bestaande afhaak-redenen
// zodat we de data in één bucket kunnen analyseren.
const REASONS = [
  { id: 'prijs',       label: 'Prijs te hoog' },
  { id: 'locatie',     label: 'Locatie past niet' },
  { id: 'oppervlakte', label: 'Oppervlakte past niet' },
  { id: 'huur',        label: 'Liever huren' },
  { id: 'tijd',        label: 'Geen tijd nu' },
  { id: 'anders',      label: 'Iets anders' },
]

export default function ExitIntentPrompt({ onDismiss }) {
  const [submitted, setSubmitted] = useState(false)
  const [extra, setExtra] = useState('')
  const [picked, setPicked] = useState(null)

  function pick(reason) {
    setPicked(reason)
    trackEvent('why-leaving:answered', { id: reason.id, label: reason.label })
  }
  function submitExtra() {
    if (extra.trim()) {
      trackEvent('why-leaving:freetext', { text: extra.slice(0, 200) })
    }
    setSubmitted(true)
    setTimeout(() => onDismiss?.(), 700)
  }
  function close() {
    trackEvent('why-leaving:dismissed', { picked: picked?.id || null })
    onDismiss?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm pointer-events-auto"
        onClick={close}
        aria-hidden
      />
      <div
        className="relative w-full sm:max-w-md mx-3 mb-3 sm:mb-0 rounded-2xl bg-paper shadow-2xl px-5 py-5 pointer-events-auto"
        role="dialog"
        aria-label="Help ons verbeteren"
      >
        {!submitted ? (
          <>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0 text-gold text-[14px]" aria-hidden>?</div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-ink">Help ons even verbeteren</div>
                <div className="text-[12px] text-ink-soft leading-snug mt-0.5">
                  Wat zoek je écht? We onthouden niets persoonlijks — alleen je antwoord.
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Sluit"
                className="text-ink-mute hover:text-ink text-[16px] -mt-1 -mr-1 leading-none p-1"
              >×</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => {
                const active = picked?.id === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => pick(r)}
                    className={
                      'text-[12px] rounded-full border px-3 py-1.5 transition ' +
                      (active
                        ? 'bg-midnite text-paper border-midnite'
                        : 'border-mist hover:border-midnite text-ink')
                    }
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>
            <div className="mt-3.5">
              <label className="block text-[11px] text-ink-mute mb-1">Of vertel het in eigen woorden</label>
              <textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="Optioneel — wat zoek je echt?"
                rows={2}
                className="w-full rounded-lg border border-mist bg-canvas focus:border-midnite outline-none text-[13px] px-3 py-2 resize-none"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="text-[12px] text-ink-mute hover:text-ink px-3 py-1.5 transition"
              >
                Sluit
              </button>
              <button
                type="button"
                onClick={submitExtra}
                disabled={!picked && !extra.trim()}
                className="text-[12px] text-paper bg-midnite hover:bg-midnite-soft disabled:opacity-50 disabled:cursor-not-allowed px-3.5 py-1.5 rounded-full transition"
              >
                Verstuur
              </button>
            </div>
          </>
        ) : (
          <div className="py-2 text-center">
            <div className="text-[14px] font-semibold text-ink">Dank je</div>
            <div className="text-[12px] text-ink-soft mt-1">We gebruiken dit om de chat beter te maken.</div>
          </div>
        )}
      </div>
    </div>
  )
}
