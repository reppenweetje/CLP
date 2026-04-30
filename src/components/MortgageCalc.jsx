import { useState } from 'react'

// maandlast indicator met sliders voor eigen vermogen en rente
// 20 jaar annuitair indicatief geen advies
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

export default function MortgageCalc({ price, indicative = false }) {
  const [downPayment, setDownPayment] = useState(30)
  const [rate, setRate] = useState(5.0)
  const monthly = calcMonthly(price, downPayment, rate)
  const loan = price * (1 - downPayment / 100)

  return (
    <div className="rounded-2xl bg-paper border border-mist-light p-3.5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium">maandlast indicatie</div>
        <div className="text-[10px] text-ink-mute uppercase tracking-wider">20 jaar annuïtair</div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <div className="text-[28px] font-semibold text-ink leading-none tabular-nums">
          €{formatEuro(monthly)}
        </div>
        <div className="text-[12px] text-ink-soft">per maand</div>
      </div>
      <div className="text-[11px] text-ink-mute leading-snug">
        lening €{formatEuro(loan)} bij prijs €{formatEuro(price)}{indicative ? ' indicatief' : ''}
      </div>

      <div className="mt-4 space-y-3">
        <SliderRow
          label="eigen vermogen"
          value={`${downPayment} procent`}
          input={
            <input
              type="range"
              min={10}
              max={70}
              step={5}
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              className="repp-range"
              aria-label="eigen vermogen"
            />
          }
        />
        <SliderRow
          label="rente"
          value={`${rate.toFixed(1)} procent`}
          input={
            <input
              type="range"
              min={3.0}
              max={7.0}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="repp-range"
              aria-label="rente"
            />
          }
        />
      </div>

      <div className="text-[11px] text-ink-mute leading-snug mt-3 pt-3 border-t border-mist-light">
        indicatie geen advies vraag een vrijblijvende financieringsscan via credion
      </div>
    </div>
  )
}

function SliderRow({ label, value, input }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px] mb-1">
        <span className="text-ink-soft">{label}</span>
        <span className="font-semibold text-ink tabular-nums">{value}</span>
      </div>
      {input}
    </div>
  )
}
