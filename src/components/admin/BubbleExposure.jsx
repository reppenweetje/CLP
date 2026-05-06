import { useMemo, useState } from 'react'
import { buildBubbleExposure } from '../../lib/analytics.js'

// Toont per chat-bubble (PriceBubble, GalleryBubble, …):
//  - hoe vaak getoond / hoe veel unieke sessies
//  - conversion-rate van sessies die deze bubble zagen vs. niet zagen
//  - lift = met-zonder (positief = bubble helpt converteren)
//  - 14-daagse sparkline met dagelijkse exposure-trend
//
// Doel: in één blik zien welke content-units conversie sturen,
// zodat copy-/design-iteraties data-driven kunnen.
export default function BubbleExposure({ sessions }) {
  const data = useMemo(() => buildBubbleExposure(sessions), [sessions])
  const [sortBy, setSortBy] = useState('exposure') // exposure | lift

  const sorted = useMemo(() => {
    const arr = data.filter((d) => d.uniqueSessions > 0)
    if (sortBy === 'lift') return [...arr].sort((a, b) => b.lift - a.lift)
    return [...arr].sort((a, b) => b.uniqueSessions - a.uniqueSessions)
  }, [data, sortBy])

  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <header className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">Vertoonde bubbles</div>
          <h2 className="text-[14px] font-semibold text-ink">Welke content sturen conversie?</h2>
          <p className="text-[12px] text-ink-soft leading-relaxed mt-1">
            Conversion-lift = % voltooid mét bubble − % voltooid zonder bubble.
          </p>
        </div>
        <div className="inline-flex items-center rounded-full border border-mist-light bg-canvas p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setSortBy('exposure')}
            className={
              'px-2.5 py-1 rounded-full transition ' +
              (sortBy === 'exposure' ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft')
            }
          >
            Op vertoning
          </button>
          <button
            type="button"
            onClick={() => setSortBy('lift')}
            className={
              'px-2.5 py-1 rounded-full transition ' +
              (sortBy === 'lift' ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft')
            }
          >
            Op lift
          </button>
        </div>
      </header>
      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {sorted.map((row) => (
            <BubbleRow key={row.kind} row={row} />
          ))}
        </div>
      )}
    </section>
  )
}

function BubbleRow({ row }) {
  const liftPct = (row.lift * 100).toFixed(0)
  const liftPositive = row.lift > 0.005
  const liftNegative = row.lift < -0.005
  const sparkMax = Math.max(1, ...row.sparkline)
  return (
    <div className="grid grid-cols-[1fr_auto_120px] items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-canvas-2 transition">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-ink truncate">{row.label}</div>
        <div className="text-[11px] text-ink-mute mt-0.5">
          <span className="tabular-nums">{row.uniqueSessions}</span> sessies
          {' · '}
          <span className="tabular-nums">{row.exposureCount}</span>× vertoond
        </div>
      </div>
      <div className="text-right">
        <div className={
          'text-[13px] font-semibold tabular-nums ' +
          (liftPositive ? 'text-emerald-700' : liftNegative ? 'text-rose-700' : 'text-ink-soft')
        }>
          {liftPositive ? '+' : ''}{liftPct}%
        </div>
        <div className="text-[10px] text-ink-mute mt-0.5">conv-lift</div>
      </div>
      <Sparkline values={row.sparkline} max={sparkMax} />
    </div>
  )
}

function Sparkline({ values, max }) {
  // Inline SVG sparkline. 14 datapoints, hoogste = topbar.
  const w = 120, h = 28
  const dx = w / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => `${(i * dx).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80">
      <polyline points={pts} fill="none" stroke="#0f0f70" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <polyline
        points={`0,${h} ${pts} ${w},${h}`}
        fill="rgba(15,15,112,0.06)"
        stroke="none"
      />
    </svg>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-mist-light bg-canvas px-6 py-8 text-center">
      <div className="text-[13px] font-semibold text-ink">Nog geen bubble-vertoningen geregistreerd</div>
      <div className="text-[11.5px] text-ink-soft mt-1 leading-relaxed">
        Bubble-tracking is geactiveerd via <code className="bg-canvas-2 px-1 py-0.5 rounded">bubble:rendered</code> events.
        Zodra bezoekers de chat doorlopen vullen deze rijen zich.
      </div>
    </div>
  )
}
