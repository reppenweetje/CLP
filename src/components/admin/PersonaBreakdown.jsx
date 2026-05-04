// Verdeling persona's over alle sessies.
export default function PersonaBreakdown({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <h2 className="text-[16px] font-semibold text-ink mb-1">Persona</h2>
      <p className="text-[12px] text-ink-soft mb-4">Voor wie kijkt men.</p>
      {total === 0 ? (
        <div className="text-[13px] text-ink-mute py-6 text-center">Nog geen data.</div>
      ) : (
        <div className="space-y-2">
          {data.map((row) => {
            const pct = total > 0 ? (row.count / total) * 100 : 0
            return (
              <div key={row.key}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[12px] text-ink">{row.label}</span>
                  <span className="text-[12px] text-ink-mute tabular-nums">
                    {row.count} <span className="text-ink-mute/70">{pct.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-canvas-2 overflow-hidden">
                  <div className="h-full bg-midnite/70" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
