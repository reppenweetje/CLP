import { useState } from 'react'
import Avatar from './Avatar.jsx'

// M2MeterBubble — sleep-meter voor de bouwgrond-tak van de peiling-flow.
// Bezoeker kiest een indicatieve oppervlakte tussen 100 en 2.000 m² en
// bevestigt. De waarde landt via onSubmit(value) als answer `grondM2` en
// wordt door pushSnapshot naar Brevo (GROND_M2) doorgezet.
//
// Visuele skelet gespiegeld op HighlightsBubble.jsx (paper-bubble met Avatar
// links). Slider hergebruikt het .repp-range-patroon uit MortgageCalc.jsx.
export default function M2MeterBubble({ onSubmit, min = 100, max = 2000, step = 50, defaultValue = 500 }) {
  const [value, setValue] = useState(defaultValue)
  const [submitted, setSubmitted] = useState(false)

  function handleConfirm() {
    if (submitted) return
    setSubmitted(true)
    onSubmit?.(value)
  }

  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">Oppervlakte</div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-[28px] font-semibold text-ink leading-none tabular-nums">
                ± {value.toLocaleString('nl-NL')} m²
              </div>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              disabled={submitted}
              className="repp-range mt-4"
              aria-label="oppervlakte in vierkante meter"
            />
            <div className="flex justify-between text-[12px] text-ink-mute tabular-nums mt-1">
              <span>{min.toLocaleString('nl-NL')} m²</span>
              <span>{max.toLocaleString('nl-NL')} m²</span>
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
                ✓ Genoteerd, ongeveer {value.toLocaleString('nl-NL')} m².
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
