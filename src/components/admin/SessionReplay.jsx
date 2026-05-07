import { useEffect } from 'react'
import {
  computeStepTimes,
  computeLeadScore,
  formatDuration,
  formatTimestamp,
  humanizeBubble,
  humanizeEventType,
  humanizePersona,
} from '../../lib/analytics.js'

// Side panel met de complete replay van één gebruikerssessie:
//  - vertikale timeline van events met tijdstempels
//  - duration-bars per stap (waar bleef de bezoeker plakken?)
//  - lead-data inline (naam/mail/06 zodra bekend)
//  - persona/temperature/score badges
//  - keyboard shortcuts: J/K = vorige/volgende, ESC = sluiten
export default function SessionReplay({ session, onClose, onPrev, onNext }) {
  // Keyboard shortcuts.
  useEffect(() => {
    if (!session) return
    function handler(e) {
      if (e.key === 'Escape') onClose?.()
      if (e.key === 'j' || e.key === 'ArrowDown' || e.key === 'ArrowRight') onNext?.()
      if (e.key === 'k' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') onPrev?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [session, onClose, onPrev, onNext])

  // Body-scroll-lock zolang het panel open is.
  useEffect(() => {
    if (!session) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [session])

  if (!session) return null

  const stepTimes = computeStepTimes(session.events)
  const score = computeLeadScore(session)
  const stage = session.stage || (session.completed ? 'voltooid' : 'in_progress')
  const lead = session.lead || {}

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-ink/40 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
        aria-label="Sluit replay"
      />
      {/* Panel */}
      <aside
        className="w-full sm:w-[480px] max-w-full bg-paper shadow-2xl overflow-y-auto"
        role="dialog"
        aria-label="Sessie replay"
      >
        <div className="sticky top-0 bg-paper/95 backdrop-blur-sm border-b border-mist-light px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">Sessie-replay</div>
            <div className="text-[16px] font-semibold text-ink truncate mt-0.5">
              {humanizePersona(session.persona)}
            </div>
            <div className="text-[12.5px] text-ink-mute tabular-nums mt-0.5">
              {formatTimestamp(session.startedAt)} | {formatDuration(session.duration)} | {session.events.length} events
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onPrev}
              title="Vorige sessie (K)"
              className="w-8 h-8 rounded-full border border-mist-light text-ink-soft hover:text-ink hover:border-midnite transition"
            >↑</button>
            <button
              type="button"
              onClick={onNext}
              title="Volgende sessie (J)"
              className="w-8 h-8 rounded-full border border-mist-light text-ink-soft hover:text-ink hover:border-midnite transition"
            >↓</button>
            <button
              type="button"
              onClick={onClose}
              title="Sluiten (Esc)"
              className="w-8 h-8 rounded-full border border-mist-light text-ink-soft hover:text-ink hover:border-midnite transition"
            >×</button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          <BadgesRow score={score} stage={stage} session={session} />

          <LeadCard lead={lead} />

          <Timeline events={session.events} stepTimes={stepTimes} />

          <ExportRow session={session} />
        </div>
      </aside>
    </div>
  )
}

function BadgesRow({ score, stage, session }) {
  const tempColor = scoreColor(score)
  return (
    <div className="grid grid-cols-3 gap-2">
      <Badge label="Lead-score" value={`${score}/100`} tone={tempColor} />
      <Badge label="Stage" value={humanizeStage(stage)} />
      <Badge label="Outcome" value={session.completed ? 'Voltooid' : (session.handoffOutcome || 'Verlaten')} />
    </div>
  )
}

function Badge({ label, value, tone }) {
  const toneClasses = {
    hot:   'bg-rose-50 text-rose-800 border-rose-200',
    warm:  'bg-amber-50 text-amber-800 border-amber-200',
    cold:  'bg-blue-50 text-blue-800 border-blue-200',
    none:  'bg-canvas-2 text-ink border-mist-light',
  }
  return (
    <div className={'rounded-xl border px-3 py-2 ' + (toneClasses[tone || 'none'])}>
      <div className="text-[9px] tracking-[0.16em] uppercase opacity-70">{label}</div>
      <div className="text-[14px] font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  )
}

function scoreColor(score) {
  if (score >= 70) return 'hot'
  if (score >= 45) return 'warm'
  if (score >= 20) return 'cold'
  return 'none'
}

function humanizeStage(s) {
  switch (s) {
    case 'koopintentie':         return 'Koopintentie'
    case 'actief_geinteresseerd': return 'Actief'
    case 'orienterend':          return 'Oriënterend'
    case 'nieuwsgierig':         return 'Nieuwsgierig'
    case 'voltooid':             return 'Voltooid'
    case 'in_progress':          return 'In progress'
    case 'sales_ready':          return 'Sales-ready'
    case 'rent-match':           return 'Huur-match'
    case 'afhaak':               return 'Afhaak'
    default:                     return s || '-'
  }
}

function LeadCard({ lead }) {
  if (!lead.email && !lead.firstName && !lead.phone) {
    return (
      <div className="rounded-xl border border-dashed border-mist-light bg-canvas px-4 py-3 text-[13px] text-ink-mute">
        Nog geen lead-gegevens achtergelaten
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-mist-light bg-canvas px-4 py-3">
      <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-2">Lead-gegevens</div>
      <dl className="text-[14px] grid grid-cols-[80px_1fr] gap-y-1 gap-x-3">
        {lead.firstName && <><dt className="text-ink-mute">Naam</dt><dd className="text-ink truncate">{lead.firstName}</dd></>}
        {lead.email     && <><dt className="text-ink-mute">E-mail</dt><dd className="text-ink truncate">{lead.email}</dd></>}
        {lead.phone     && <><dt className="text-ink-mute">06</dt><dd className="text-ink tabular-nums">{lead.phone}</dd></>}
      </dl>
    </div>
  )
}

function Timeline({ events, stepTimes }) {
  if (!events.length) return null
  const maxDur = Math.max(1, ...stepTimes.map((s) => s.durationMs))
  return (
    <div>
      <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-3">Event-timeline</div>
      <ol className="relative pl-6 space-y-3">
        <span className="absolute left-2 top-1 bottom-1 w-px bg-mist-light" aria-hidden />
        {events.map((ev, i) => {
          const after = stepTimes[i] // tijd tot volgende event
          const isBubble = ev.type === 'bubble:rendered'
          return (
            <li key={ev.id} className="relative">
              <span
                className={
                  'absolute -left-[18px] top-[5px] w-2.5 h-2.5 rounded-full ' +
                  (isBubble ? 'bg-gold' : 'bg-midnite')
                }
                aria-hidden
              />
              <div className="text-[13px] flex items-baseline justify-between gap-2">
                <span className={'font-medium ' + (isBubble ? 'text-ink-soft italic' : 'text-ink')}>
                  {isBubble
                    ? `${humanizeBubble(ev.payload?.kind)} bubble`
                    : humanizeEventType(ev.type)}
                </span>
                <span className="text-[11px] text-ink-mute tabular-nums">
                  {formatTimestamp(ev.timestamp)}
                </span>
              </div>
              {ev.payload?.label && !isBubble && (
                <div className="text-[12.5px] text-ink-soft mt-0.5">"{ev.payload.label}"</div>
              )}
              {after && i < events.length - 1 && after.durationMs > 200 && (
                <div className="mt-1.5 h-1 rounded bg-canvas-2 overflow-hidden">
                  <div
                    className="h-full bg-midnite/30"
                    style={{ width: `${Math.min(100, (after.durationMs / maxDur) * 100)}%` }}
                  />
                </div>
              )}
              {after && i < events.length - 1 && (
                <div className="text-[11px] text-ink-mute mt-0.5 tabular-nums">
                  {formatDuration(after.durationMs)} tot volgende
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function ExportRow({ session }) {
  function exportJson() {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clp-session-${session.sessionId.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="pt-3 border-t border-mist-light flex items-center justify-between gap-3">
      <div className="text-[11px] text-ink-mute tabular-nums truncate">
        ID {session.sessionId.slice(0, 12)}…
      </div>
      <button
        type="button"
        onClick={exportJson}
        className="text-[12px] text-ink-soft hover:text-ink border border-mist-light hover:border-midnite px-3 py-1 rounded-full transition"
      >
        Export JSON
      </button>
    </div>
  )
}
