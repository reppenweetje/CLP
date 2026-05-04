// CTA varianten op de IntroScreen. Toont conversie per variant.
import { CTA_VARIANTS } from '../../lib/cta.js'

export default function VariantBreakdown({ data, sessions }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <h2 className="text-[16px] font-semibold text-ink mb-1">CTA-varianten</h2>
      <p className="text-[12px] text-ink-soft mb-4">Welke knop hebben bezoekers gezien.</p>
      {total === 0 ? (
        <div className="text-[13px] text-ink-mute py-6 text-center">Nog geen data.</div>
      ) : (
        <div className="space-y-2.5">
          {data.map((row) => {
            const pct = total > 0 ? (row.count / total) * 100 : 0
            const completedForVariant = sessions.filter(
              (s) => s.ctaVariant === row.variant && s.completed,
            ).length
            const conv = row.count > 0 ? (completedForVariant / row.count) * 100 : 0
            return (
              <div key={row.variant} className="rounded-xl bg-canvas-2 px-3 py-2.5">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[12px] font-semibold text-ink">
                    {row.variant} <span className="text-ink-soft font-normal">{CTA_VARIANTS[row.variant]}</span>
                  </span>
                  <span className="text-[11px] text-ink-mute tabular-nums">{row.count} sessies</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-ink-soft">
                  <div className="h-1.5 flex-1 rounded-full bg-mist-light overflow-hidden">
                    <div className="h-full bg-midnite" style={{ width: `${conv}%` }} />
                  </div>
                  <span className="tabular-nums">{conv.toFixed(0)}% voltooid</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
