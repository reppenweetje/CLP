import Avatar from './Avatar.jsx'

// Belegger-detailbubble met BAR-cijfer prominent, markthuur range,
// drie kernfactoren uit het projectinformatie-document plus de
// bestaande voordelenlijst. Fiscale waarschuwing onderaan.
export default function InvestorBubble({ benefits, investor, intro }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">Belegger voordelen</div>
            {intro && <div className="text-[15px] text-ink leading-relaxed mt-1.5">{intro}</div>}

            {investor?.barRange && (
              <div className="mt-3.5 rounded-2xl bg-canvas-2 border border-mist-light p-3.5">
                <div className="text-[11px] tracking-[0.18em] text-ink-mute uppercase">Indicatief BAR</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <div className="text-[24px] font-semibold text-ink leading-none tabular-nums">{investor.barRange}</div>
                  <div className="text-[13px] text-ink-soft">bruto aanvangsrendement</div>
                </div>
                {investor.markthuurRange && (
                  <div className="text-[12px] text-ink-mute leading-snug mt-1.5">
                    Op basis van markthuur {investor.markthuurRange}.
                  </div>
                )}
              </div>
            )}

            {investor?.kernfactoren?.length > 0 && (
              <div className="mt-3.5">
                <div className="text-[11px] tracking-[0.18em] text-ink-mute uppercase mb-2">Drie kernfactoren</div>
                <ul className="space-y-1.5">
                  {investor.kernfactoren.map((k, i) => (
                    <li key={i} className="flex gap-2.5 text-[14px] text-ink leading-relaxed">
                      <span className="text-gold mt-0.5 shrink-0">◆</span>
                      <span>{k}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {benefits?.length > 0 && (
              <div className="mt-3.5">
                <div className="text-[11px] tracking-[0.18em] text-ink-mute uppercase mb-2">Voordelen</div>
                <ul className="space-y-1.5">
                  {benefits.map((b, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="text-midnite mt-0.5 text-[15px] leading-none">+</span>
                      <span className="text-[14px] text-ink leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-mist-light text-[12px] text-ink-mute leading-snug">
              Indicatief, geen prognose of advies. Resultaat hangt af van afwerking, leegstand, VvE-lasten en fiscale situatie. Vraag onafhankelijk advies bij je eigen fiscalist.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
