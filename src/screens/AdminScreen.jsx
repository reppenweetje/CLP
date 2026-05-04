import { useEffect, useState } from 'react'
import {
  buildAbandonByStep,
  buildAfhaakReasons,
  buildFunnel,
  buildHandoffByPersona,
  buildHandoffStats,
  buildPersonaBreakdown,
  buildVariantBreakdown,
  clearAllEvents,
  exportSessionsJson,
  formatDuration,
  getSessions,
} from '../lib/analytics.js'
import KpiCard from '../components/admin/KpiCard.jsx'
import FunnelChart from '../components/admin/FunnelChart.jsx'
import PersonaBreakdown from '../components/admin/PersonaBreakdown.jsx'
import VariantBreakdown from '../components/admin/VariantBreakdown.jsx'
import AfhaakBreakdown from '../components/admin/AfhaakBreakdown.jsx'
import SessionsList from '../components/admin/SessionsList.jsx'

export default function AdminScreen() {
  const [sessions, setSessions] = useState(() => getSessions())
  const [, setTick] = useState(0)

  // Re-laad de sessies elke keer dat het admin venster focus krijgt
  // zodat events die in een ander tab zijn gegenereerd zichtbaar worden.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onFocus = () => setSessions(getSessions())
    const onStorage = (e) => {
      if (e.key === 'clp-events-v1') setSessions(getSessions())
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const total = sessions.length
  const completed = sessions.filter((s) => s.completed).length
  const completionRate = total > 0 ? (completed / total) * 100 : 0
  const leads = sessions.filter((s) => s.lead?.email).length
  const phoneShares = sessions.filter((s) => s.lead?.phone).length
  const avgDuration = total > 0 ? sessions.reduce((sum, s) => sum + s.duration, 0) / total : 0
  const afhakers = sessions.filter((s) => s.afhaakReason).length

  const funnel = buildFunnel(sessions)
  const persona = buildPersonaBreakdown(sessions)
  const variants = buildVariantBreakdown(sessions)
  const abandonByStep = buildAbandonByStep(sessions)
  const reasons = buildAfhaakReasons(sessions)
  const handoffStats = buildHandoffStats(sessions)
  const handoffByPersona = buildHandoffByPersona(sessions)

  const onClear = () => {
    if (typeof window !== 'undefined' && window.confirm('Alle event-data wordt verwijderd. Doorgaan?')) {
      clearAllEvents()
      setSessions([])
      setTick((t) => t + 1)
    }
  }

  const onExport = () => {
    if (typeof window === 'undefined') return
    const blob = new Blob([exportSessionsJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clp-sessions-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <header className="sticky top-0 z-10 bg-canvas/90 backdrop-blur-md border-b border-mist-light">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-midnite flex items-center justify-center shrink-0">
              <img src="/images/repp-mark.svg" alt="" aria-hidden="true" className="w-[22px]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium leading-none whitespace-nowrap">REPP CLP analytics</div>
              <h1 className="text-[18px] font-semibold text-ink mt-1 leading-tight whitespace-nowrap">De Hofman dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/"
              className="text-[12px] text-ink-soft hover:text-ink border border-mist hover:border-midnite px-3 py-1.5 rounded-full transition whitespace-nowrap"
              title="Terug naar demo"
            >
              ← Demo
            </a>
            <button
              onClick={onExport}
              className="text-[12px] text-ink-soft hover:text-ink border border-mist hover:border-midnite px-3 py-1.5 rounded-full transition whitespace-nowrap"
            >
              Export
            </button>
            <button
              onClick={onClear}
              className="text-[12px] text-rose-700 hover:text-rose-900 border border-rose-300 hover:bg-rose-50 px-3 py-1.5 rounded-full transition whitespace-nowrap"
            >
              Wissen
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Sessies" value={total} subtext={`${avgSessionsPerDay(sessions)} per dag`} />
          <KpiCard
            label="Voltooid"
            value={`${completionRate.toFixed(0)}%`}
            subtext={`${completed} van ${total}`}
            accent={completionRate >= 50}
          />
          <KpiCard label="Leads" value={leads} subtext={`waarvan ${phoneShares} met 06`} />
          <KpiCard label="Gem. duur" value={formatDuration(avgDuration)} subtext={`${afhakers} afgehaakt`} />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <FunnelChart funnel={funnel} />
          <div className="space-y-5">
            <PersonaBreakdown data={persona} />
            <VariantBreakdown data={variants} sessions={sessions} />
          </div>
        </div>

        <HandoffBlock stats={handoffStats} byPersona={handoffByPersona} />

        <AfhaakBreakdown byStep={abandonByStep} byReason={reasons} />

        <SessionsList sessions={sessions} />

        <footer className="pt-4 text-[11px] text-ink-mute leading-relaxed">
          Events worden lokaal in localStorage opgeslagen onder <code className="bg-canvas-2 px-1.5 py-0.5 rounded">clp-events-v1</code>.
          Voor productie vervang je <code className="bg-canvas-2 px-1.5 py-0.5 rounded">trackEvent()</code> in <code className="bg-canvas-2 px-1.5 py-0.5 rounded">src/lib/analytics.js</code> door een POST naar een backend of een service als PostHog.
        </footer>
      </main>
    </div>
  )
}

function HandoffBlock({ stats, byPersona }) {
  if (!stats || stats.shown === 0) {
    return (
      <section className="rounded-2xl border border-mist-light bg-paper p-5">
        <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">
          Warm-handoff
        </div>
        <div className="text-[14px] font-semibold text-ink">Nog geen hot signalen gedetecteerd</div>
        <div className="text-[12px] text-ink-soft leading-relaxed mt-1">
          Zodra een sessie genoeg koopsignalen geeft (unit-detail twee keer, calc-interactie, korte timeline) verschijnt hier de conversie van de warm-handoff bubble.
        </div>
      </section>
    )
  }
  const acceptRate = stats.shown > 0 ? Math.round((stats.accepted / stats.shown) * 100) : 0
  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">
            Warm-handoff
          </div>
          <div className="text-[14px] font-semibold text-ink">Hot signalen en accept-rate</div>
        </div>
        <div className="text-[11px] text-ink-mute">
          {stats.shown} {stats.shown === 1 ? 'sessie' : 'sessies'} hot
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Getoond" value={stats.shown} subtext={`${Math.round((stats.shown / Math.max(1, stats.total)) * 100)}% van alle sessies`} />
        <KpiCard label="Accepteerd" value={stats.accepted} subtext={`${acceptRate}% accept-rate`} accent={acceptRate >= 25} />
        <KpiCard label="Afgewezen" value={stats.dismissed} subtext="Liever later" />
        <KpiCard label="Geen actie" value={stats.noAction} subtext="Wel getoond, niet getapt" />
      </div>
      {byPersona.length > 0 && (
        <div className="mt-4 pt-4 border-t border-mist-light">
          <div className="text-[10px] tracking-[0.16em] text-ink-mute uppercase mb-2">Per persona</div>
          <div className="space-y-1.5">
            {byPersona.map((row) => {
              const rate = row.shown > 0 ? Math.round((row.accepted / row.shown) * 100) : 0
              return (
                <div key={row.persona} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="text-ink-soft capitalize">{row.persona.replace('_', ' ')}</span>
                  <span className="text-ink tabular-nums">
                    <span className="font-semibold">{row.accepted}</span>
                    <span className="text-ink-mute"> van {row.shown}</span>
                    <span className="text-ink-mute ml-2">({rate}%)</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

function avgSessionsPerDay(sessions) {
  if (sessions.length === 0) return '0'
  const oldest = sessions[sessions.length - 1].startedAt
  const days = Math.max(1, (Date.now() - oldest) / 86400000)
  return (sessions.length / days).toFixed(1)
}
