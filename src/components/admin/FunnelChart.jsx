// Verticale funnel met staaf per stap. Breedte = relatief tot eerste stap.
// Drop-percentage tussen stappen wordt apart vermeld voor afhaak-analyse.
export default function FunnelChart({ funnel }) {
  const max = funnel[0]?.count || 0
  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-[16px] font-semibold text-ink">Funnel</h2>
        <span className="text-[10px] tracking-[0.18em] text-ink-mute uppercase">Stap voor stap</span>
      </div>
      <p className="text-[12px] text-ink-soft mb-4">Wie haalt welke stap.</p>
      {max === 0 ? (
        <div className="text-[13px] text-ink-mute py-6 text-center">Nog geen sessies.</div>
      ) : (
        <div className="space-y-2">
          {funnel.map((step, i) => {
            const pct = max > 0 ? (step.count / max) * 100 : 0
            const drop = i > 0 ? ((funnel[i - 1].count - step.count) / Math.max(1, funnel[i - 1].count)) * 100 : 0
            return (
              <div key={step.id}>
                {i > 0 && drop > 0 && (
                  <div className="text-[10px] text-rose-700 ml-2 mb-1">
                    {drop.toFixed(0)}% drop
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-32 text-[12px] text-ink-soft truncate shrink-0">{step.label}</div>
                  <div className="relative flex-1 h-7 rounded-md bg-canvas-2 overflow-hidden">
                    <div
                      className="h-full bg-midnite/85 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-2.5 text-[12px] font-medium tabular-nums">
                      <span className={pct > 30 ? 'text-paper' : 'text-ink'}>
                        {step.count}
                      </span>
                    </div>
                  </div>
                  <div className="w-12 text-[11px] text-ink-mute tabular-nums text-right">
                    {pct.toFixed(0)}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
