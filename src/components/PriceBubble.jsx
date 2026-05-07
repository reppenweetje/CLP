import Avatar from './Avatar.jsx'

// prijslijst compact alleen actuele types prijs vanaf en m² prijs
export default function PriceBubble({ units }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">prijslijst</div>
            <div className="text-[16px] font-semibold text-ink mt-1.5">overzicht per unit type</div>
            <div className="mt-3 space-y-2">
              {units.map((u) => (
                <div key={u.type} className="rounded-2xl bg-canvas-2 border border-mist-light px-3.5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-ink">unit {u.type.toLowerCase()}</div>
                    <div className="text-[12px] text-ink-soft mt-0.5">≈ {String(u.size).replace('.', ',')} m² {u.levels} laags</div>
                  </div>
                  <div className="text-right">
                    {u.priceFrom ? (
                      <>
                        <div className="text-[15px] font-semibold text-ink">€{Math.floor(u.priceFrom / 1000)}k</div>
                        <div className="text-[11px] text-ink-mute uppercase tracking-wider">vanaf excl btw</div>
                      </>
                    ) : (
                      <div className="text-[12px] text-ink-soft uppercase tracking-wider">{u.stateLabel}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[12px] text-ink-mute leading-snug mt-3 pt-3 border-t border-mist-light">
              prijzen zijn indicatief en exclusief btw vrij op naam
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
