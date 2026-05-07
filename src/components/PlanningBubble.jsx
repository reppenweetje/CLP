import Avatar from './Avatar.jsx'

// indicatieve planning horizontale tijdlijn met fases
export default function PlanningBubble({ planning }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">indicatieve planning</div>
            <div className="text-[16px] font-semibold text-ink mt-1.5">van bouw tot oplevering</div>
            <div className="mt-3 relative">
              <div className="absolute left-3 top-2 bottom-2 w-px bg-mist" />
              <div className="space-y-3">
                {planning.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-midnite' : 'bg-mist'} relative z-10`} />
                    </div>
                    <div className="flex-1 flex items-baseline justify-between gap-2">
                      <span className="text-[14px] font-medium text-ink">{p.phase}</span>
                      <span className="text-[13px] text-ink-soft">{p.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-mist-light flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-mute mt-0.5" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="text-[12px] text-ink-soft leading-snug">
                Alle data zijn indicatief — bouwtraject afhankelijk van vergunningen, weer en aannemerscapaciteit.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
