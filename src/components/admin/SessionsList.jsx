import { useState } from 'react'
import {
  formatDuration,
  formatTimestamp,
  humanizeEventType,
  humanizePersona,
} from '../../lib/analytics.js'

// Tabel met alle sessies. Twee actie-modes:
//  - inline expand (klassiek): klik op rij → korte timeline beneden in de rij
//  - side-panel replay (nieuw): "Open" knop → opent SessionReplay overlay
//    via onOpen-callback. SessionsList kan zonder onOpen blijven werken.
export default function SessionsList({ sessions, onOpen }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <section className="rounded-2xl border border-mist-light bg-paper overflow-hidden">
      <div className="p-5 border-b border-mist-light">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[16px] font-semibold text-ink">Sessies</h2>
          <span className="text-[12px] text-ink-mute tabular-nums">{sessions.length} totaal</span>
        </div>
        <p className="text-[13px] text-ink-soft mt-1">
          Tik voor inline timeline | {onOpen ? 'klik "Open" voor volledige replay' : 'volledige replay zit in admin-overlay'}.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-[14px] text-ink-mute py-12 text-center">
          Nog geen sessies. Open de demo, doorloop de flow, en kom terug.
        </div>
      ) : (
        <div className="divide-y divide-mist-light">
          {sessions.map((s) => {
            const isOpen = expanded === s.sessionId
            return (
              <div key={s.sessionId}>
                <button
                  onClick={() => setExpanded(isOpen ? null : s.sessionId)}
                  className="w-full text-left px-5 py-3.5 hover:bg-canvas-2 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StageBadge completed={s.completed} stage={s.stage} abandoned={!!s.afhaakReason} />
                      <span className="text-[13px] text-ink-soft truncate">
                        {humanizePersona(s.persona)}
                      </span>
                      {s.lead?.email && (
                        <span className="text-[12px] text-ink-mute truncate">{s.lead.email}</span>
                      )}
                    </div>
                    <div className="text-[12px] text-ink-mute tabular-nums flex flex-wrap gap-x-2.5">
                      <span>{formatTimestamp(s.startedAt)}</span>
                      <span>{formatDuration(s.duration)}</span>
                      <span>{s.events.length} events</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {onOpen && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); onOpen(s) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onOpen(s) } }}
                        className="text-[12px] text-midnite hover:text-midnite-soft border border-midnite/30 hover:border-midnite px-2.5 py-1 rounded-full transition"
                      >
                        Open
                      </span>
                    )}
                    <div className="text-ink-mute text-[15px] transition" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</div>
                  </div>
                </button>
                {isOpen && <SessionTimeline session={s} />}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function StageBadge({ completed, stage, abandoned }) {
  if (abandoned) {
    return <span className="text-[11px] tracking-wider uppercase font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">Afgehaakt</span>
  }
  if (completed) {
    return <span className="text-[11px] tracking-wider uppercase font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">Voltooid{stage ? `, ${humanizeStage(stage)}` : ''}</span>
  }
  return <span className="text-[11px] tracking-wider uppercase font-medium px-2 py-0.5 rounded-full bg-canvas-2 text-ink-soft border border-mist">In progress</span>
}

function humanizeStage(stage) {
  switch (stage) {
    case 'sales_ready': return 'Sales-ready'
    case 'koopintentie': return 'Koopintentie'
    case 'vergelijkend': return 'Vergelijkend'
    case 'orienterend': return 'Oriënterend'
    case 'nieuwsgierig': return 'Nieuwsgierig'
    default: return stage
  }
}

function SessionTimeline({ session }) {
  const { events, lead } = session
  return (
    <div className="bg-canvas-2 px-5 py-4 border-t border-mist-light">
      {(lead?.email || lead?.name || lead?.phone) && (
        <div className="rounded-xl bg-paper border border-mist-light p-3 mb-4">
          <div className="text-[11px] tracking-[0.18em] text-ink-mute uppercase mb-1.5">Lead</div>
          <div className="flex flex-wrap gap-3 text-[13px] text-ink">
            {lead.name && <span><span className="text-ink-mute">naam:</span> {lead.name}</span>}
            {lead.email && <span><span className="text-ink-mute">e-mail:</span> {lead.email}</span>}
            {lead.phone && <span><span className="text-ink-mute">06:</span> {lead.phone}</span>}
          </div>
        </div>
      )}

      <div className="text-[11px] tracking-[0.18em] text-ink-mute uppercase mb-3">Events</div>
      <ol className="relative pl-5">
        <div className="absolute left-1.5 top-1 bottom-1 w-px bg-mist" />
        {events.map((ev, i) => {
          const elapsed = i === 0 ? 0 : ev.timestamp - events[i - 1].timestamp
          return (
            <li key={ev.id} className="relative pb-3 last:pb-0">
              <div className={`absolute -left-3.5 top-1 w-3 h-3 rounded-full border-2 border-paper ${eventDotColor(ev.type)}`} />
              <div className="text-[13px] font-medium text-ink leading-snug">{humanizeEventType(ev.type)}</div>
              <div className="text-[12px] text-ink-mute tabular-nums">
                {formatTimestamp(ev.timestamp)}{elapsed > 0 ? `  +${formatDuration(elapsed)}` : ''}
              </div>
              {hasInterestingPayload(ev) && (
                <div className="text-[12px] text-ink-soft leading-snug mt-0.5">{describePayload(ev)}</div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function eventDotColor(type) {
  if (type === 'flow:complete') return 'bg-emerald-500'
  if (type === 'session:start') return 'bg-midnite'
  if (type.includes('lead-')) return 'bg-gold'
  if (type.includes('afhaak')) return 'bg-rose-500'
  if (type.includes('cta:')) return 'bg-amber-500'
  return 'bg-mist'
}

function hasInterestingPayload(ev) {
  const p = ev.payload
  if (!p) return false
  return Boolean(p.label || p.email || p.firstName || p.phone || p.id || p.variant)
}

function describePayload(ev) {
  const p = ev.payload || {}
  if (p.label) return p.label
  if (p.email) return p.email
  if (p.firstName) return p.firstName
  if (p.phone) return p.phone
  if (p.variant) return `Variant ${p.variant}`
  if (p.id) return p.id
  return ''
}
