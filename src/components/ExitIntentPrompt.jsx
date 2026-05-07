import { useEffect, useState } from 'react'
import { trackEvent } from '../lib/analytics.js'

// Bottom-sheet style prompt die verschijnt als de bezoeker
// op het punt staat de pagina te verlaten (mouseleave bovenaan,
// of tab-hidden). Vraagt waarom, helpt ons passieve drop-offs te
// begrijpen die anders ongezien wegklikken.
//
// Antwoord-chips komen overeen met de bestaande afhaak-redenen
// zodat we de data in één bucket kunnen analyseren. Visueel
// uitgelijnd met de overige bottom-sheets in de app: rounded-t-3xl,
// drag-handle, REPP-tag in plaats van generieke icoon-badge,
// slide-in-bottom animatie + ESC-sluit.
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

  // ESC sluit de sheet, conform de andere bottom-sheets in de app
  // (SuggestedChips info, OptionsSheet, CredionConfirmDialog).
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked])

  function pick(reason) {
    setPicked(reason)
    trackEvent('why-leaving:answered', { id: reason.id, label: reason.label })
  }
  function submitExtra() {
    if (extra.trim()) {
      trackEvent('why-leaving:freetext', { text: extra.slice(0, 200) })
    }
    setSubmitted(true)
    setTimeout(() => onDismiss?.(), 900)
  }
  function close() {
    trackEvent('why-leaving:dismissed', { picked: picked?.id || null })
    onDismiss?.()
  }

  const canSubmit = !!picked || !!extra.trim()

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center pointer-events-none">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm pointer-events-auto fade-up"
        onClick={close}
        aria-hidden
      />
      <div
        className="relative pointer-events-auto bg-paper rounded-t-3xl sm:rounded-3xl sm:max-w-md sm:mx-3 shadow-[0_-4px_30px_rgba(15,15,112,0.18)] sm:shadow-2xl slide-in-bottom overflow-hidden"
        role="dialog"
        aria-label="Help ons even verbeteren"
      >
        {!submitted ? (
          <>
            {/* Drag-handle: visuele cue dat dit een sheet is + tap-target
                om te sluiten op mobile. Verborgen op desktop want centered
                card is geen sheet. */}
            <button
              type="button"
              onClick={close}
              aria-label="Sluit"
              className="sm:hidden w-full pt-3 pb-1 flex items-center justify-center group"
            >
              <span className="w-10 h-1 rounded-full bg-mist group-hover:bg-mist-light transition" aria-hidden />
            </button>

            <div className="px-5 pt-4 sm:pt-6 pb-2 relative">
              <button
                type="button"
                onClick={close}
                aria-label="Sluit"
                className="hidden sm:block absolute top-4 right-4 text-ink-mute hover:text-ink text-[18px] leading-none p-1"
              >×</button>

              <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1.5">
                Momentje
              </div>
              <div className="text-[17px] font-semibold text-ink leading-snug">
                Voor je verder gaat
              </div>
              <div className="text-[13.5px] text-ink-soft leading-relaxed mt-1.5">
                Help ons even leren wat je miste. Eén tap is genoeg, je antwoord blijft anoniem.
              </div>
            </div>

            <div className="px-5 pt-4">
              <div className="text-[10.5px] tracking-[0.16em] text-ink-mute uppercase font-medium mb-2">
                Wat speelt er
              </div>
              <div className="flex flex-wrap gap-1.5">
                {REASONS.map((r) => {
                  const active = picked?.id === r.id
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => pick(r)}
                      aria-pressed={active}
                      className={
                        'text-[13.5px] rounded-full border px-3.5 py-2 transition active:scale-[0.98] leading-none ' +
                        (active
                          ? 'bg-midnite text-paper border-midnite shadow-sm'
                          : 'bg-paper border-mist hover:border-midnite hover:bg-canvas-2 text-ink')
                      }
                    >
                      {r.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="px-5 pt-4 pb-1">
              <div className="text-[10.5px] tracking-[0.16em] text-ink-mute uppercase font-medium mb-2">
                Of in eigen woorden
              </div>
              <textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="Optioneel, wat zoek je echt?"
                rows={2}
                maxLength={400}
                className="w-full rounded-xl border border-mist bg-canvas focus:border-midnite focus:bg-paper outline-none text-[14px] px-3.5 py-2.5 resize-none transition leading-relaxed placeholder:text-ink-mute/70"
              />
            </div>

            <div className="mt-4 px-5 py-3.5 flex items-center justify-end gap-2 border-t border-mist-light bg-canvas/50">
              <button
                type="button"
                onClick={close}
                className="text-[13.5px] text-ink-soft hover:text-ink px-4 py-2.5 transition"
              >
                Sluit
              </button>
              <button
                type="button"
                onClick={submitExtra}
                disabled={!canSubmit}
                className={
                  'text-[14px] font-medium px-5 py-2.5 rounded-full transition active:scale-[0.98] ' +
                  (canSubmit
                    ? 'text-paper bg-midnite hover:bg-midnite-soft shadow-sm'
                    : 'text-ink-mute bg-canvas-2 border border-mist-light cursor-not-allowed')
                }
              >
                Verstuur
              </button>
            </div>
          </>
        ) : (
          <div className="px-5 py-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="text-[16px] font-semibold text-ink">Dank je</div>
            <div className="text-[13.5px] text-ink-soft mt-1.5 leading-relaxed">
              We gebruiken dit om de chat beter te maken voor de volgende bezoeker.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
