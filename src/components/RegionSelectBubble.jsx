import { useState } from 'react'
import Avatar from './Avatar.jsx'

// RegionSelectBubble — multiselect voor de locatievoorkeur binnen Breda
// (BREDA peiling). Bezoeker vinkt één of meer windrichtingen aan en kan via
// "Anders, namelijk" een vrije regio typen. De keuze landt via
// onSubmit({ ids, labels, other }) als answer `waarInBreda`; pushSnapshot zet
// de leesbare samenvatting in attributes.waarInBreda. Nul aanvinken mag: dan
// telt het als "geen voorkeur". Alleen bereikbaar in survey-modus.
//
// Visueel gespiegeld op LocationSelectBubble.jsx (paper-bubble + Avatar links
// + Bevestig-knop + submitted-state), met een extra vrije-tekst-escape.
const REGION_OPTIONS = [
  { id: 'noord',   label: 'Breda-Noord' },
  { id: 'oost',    label: 'Breda-Oost' },
  { id: 'zuid',    label: 'Breda-Zuid' },
  { id: 'west',    label: 'Breda-West' },
  { id: 'centrum', label: 'Centrum' },
]

export default function RegionSelectBubble({ onSubmit }) {
  const [selected, setSelected] = useState([])
  const [otherOn, setOtherOn] = useState(false)
  const [otherText, setOtherText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function toggle(id) {
    if (submitted) return
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleConfirm() {
    if (submitted) return
    setSubmitted(true)
    const ids = selected
    const labels = REGION_OPTIONS.filter((o) => ids.includes(o.id)).map((o) => o.label)
    const other = otherOn ? otherText.trim() : ''
    onSubmit?.({ ids, labels, other })
  }

  const chosenLabels = REGION_OPTIONS.filter((o) => selected.includes(o.id)).map((o) => o.label)
  const otherSummary = otherOn && otherText.trim() ? [`anders: ${otherText.trim()}`] : []
  const summaryParts = [...chosenLabels, ...otherSummary]

  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">Regio</div>
            <div className="mt-3 flex flex-col gap-2">
              {REGION_OPTIONS.map((o) => {
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

              {/* Vrije-tekst-escape: "Anders, namelijk" onthult een tekstveld. */}
              <button
                type="button"
                onClick={() => { if (!submitted) setOtherOn((v) => !v) }}
                disabled={submitted}
                aria-pressed={otherOn}
                className={`flex items-center gap-3 w-full text-left rounded-2xl border px-3 py-2.5 transition ${
                  otherOn ? 'border-midnite bg-canvas-2' : 'border-mist-light bg-paper'
                } ${submitted ? 'opacity-60' : 'hover:border-midnite'}`}
              >
                <span
                  className={`flex-none w-5 h-5 rounded-md border flex items-center justify-center text-paper text-[13px] leading-none ${
                    otherOn ? 'bg-midnite border-midnite' : 'bg-paper border-mist'
                  }`}
                >
                  {otherOn ? '✓' : ''}
                </span>
                <span className="text-sm text-ink">Anders, namelijk</span>
              </button>
              {otherOn && !submitted && (
                <input
                  type="text"
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Bijvoorbeeld een wijk of gebied"
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                  name={`region-other-${Math.random().toString(36).slice(2, 8)}`}
                  className="repp-underline-input w-full text-sm text-ink px-1 py-2"
                />
              )}
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
                {summaryParts.length ? `✓ Genoteerd, ${summaryParts.join(', ')}.` : '✓ Genoteerd, geen voorkeur.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
