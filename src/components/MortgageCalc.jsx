import { useState, useRef } from 'react'

// Maandlast-indicator met sliders voor eigen vermogen en rente.
// 20 jaar annuïtair, indicatief — geen advies. Range eigen vermogen 25 tot 100
// procent, zodat lenen tot 75 procent past en de bezoeker ook kan kiezen voor
// "geen financiering" door alles uit eigen vermogen te halen.
function calcMonthly(price, downPaymentPct, ratePct, years = 20) {
  const loan = price * (1 - downPaymentPct / 100)
  const monthlyRate = ratePct / 100 / 12
  const months = years * 12
  if (monthlyRate === 0) return loan / months
  return loan * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))
}

function formatEuro(n) {
  return Math.round(n).toLocaleString('nl-NL')
}

export default function MortgageCalc({ price, indicative = false, onInteract, onCredionRequest }) {
  const [downPayment, setDownPayment] = useState(30)
  const [rate, setRate] = useState(4.5)
  const interactedRef = useRef(false)
  const noFinancing = downPayment >= 100
  const monthly = calcMonthly(price, downPayment, rate)
  const loan = price * (1 - downPayment / 100)
  const equity = price * (downPayment / 100)

  const trackOnce = () => {
    if (interactedRef.current) return
    interactedRef.current = true
    if (onInteract) onInteract()
  }

  return (
    <div className="rounded-2xl bg-paper border border-mist-light p-3.5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium">Maandlast indicatie</div>
        <div className="text-[10px] text-ink-mute uppercase tracking-wider">
          {noFinancing ? 'Zonder financiering' : '20 jaar annuïtair'}
        </div>
      </div>

      {noFinancing ? (
        <>
          <div className="flex items-baseline gap-2 mb-1">
            <div className="text-[20px] font-semibold text-ink leading-tight">Geen financiering nodig</div>
          </div>
          <div className="text-[11px] text-ink-mute leading-snug">
            Volledige aankoop uit eigen vermogen, prijs €{formatEuro(price)}{indicative ? ' indicatief' : ''}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-1">
            <div className="text-[28px] font-semibold text-ink leading-none tabular-nums">
              €{formatEuro(monthly)}
            </div>
            <div className="text-[12px] text-ink-soft">per maand</div>
          </div>
          <div className="text-[11px] text-ink-mute leading-snug">
            Lening €{formatEuro(loan)} bij prijs €{formatEuro(price)}{indicative ? ' indicatief' : ''}
          </div>
        </>
      )}

      <div className="mt-4 space-y-3">
        <SliderRow
          label="Eigen vermogen"
          mainValue={noFinancing ? '100%' : `${downPayment}%`}
          subValue={noFinancing ? 'Geen lening' : `€${formatEuro(equity)}`}
          input={
            <input
              type="range"
              min={25}
              max={100}
              step={5}
              value={downPayment}
              onChange={(e) => { setDownPayment(Number(e.target.value)); trackOnce() }}
              className="repp-range"
              aria-label="eigen vermogen"
            />
          }
        />
        {!noFinancing && (
          <SliderRow
            label="Rente"
            mainValue={`${rate.toFixed(1)}%`}
            input={
              <input
                type="range"
                min={3.0}
                max={7.0}
                step={0.1}
                value={rate}
                onChange={(e) => { setRate(Number(e.target.value)); trackOnce() }}
                className="repp-range"
                aria-label="rente"
              />
            }
          />
        )}
      </div>

      <div className="text-[11px] text-ink-mute leading-snug mt-3 pt-3 border-t border-mist-light">
        {noFinancing
          ? 'Geen financiering, geen maandlast. Wel houden we rekening met onderhoud, VvE-lasten en fiscale invloed.'
          : 'Indicatie, geen advies. Lening tot 75 procent van de koopsom is gangbaar voor bedrijfsunits.'}
      </div>
      {!noFinancing && onCredionRequest && (
        <button
          type="button"
          onClick={onCredionRequest}
          className="mt-3 w-full flex items-center justify-between gap-2 rounded-2xl border border-mist hover:border-midnite bg-paper hover:bg-canvas-2 active:scale-[0.99] px-3.5 py-2.5 transition group"
        >
          <div className="flex flex-col items-start min-w-0 text-left">
            <span className="text-[9px] tracking-[0.18em] uppercase text-midnite font-medium">Partner Credion</span>
            <span className="text-[12.5px] text-ink leading-tight mt-0.5">Vrijblijvende financieringsscan</span>
          </div>
          <span className="text-[14px] text-ink-mute group-hover:text-midnite shrink-0 ml-2 leading-none" aria-hidden>→</span>
        </button>
      )}
    </div>
  )
}

function SliderRow({ label, mainValue, subValue, input }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px] mb-1 gap-2">
        <span className="text-ink-soft">{label}</span>
        <div className="text-right">
          <span className="font-semibold text-ink tabular-nums">{mainValue}</span>
          {subValue && (
            <span className="text-ink-mute tabular-nums ml-1.5 text-[11px]">{subValue}</span>
          )}
        </div>
      </div>
      {input}
    </div>
  )
}
