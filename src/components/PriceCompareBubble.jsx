import { useState } from 'react'
import Avatar from './Avatar.jsx'

// Interactieve m²-prijs vergelijking. Bezoeker tapt op een staaf om
// het verschil met De Hofman Early Bird in euro's per m² te zien.
// Eigen units zijn gemarkeerd met midnite, anderen met mist-tint.
function formatEuro(n) {
  return Math.round(n).toLocaleString('nl-NL')
}

export default function PriceCompareBubble({ priceComparison }) {
  const [selectedKey, setSelectedKey] = useState(null)
  const rows = priceComparison.rows
  const sorted = [...rows].sort((a, b) => a.price - b.price)
  const ours = sorted.find((r) => r.isOurs) || sorted[0]
  const minPrice = sorted[0].price
  const maxPrice = sorted[sorted.length - 1].price
  const range = Math.max(1, maxPrice - minPrice)
  const savingsMax = maxPrice - ours.price

  const widthFor = (price) => 18 + ((price - minPrice) / range) * 82

  const selected = sorted.find((r) => keyOf(r) === selectedKey)

  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">Prijsvergelijking Waarderpolder</div>
            <div className="text-[16px] font-semibold text-ink mt-1.5 leading-snug">
              De scherpste m²-prijs in het gebied
            </div>
            <div className="text-[13px] text-ink-soft leading-snug mt-1">
              Tik op een staaf om het verschil te zien.
            </div>

            {savingsMax > 0 && (
              <div className="mt-3.5 rounded-2xl bg-midnite text-paper p-3.5">
                <div className="text-[11px] tracking-[0.18em] uppercase opacity-80">Voordeel</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <div className="text-[22px] font-semibold leading-none tabular-nums">€{formatEuro(savingsMax)} / m²</div>
                  <div className="text-[13px] opacity-80">scherper dan duurste in dit overzicht</div>
                </div>
                <div className="text-[12px] opacity-80 leading-snug mt-1.5">
                  Bij 105 m² zou dat €{formatEuro(savingsMax * 105)} schelen op de koopsom.
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {sorted.map((row) => {
                const key = keyOf(row)
                const isSel = selectedKey === key
                const diff = row.price - ours.price
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(isSel ? null : key)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <div className="text-[13px] text-ink leading-tight min-w-0 truncate">
                        <span className="font-medium">{row.name}</span>
                        {row.tag && (
                          <span className="text-ink-mute ml-1.5 text-[12px]">{row.tag}</span>
                        )}
                      </div>
                      <div className="text-[13px] tabular-nums text-ink shrink-0">
                        €{formatEuro(row.price)}
                      </div>
                    </div>
                    <div className="relative h-2.5 rounded-full bg-canvas-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          row.isOurs
                            ? isSel ? 'bg-neon' : 'bg-midnite'
                            : isSel ? 'bg-orange-300' : 'bg-mist'
                        }`}
                        style={{ width: `${widthFor(row.price)}%` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>

            {selected && !selected.isOurs && (
              <div className="mt-3.5 rounded-2xl bg-canvas-2 border border-mist-light p-3.5 fade-up">
                <div className="text-[11px] tracking-[0.18em] text-ink-mute uppercase">Verschil</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <div className="text-[20px] font-semibold text-ink leading-none tabular-nums">
                    €{formatEuro(selected.price - ours.price)} / m²
                  </div>
                  <div className="text-[13px] text-ink-soft">duurder dan De Hofman</div>
                </div>
                <div className="text-[12px] text-ink-mute leading-snug mt-1.5">
                  Bij 105 m² is dat €{formatEuro((selected.price - ours.price) * 105)} verschil op de koopsom.
                </div>
              </div>
            )}

            {selected?.isOurs && (
              <div className="mt-3.5 rounded-2xl bg-canvas-2 border border-mist-light p-3.5 fade-up">
                <div className="text-[11px] tracking-[0.18em] text-ink-mute uppercase">Onze unit</div>
                <div className="text-[14px] text-ink leading-snug mt-1">
                  {selected.name} {selected.tag && (<span className="text-ink-soft">{selected.tag}</span>)}
                </div>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-mist-light text-[12px] text-ink-mute leading-snug">
              Peildatum vergelijking {priceComparison.peildatum}. Concurrentprijzen op basis van openbare verkoopdata.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function keyOf(row) {
  return `${row.name}__${row.tag || ''}`
}
