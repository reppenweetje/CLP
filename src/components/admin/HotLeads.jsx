import { useMemo } from 'react'
import { buildHotLeads, formatRelativeTime, humanizePersona } from '../../lib/analytics.js'

// Top-N leaderboard van hete leads, gerangschikt op composite-score:
//  persona-weight + timeline-weight + size-weight
//  + engagement (unit-detail, calc-interactions)
//  + lead-presence (email/naam/06)
//  + completion + handoff-outcome
// Doel: salesteam ziet in één blik wie ze NU moeten bellen.
export default function HotLeads({ sessions, onOpenSession }) {
  const top = useMemo(() => buildHotLeads(sessions, 12), [sessions])

  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <header className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">Sales-prioriteit</div>
          <h2 className="text-[15px] font-semibold text-ink">Hete leads</h2>
          <p className="text-[13px] text-ink-soft leading-relaxed mt-1">
            Composite score uit persona, timeline, engagement, lead-data en handoff-outcome.
          </p>
        </div>
        <div className="text-[12px] text-ink-mute">{top.length} top</div>
      </header>
      {top.length === 0 || top[0].score === 0 ? (
        <div className="rounded-xl border border-dashed border-mist-light bg-canvas px-4 py-8 text-center text-[14px] text-ink-soft">
          Nog geen leads met score om te tonen.
        </div>
      ) : (
        <ol className="space-y-1.5">
          {top.map(({ session, score }, idx) => (
            <li
              key={session.sessionId}
              role="button"
              tabIndex={0}
              onClick={() => onOpenSession?.(session)}
              onKeyDown={(e) => { if (e.key === 'Enter') onOpenSession?.(session) }}
              className="grid grid-cols-[28px_1fr_72px] items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-canvas-2 cursor-pointer transition"
            >
              <div className="text-[12px] text-ink-mute tabular-nums text-center">#{idx + 1}</div>
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-ink truncate flex items-center gap-2">
                  {session.lead?.firstName || humanizePersona(session.persona)}
                  {session.lead?.email && (
                    <span className="text-[11.5px] text-ink-mute truncate">{session.lead.email}</span>
                  )}
                </div>
                <div className="text-[11.5px] text-ink-mute mt-0.5 flex items-center gap-1.5 truncate">
                  <span>{humanizePersona(session.persona)}</span>
                  {session.handoffOutcome && (
                    <span className="px-1.5 py-px rounded bg-emerald-100 text-emerald-800 text-[9.5px] uppercase tracking-wider">
                      {session.handoffOutcome}
                    </span>
                  )}
                  <span>{formatRelativeTime(session.lastEventAt)}</span>
                </div>
              </div>
              <ScoreChip value={score} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function ScoreChip({ value }) {
  const tone = value >= 70 ? 'rose' : value >= 45 ? 'amber' : 'blue'
  const cls = {
    rose:  'bg-rose-50  text-rose-800  border-rose-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    blue:  'bg-blue-50  text-blue-800  border-blue-200',
  }[tone]
  return (
    <div className={'rounded-full border px-2 py-0.5 text-[12px] font-semibold tabular-nums text-center ' + cls}>
      {value}
    </div>
  )
}
