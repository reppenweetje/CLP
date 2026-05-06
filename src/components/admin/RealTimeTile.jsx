import { useEffect, useState } from 'react'
import { buildRealtime, formatRelativeTime, getSessions, humanizePersona } from '../../lib/analytics.js'

// Live-stream tile: sessies in afgelopen 5 min, refresht elke 10s.
// Pulserende dot = nu actief. Demo-friendly + vroege-signaalwaarde.
export default function RealTimeTile({ onOpenSession }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(id)
  }, [])

  const all = getSessions()
  const active = buildRealtime(all)

  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <header className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={'absolute inline-flex h-full w-full rounded-full opacity-75 ' + (active.length > 0 ? 'bg-emerald-400 animate-ping' : 'bg-mist')} />
            <span className={'relative inline-flex h-2.5 w-2.5 rounded-full ' + (active.length > 0 ? 'bg-emerald-500' : 'bg-mist')} />
          </span>
          <div>
            <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium">Live</div>
            <h2 className="text-[14px] font-semibold text-ink">Actief in afgelopen 5 min</h2>
          </div>
        </div>
        <div className="text-[11px] text-ink-mute tabular-nums">{active.length} sessies</div>
      </header>
      {active.length === 0 ? (
        <div className="text-[12px] text-ink-mute leading-relaxed py-1.5">
          Niemand actief op dit moment.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {active.slice(0, 5).map((s) => (
            <li
              key={s.sessionId}
              role="button"
              tabIndex={0}
              onClick={() => onOpenSession?.(s)}
              onKeyDown={(e) => { if (e.key === 'Enter') onOpenSession?.(s) }}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-canvas-2 cursor-pointer transition"
            >
              <div className="min-w-0 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[12.5px] text-ink truncate">
                  {humanizePersona(s.persona)}
                </span>
                {s.lead?.email && (
                  <span className="text-[10.5px] text-ink-mute truncate">· {s.lead.email}</span>
                )}
              </div>
              <span className="text-[10px] text-ink-mute tabular-nums shrink-0">
                {formatRelativeTime(s.lastEventAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 pt-3 border-t border-mist-light text-[10px] text-ink-mute">
        Auto-refresh 10s · tap een sessie voor replay
        <span className="hidden">{tick}</span>
      </div>
    </section>
  )
}
