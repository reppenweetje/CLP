import { useState } from 'react'
import Avatar from './Avatar.jsx'

// ConfigMultiSelectBubble — generieke multiselect voor multi-choice steps in
// de config-gedreven survey-engine (engine:'config'). Bezoeker vinkt één of
// meer opties aan en bevestigt. De selectie landt via onSubmit(ids, labels).
// Nul aanvinken mag: dan telt het als "geen antwoord". Alleen bereikbaar in
// config-survey-modus (deze bubble wordt nergens anders gedispatcht).
//
// Visueel gespiegeld op LocationSelectBubble.jsx (paper-bubble + Avatar links
// + Bevestig-knop + submitted-state), maar volledig data-gedreven via props
// zodat elke multi-choice step 'm kan hergebruiken zonder eigen component.
export default function ConfigMultiSelectBubble({ options = [], label, onSubmit }) {
  const [selected, setSelected] = useState([])
  const [submitted, setSubmitted] = useState(false)

  function toggle(id) {
    if (submitted) return
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleConfirm() {
    if (submitted) return
    setSubmitted(true)
    const ids = selected
    const labels = options.filter((o) => ids.includes(o.id)).map((o) => o.label)
    onSubmit?.(ids, labels)
  }

  const chosenLabels = options.filter((o) => selected.includes(o.id)).map((o) => o.label)

  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">Meerkeuze</div>
            <div className="mt-3 flex flex-col gap-2">
              {options.map((o) => {
                const isOn = selected.includes(o.id)
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggle(o.id)}
                    disabled={submitted}
                    aria-pressed={isOn}
                    className={`flex items-center gap-3 w-full text-left rounded-2xl border px-3 py-2.5 transition ${
                      isOn ? 'border-midnite bg-canvas-2' : 'border-mist-light bg-paper'
                    } ${submitted ? 'opacity-60' : 'hover:border-midnite'}`}
                  >
                    <span
                      className={`flex-none w-5 h-5 rounded-md border flex items-center justify-center text-paper text-[13px] leading-none ${
                        isOn ? 'bg-midnite border-midnite' : 'bg-paper border-mist'
                      }`}
                    >
                      {isOn ? '✓' : ''}
                    </span>
                    <span className="text-sm text-ink">{o.label}</span>
                  </button>
                )
              })}
            </div>
            {!submitted ? (
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full mt-4 bg-midnite hover:bg-midnite-soft text-paper text-sm font-medium py-2.5 rounded-full transition"
              >
                Bevestig
              </button>
            ) : (
              <div className="mt-4 text-sm text-emerald-700 font-medium">
                {chosenLabels.length ? `✓ Genoteerd, ${chosenLabels.join(', ')}.` : '✓ Genoteerd.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
