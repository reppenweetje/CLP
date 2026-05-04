// Twee perspectieven op afhaakmomenten:
// 1. Bij welke event-stap zijn sessies gestopt (zonder voltooien).
// 2. Welke reden gaven afhakers expliciet.
export default function AfhaakBreakdown({ byStep, byReason }) {
  const totalStep = byStep.reduce((s, d) => s + d.count, 0)
  const totalReason = byReason.reduce((s, d) => s + d.count, 0)
  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <h2 className="text-[16px] font-semibold text-ink mb-1">Afhaakmomenten</h2>
      <p className="text-[12px] text-ink-soft mb-5">Waar haken bezoekers af, en waarom.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="text-[10px] tracking-[0.18em] text-ink-mute uppercase mb-3">Bij welke stap</div>
          {totalStep === 0 ? (
            <div className="text-[13px] text-ink-mute py-3">Nog geen afhakers.</div>
          ) : (
            <ul className="space-y-1.5">
              {byStep.slice(0, 8).map((row) => {
                const pct = (row.count / totalStep) * 100
                return (
                  <li key={row.type} className="flex items-baseline justify-between gap-3 text-[12px]">
                    <span className="text-ink truncate">{row.label}</span>
                    <span className="text-ink-mute tabular-nums shrink-0">
                      {row.count} <span className="opacity-70">({pct.toFixed(0)}%)</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div>
          <div className="text-[10px] tracking-[0.18em] text-ink-mute uppercase mb-3">Reden bij brochure-nee</div>
          {totalReason === 0 ? (
            <div className="text-[13px] text-ink-mute py-3">Nog geen redenen gegeven.</div>
          ) : (
            <ul className="space-y-1.5">
              {byReason.map((row) => {
                const pct = (row.count / totalReason) * 100
                return (
                  <li key={row.label} className="flex items-baseline justify-between gap-3 text-[12px]">
                    <span className="text-ink truncate">{row.label}</span>
                    <span className="text-ink-mute tabular-nums shrink-0">
                      {row.count} <span className="opacity-70">({pct.toFixed(0)}%)</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
