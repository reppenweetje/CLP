import Avatar from './Avatar.jsx'

// indicatieve planning horizontale tijdlijn met fases
export default function PlanningBubble({ planning }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium">indicatieve planning</div>
            <div className="text-[15px] font-semibold text-ink mt-1.5">van bouw tot oplevering</div>
            <div className="mt-3 relative">
              <div className="absolute left-3 top-2 bottom-2 w-px bg-mist" />
              <div className="space-y-3">
                {planning.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-midnite' : 'bg-mist'} relative z-10`} />
                    </div>
                    <div className="flex-1 flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium text-ink">{p.phase}</span>
                      <span className="text-[12px] text-ink-soft">{p.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[11px] text-ink-mute leading-snug mt-3 pt-3 border-t border-mist-light">
              data zijn indicatief en kunnen wijzigen
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
