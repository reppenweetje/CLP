import { useMemo } from 'react'
import { buildCohortHeatmap } from '../../lib/analytics.js'

// Day-of-week × hour-of-day heatmap.
// Inzicht: wanneer komen bezoekers , werktijd? avond? weekend?
// Drives marketing-timing en CTA-test-windows.
export default function CohortHeatmap({ sessions }) {
  const data = useMemo(() => buildCohortHeatmap(sessions), [sessions])
  const max = Math.max(1, ...data.grid.map((c) => c.count))
  const totalSessies = data.grid.reduce((sum, c) => sum + c.count, 0)
  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <header className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">Wanneer kijken ze?</div>
          <h2 className="text-[15px] font-semibold text-ink">Activity-heatmap</h2>
        </div>
        <div className="text-[12px] text-ink-mute tabular-nums">{totalSessies} sessies</div>
      </header>
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="inline-grid gap-[3px]" style={{ gridTemplateColumns: '20px repeat(24, minmax(14px, 1fr))' }}>
          <div />
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="text-[9px] text-ink-mute text-center tabular-nums">
              {h % 3 === 0 ? h : ''}
            </div>
          ))}
          {data.dayLabels.map((dl, dayIdx) => (
            <DayRow key={dl} day={dayIdx} label={dl} grid={data.grid} max={max} />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-mute">
        <span>minder</span>
        {[0.1, 0.3, 0.55, 0.8, 1].map((o) => (
          <span key={o} className="w-3.5 h-3.5 rounded-sm" style={{ background: `rgba(15,15,112,${o})` }} />
        ))}
        <span>meer</span>
      </div>
    </section>
  )
}

function DayRow({ day, label, grid, max }) {
  return (
    <>
      <div className="text-[11px] text-ink-mute self-center text-right pr-1">{label}</div>
      {Array.from({ length: 24 }).map((_, h) => {
        const cell = grid.find((c) => c.day === day && c.hour === h)
        const count = cell?.count || 0
        const opacity = count === 0 ? 0 : Math.max(0.08, count / max)
        return (
          <div
            key={h}
            className="aspect-square rounded-sm hover:ring-2 hover:ring-midnite cursor-default transition"
            style={{ background: count === 0 ? '#efeee8' : `rgba(15,15,112,${opacity})` }}
            title={`${label} ${h}:00 , ${count} sessies`}
          />
        )
      })}
    </>
  )
}
