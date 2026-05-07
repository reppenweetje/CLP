import { useMemo } from 'react'
import { buildTimeToConversion, formatDuration } from '../../lib/analytics.js'

// Histogram van time-to-conversion: hoe snel doorlopen mensen de flow?
// Vergelijkt voltooide vs. afgehaakte sessies side-by-side.
// Insight: "afhakers blijven gemiddeld 45s — flow heeft eerste minuut nodig om vast te haken".
export default function TimeToConversion({ sessions }) {
  const data = useMemo(() => buildTimeToConversion(sessions), [sessions])

  const max = Math.max(
    1,
    ...data.completed.map((b) => b.count),
    ...data.abandoned.map((b) => b.count),
  )

  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <header className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">Tempo</div>
          <h2 className="text-[15px] font-semibold text-ink">Tijd tot conversie / verlaten</h2>
        </div>
        <div className="text-[12px] text-ink-mute tabular-nums">
          mediaan voltooid: <span className="font-semibold text-ink">{formatDuration(data.median)}</span>
        </div>
      </header>
      <div className="space-y-2.5">
        {data.completed.map((b, i) => {
          const a = data.abandoned[i]
          return (
            <div key={b.id} className="grid grid-cols-[64px_1fr_64px] items-center gap-3">
              <div className="text-[12px] text-ink-mute text-right tabular-nums">{b.label}</div>
              <div className="flex flex-col gap-1">
                <Bar value={b.count} max={max} color="bg-emerald-600" labelLeft="voltooid" labelRight={String(b.count)} />
                <Bar value={a.count} max={max} color="bg-rose-500/70" labelLeft="afgehaakt" labelRight={String(a.count)} />
              </div>
              <div className="text-[11px] text-ink-mute tabular-nums text-right">
                {b.count + a.count > 0 ? `${Math.round((b.count / Math.max(1, b.count + a.count)) * 100)}%` : '-'}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-mist-light flex items-center justify-between text-[12px] text-ink-mute">
        <span>Groen = voltooid | rood = verlaten</span>
        <span className="tabular-nums">
          {data.completedCount} voltooid | {data.abandonedCount} verlaten
        </span>
      </div>
    </section>
  )
}

function Bar({ value, max, color, labelLeft, labelRight }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="text-[11px] text-ink-mute w-16 shrink-0">{labelLeft}</div>
      <div className="flex-1 h-3 bg-canvas-2 rounded-full overflow-hidden relative">
        <div className={'h-full ' + color + ' transition-all duration-500'} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[11px] text-ink tabular-nums w-8 text-right shrink-0">{labelRight}</div>
    </div>
  )
}
