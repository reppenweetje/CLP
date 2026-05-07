import Avatar from './Avatar.jsx'
import ImpressionNote from './ImpressionNote.jsx'

// unit aanbeveling card als rich bot bubble
export default function UnitBubble({ unit }) {
  const u = unit.primary
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md overflow-hidden bg-paper border border-mist-light">
          <div className="relative aspect-[16/10] overflow-hidden bg-canvas-2">
            <img src={u.image} alt="" className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-paper/95 backdrop-blur text-[11px] tracking-[0.18em] text-midnite uppercase font-medium border border-mist">
              aanbevolen
            </div>
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-paper/95 backdrop-blur text-[11px] text-ink uppercase tracking-wider font-medium border border-mist">
              {u.stateLabel}
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[20px] font-semibold text-ink leading-tight">unit {u.type}</div>
                <div className="text-[13px] text-ink-soft mt-0.5">
                  ≈ {String(u.size).replace('.', ',')} m² {u.levels} laags
                </div>
              </div>
              {u.priceFrom && (
                <div className="text-right">
                  <div className="text-[11px] tracking-widest text-ink-mute uppercase">vanaf</div>
                  <div className="text-[16px] font-semibold text-ink">€{Math.floor(u.priceFrom / 1000)}k</div>
                  <div className="text-[11px] text-ink-mute">excl btw</div>
                </div>
              )}
            </div>
            <div className="text-[14px] text-ink-soft leading-relaxed mt-3">{u.pitch}</div>
            {u.uses && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {u.uses.map((t) => (
                  <span
                    key={t}
                    className="text-[12px] px-2.5 py-1 rounded-full bg-canvas-2 text-ink-soft"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {unit.note && (
              <div className="text-[13px] text-midnite leading-relaxed mt-3 pt-3 border-t border-mist-light">
                {unit.note}
              </div>
            )}
            <ImpressionNote className="mt-3" />
          </div>
        </div>
      </div>
    </div>
  )
}
