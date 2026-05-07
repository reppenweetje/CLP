import { useMemo } from 'react'
import { buildABStats } from '../../lib/analytics.js'

// A/B variant comparator met statistische significantie.
// Gebruikt two-proportion z-test op completion-rate per ctaVariant.
// Geeft expliciet aan of de winner statistisch betrouwbaar is, of dat
// het verschil binnen de meetfout valt.
export default function ABSignificance({ sessions }) {
  const stats = useMemo(() => buildABStats(sessions), [sessions])

  if (!stats.variants.length) return null
  const single = stats.variants.length === 1

  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <header className="mb-4">
        <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">CTA varianten</div>
        <h2 className="text-[15px] font-semibold text-ink">A/B significance</h2>
      </header>
      <div className="space-y-2">
        {stats.variants.map((v) => {
          const max = Math.max(0.01, ...stats.variants.map((x) => x.rate))
          return (
            <div key={v.variant} className="grid grid-cols-[60px_1fr_88px] items-center gap-3">
              <div className="text-[13px] font-semibold text-ink uppercase tracking-wider">{v.variant}</div>
              <div className="h-3 bg-canvas-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-midnite transition-all duration-500"
                  style={{ width: `${(v.rate / max) * 100}%` }}
                />
              </div>
              <div className="text-[12px] text-ink-soft tabular-nums text-right">
                <span className="font-semibold text-ink">{(v.rate * 100).toFixed(1)}%</span>
                {' '}
                <span className="text-ink-mute">({v.completed}/{v.total})</span>
              </div>
            </div>
          )
        })}
      </div>
      {single ? (
        <div className="mt-4 pt-3 border-t border-mist-light text-[12.5px] text-ink-mute leading-relaxed">
          Slechts één variant in de data, voeg een tweede variant toe om significantie te kunnen meten.
        </div>
      ) : (
        <ComparisonReadout c={stats.comparison} />
      )}
    </section>
  )
}

function ComparisonReadout({ c }) {
  if (!c) return null
  const diffPct = ((c.pA - c.pB) * 100).toFixed(1)
  const conclusive = c.confidence >= 95 && c.sampleOk
  const trending   = c.confidence >= 80 && c.confidence < 95
  const verdict =
    !c.sampleOk ? 'Te kleine sample (N≥30 per variant nodig)' :
    conclusive  ? `Variant ${c.winner} wint statistisch significant` :
    trending    ? `Variant ${c.winner} loopt voor, wacht op meer data` :
                  'Verschil binnen meetfout, niet conclusief'
  const tone = !c.sampleOk ? 'mute' : conclusive ? 'green' : trending ? 'amber' : 'mute'
  const toneClasses = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber: 'bg-amber-50  border-amber-200  text-amber-900',
    mute:  'bg-canvas    border-mist-light text-ink-soft',
  }[tone]
  return (
    <div className={'mt-4 rounded-xl border px-4 py-3 ' + toneClasses}>
      <div className="text-[13.5px] font-semibold">{verdict}</div>
      <div className="text-[12.5px] mt-1 leading-relaxed opacity-90">
        Variant {c.a} {c.pA >= c.pB ? '+' : '−'}{Math.abs(diffPct)}% t.o.v. {c.b},
        {' '}confidence <span className="tabular-nums">{c.confidence.toFixed(1)}%</span>,
        {' '}p = <span className="tabular-nums">{c.p.toExponential(2)}</span>
      </div>
    </div>
  )
}
