import { useState } from 'react'
import Avatar from './Avatar.jsx'

// 14 units kleurgecodeerd grid tap een unit voor status
export default function SitePlanBubble({ sitePlan }) {
  const [selectedId, setSelectedId] = useState(null)
  const allUnits = sitePlan.rows.flatMap((r) => r.units)
  const selected = allUnits.find((u) => u.id === selectedId)

  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium">situatietekening</div>
            <div className="text-[15px] font-semibold text-ink mt-1.5">14 units in 1 oogopslag</div>
            <div className="text-[12px] text-ink-soft leading-snug mt-1">
              tik op een unit om de status te zien
            </div>

            <div className="mt-4 rounded-2xl bg-canvas-2 border border-mist-light p-3">
              {sitePlan.rows.map((row, ri) => (
                <div key={ri} className="grid grid-cols-7 gap-1.5 mb-1.5 last:mb-0">
                  {row.units.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedId(selectedId === u.id ? null : u.id)}
                      className={`aspect-square rounded-md border text-[10px] font-medium tracking-wider uppercase transition active:scale-95 flex items-center justify-center ${stateClasses(u.state)} ${
                        selectedId === u.id ? 'ring-2 ring-midnite ring-offset-1' : ''
                      }`}
                    >
                      {u.type.toLowerCase()}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              {sitePlan.legend.map((l) => (
                <div key={l.state} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                  <span className={`w-2.5 h-2.5 rounded-sm ${dotClasses(l.state)}`} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>

            {selected && (
              <div className="mt-3 rounded-xl bg-canvas-2 border border-mist-light px-3 py-2.5 fade-up">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[14px] font-semibold text-ink">unit {selected.type.toLowerCase()}</div>
                  <div className="text-[11px] tracking-wider uppercase text-ink-soft">{stateLabel(selected.state)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function stateClasses(state) {
  switch (state) {
    case 'available': return 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
    case 'reserved': return 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
    case 'sold': return 'bg-canvas-2 border-mist text-ink-mute line-through'
    case 'coming_soon': return 'bg-paper border-mist text-ink-soft border-dashed'
    default: return 'bg-paper border-mist text-ink-soft'
  }
}

function dotClasses(state) {
  switch (state) {
    case 'available': return 'bg-emerald-300'
    case 'reserved': return 'bg-amber-300'
    case 'sold': return 'bg-mist'
    case 'coming_soon': return 'bg-paper border border-dashed border-mist'
    default: return 'bg-mist'
  }
}

function stateLabel(state) {
  switch (state) {
    case 'available': return 'beschikbaar'
    case 'reserved': return 'in optie'
    case 'sold': return 'verkocht'
    case 'coming_soon': return 'later in verkoop'
    default: return ''
  }
}
