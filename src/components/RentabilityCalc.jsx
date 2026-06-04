import { useState, useRef } from 'react'
import { project } from '../data/project.js'

// Rendement-indicator voor beleggers. Toont BAR (bruto aanvangsrendement)
// op basis van een instelbare markthuur per m² per jaar. BAR = jaarhuur
// gedeeld door de koopsom excl. btw. Range markthuur in Waarderpolder
// ligt globaal tussen €150 en €200 per m² per jaar (volgens project-doc).
function formatEuro(n) {
  return Math.round(n).toLocaleString('nl-NL')
}

export default function RentabilityCalc({ price, size, indicative = false, onInteract, onCredionRequest }) {
  const [marktHuur, setMarktHuur] = useState(175)
  const interactedRef = useRef(false)
  const yearlyRent = size * marktHuur
  const bar = price > 0 ? (yearlyRent / price) * 100 : 0

  const handleSliderChange = (value) => {
    setMarktHuur(value)
    if (!interactedRef.current) {
      interactedRef.current = true
      if (onInteract) onInteract()
    }
  }

  return (
    <div className="rounded-2xl bg-paper border border-mist-light p-3.5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">Rendement indicatie</div>
        <div className="text-[11px] text-ink-mute uppercase tracking-wider">BAR bruto</div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <div className="text-[28px] font-semibold text-ink leading-none tabular-nums">
          {bar.toFixed(1)}%
        </div>
        <div className="text-[13px] text-ink-soft">per jaar</div>
      </div>
      <div className="text-[12px] text-ink-mute leading-snug">
        Jaarhuur €{formatEuro(yearlyRent)} bij koopsom €{formatEuro(price)}{indicative ? ' indicatief' : ''}
      </div>

      <div className="mt-4 space-y-3">
        <SliderRow
          label="Markthuur"
          mainValue={`€${marktHuur} / m²`}
          subValue={`€${formatEuro(yearlyRent)} per jaar`}
          input={
            <input
              type="range"
              min={100}
              max={250}
              step={5}
              value={marktHuur}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="repp-range"
              aria-label="markthuur per m² per jaar"
            />
          }
        />
      </div>

      <div className="mt-3 pt-3 border-t border-mist-light text-[12px] text-ink-mute leading-snug">
        Indicatief, geen prognose. Exclusief VvE-lasten, onderhoud, leegstand en fiscale invloed. Range markthuur Waarderpolder ligt doorgaans €150 tot €200 per m² per jaar.
      </div>
      {onCredionRequest && (
        <button
          type="button"
          onClick={() => onCredionRequest({
            kind: 'rentability',
            marktHuur,
            yearlyRent,
            bar: Number(bar.toFixed(2)),
            price,
            size,
          })}
          className="mt-3 w-full flex items-center justify-between gap-2 rounded-2xl border border-mist hover:border-midnite bg-paper hover:bg-canvas-2 active:scale-[0.99] px-3.5 py-2.5 transition group"
        >
          <div className="flex flex-col items-start min-w-0 text-left">
            <span className="text-[9px] tracking-[0.18em] uppercase text-midnite font-medium">Partner {project.financing?.partner || 'Credion'}</span>
            <span className="text-[13.5px] text-ink leading-tight mt-0.5">Vrijblijvende financieringsscan</span>
          </div>
          <span className="text-[15px] text-ink-mute group-hover:text-midnite shrink-0 ml-2 leading-none" aria-hidden>→</span>
        </button>
      )}
    </div>
  )
}

function SliderRow({ label, mainValue, subValue, input }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px] mb-1 gap-2">
        <span className="text-ink-soft">{label}</span>
        <div className="text-right">
          <span className="font-semibold text-ink tabular-nums">{mainValue}</span>
          {subValue && (
            <span className="text-ink-mute tabular-nums ml-1.5 text-[12px]">{subValue}</span>
          )}
        </div>
      </div>
      {input}
    </div>
  )
}
