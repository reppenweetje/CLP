import { useEffect, useState } from 'react'
import {
  buildAbandonByStep,
  buildAfhaakReasons,
  buildFunnel,
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
            <div className="w-9 h-9 rounded-full bg-midnite text-paper flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2" y="9" width="6" height="6" transform="rotate(45 5 12)" stroke="currentColor" strokeWidth="1.7" />
                <rect x="9" y="9" width="6" height="6" transform="rotate(45 12 12)" fill="currentColor" />
                <rect x="16" y="9" width="6" height="6" transform="rotate(45 19 12)" stroke="currentColor" strokeWidth="1.7" />
              </svg>
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

function avgSessionsPerDay(sessions) {
  if (sessions.length === 0) return '0'
  const oldest = sessions[sessions.length - 1].startedAt
  const days = Math.max(1, (Date.now() - oldest) / 86400000)
  return (sessions.length / days).toFixed(1)
}
