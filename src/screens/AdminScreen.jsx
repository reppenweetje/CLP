import { useEffect, useMemo, useState } from 'react'
import {
  buildAbandonByStep,
  buildAfhaakReasons,
  buildFunnel,
  buildHandoffByPersona,
  buildHandoffStats,
  buildPersonaBreakdown,
  buildSessions,
  buildVariantBreakdown,
  clearAllEvents,
  exportSessionsJson,
  filterByDateRange,
  formatDuration,
  getSessions,
} from '../lib/analytics.js'
import {
  fetchTeamEvents,
  getTenant,
  isTeamFetchConfigured,
  supabaseRowToLocalEvent,
} from '../lib/eventsApi.js'
import { fetchTeamLeads, isLeadsFetchConfigured } from '../lib/api.js'
import KpiCard from '../components/admin/KpiCard.jsx'
import FunnelChart from '../components/admin/FunnelChart.jsx'
import PersonaBreakdown from '../components/admin/PersonaBreakdown.jsx'
import VariantBreakdown from '../components/admin/VariantBreakdown.jsx'
import AfhaakBreakdown from '../components/admin/AfhaakBreakdown.jsx'
import SessionsList from '../components/admin/SessionsList.jsx'
import AdminPasswordGate from '../components/admin/AdminPasswordGate.jsx'
import DateRangePicker from '../components/admin/DateRangePicker.jsx'
import SankeyFlow from '../components/admin/SankeyFlow.jsx'
import BubbleExposure from '../components/admin/BubbleExposure.jsx'
import SessionReplay from '../components/admin/SessionReplay.jsx'
import TimeToConversion from '../components/admin/TimeToConversion.jsx'
import DropoffMatrix from '../components/admin/DropoffMatrix.jsx'
import RealTimeTile from '../components/admin/RealTimeTile.jsx'
import HotLeads from '../components/admin/HotLeads.jsx'
import RegistrationsList from '../components/admin/RegistrationsList.jsx'
import ErrorBoundary from '../components/admin/ErrorBoundary.jsx'
import ABSignificance from '../components/admin/ABSignificance.jsx'
import CohortHeatmap from '../components/admin/CohortHeatmap.jsx'
import AIWeeklySummary from '../components/admin/AIWeeklySummary.jsx'
import AdminSidebar, { useActiveSection } from '../components/admin/AdminSidebar.jsx'
import AdminSettings from '../components/admin/AdminSettings.jsx'
import SupabaseQueueTile from '../components/admin/SupabaseQueueTile.jsx'

// Sectie-definities. id matcht het DOM-element-id van de wrapper, label is
// wat de sidebar laat zien. Labels zijn kort gehouden (≤14 chars) zodat
// ze niet truncaten in de 200px brede sidebar.
const SECTIONS = [
  { id: 'overview', label: 'Overzicht' },
  { id: 'registraties', label: 'Registraties' },
  { id: 'insights', label: 'Insights' },
  { id: 'route',    label: 'Route' },
  { id: 'bubbles',  label: 'Bubbles + leads' },
  { id: 'tempo',    label: 'Tempo + tijd' },
  { id: 'dropoff',  label: 'Drop-off' },
  { id: 'funnel',   label: 'Funnel + A/B' },
  { id: 'handoff',  label: 'Warm handoff' },
  { id: 'afhaak',   label: 'Afhaak' },
  { id: 'sessies',  label: 'Sessies' },
  { id: 'supabase', label: 'Supabase' },
  { id: 'settings', label: 'Settings' },
]

export default function AdminScreen() {
  return (
    <AdminPasswordGate>
      <AdminScreenInner />
    </AdminPasswordGate>
  )
}

function AdminScreenInner() {
  // Data-source: 'team' = aggregaat over alle bezoekers cross-device via
  // clp-analytics.clp_events, 'local' = alleen events uit deze browser
  // (debug). Default = team zodra clp-analytics geconfigureerd is; lokaal
  // alleen bereikbaar via ?source=local URL-param.
  const teamConfigured = isTeamFetchConfigured()
  const initialSource = (() => {
    if (typeof window === 'undefined') return teamConfigured ? 'team' : 'local'
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('source') === 'local') return 'local'
    } catch {}
    return teamConfigured ? 'team' : 'local'
  })()
  const [dataSource] = useState(initialSource)

  const [localSessions, setLocalSessions] = useState(() => getSessions())
  const [teamSessions, setTeamSessions] = useState([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState(null)
  const [teamFetchedAt, setTeamFetchedAt] = useState(null)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const [teamLeads, setTeamLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [leadsError, setLeadsError] = useState(null)

  const [, setTick] = useState(0)
  const [dateRange, setDateRange] = useState('all')
  const [replaySessionId, setReplaySessionId] = useState(null)

  // Local-mode subscribers (storage events, focus, 15s poll)
  useEffect(() => {
    if (dataSource !== 'local') return
    if (typeof window === 'undefined') return
    const refresh = () => setLocalSessions(getSessions())
    const onFocus = () => refresh()
    const onStorage = (e) => { if (e.key === 'clp-events-v1') refresh() }
    window.addEventListener('focus', onFocus)
    window.addEventListener('storage', onStorage)
    const id = setInterval(refresh, 15000)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('storage', onStorage)
      clearInterval(id)
    }
  }, [dataSource])

  // Team-mode events fetch via clp-events-fetch. Refetch op dataSource-
  // switch, window-focus en 60s timer; refreshNonce triggert handmatig.
  useEffect(() => {
    if (dataSource !== 'team') return
    if (!teamConfigured) return
    let cancelled = false

    async function load() {
      setTeamLoading(true)
      setTeamError(null)
      try {
        const rows = await fetchTeamEvents({ limit: 10000 })
        if (cancelled) return
        const local = rows.map(supabaseRowToLocalEvent)
        const built = buildSessions(local)
        setTeamSessions(built)
        setTeamFetchedAt(Date.now())
      } catch (err) {
        if (cancelled) return
        setTeamError(err?.message || String(err))
      } finally {
        if (!cancelled) setTeamLoading(false)
      }
    }

    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    const id = setInterval(load, 60000)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      clearInterval(id)
    }
  }, [dataSource, teamConfigured, refreshNonce])

  // Registraties (clp_leads dual-write kopieën) via clp-leads-fetch.
  // Alleen in team-modus; refetch bij dataSource-switch, focus en
  // handmatige refresh (refreshNonce).
  const leadsConfigured = isLeadsFetchConfigured()
  useEffect(() => {
    if (dataSource !== 'team' || !leadsConfigured) return
    let cancelled = false
    async function loadLeads() {
      setLeadsLoading(true)
      setLeadsError(null)
      try {
        const rows = await fetchTeamLeads({ limit: 5000 })
        if (!cancelled) setTeamLeads(rows)
      } catch (err) {
        if (!cancelled) setLeadsError(err?.message || String(err))
      } finally {
        if (!cancelled) setLeadsLoading(false)
      }
    }
    loadLeads()
    const onFocus = () => loadLeads()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [dataSource, leadsConfigured, refreshNonce])

  const allSessions = dataSource === 'team' ? teamSessions : localSessions
  const sessions = useMemo(() => filterByDateRange(allSessions, dateRange), [allSessions, dateRange])
  const sectionIds = useMemo(() => SECTIONS.map((s) => s.id), [])
  const observedSection = useActiveSection(sectionIds)
  // Optimistic override: na een sidebar-click highlighten we direct de
  // doel-sectie. Scroll-driven detectie neemt 't 600ms later weer over,
  // zodat user-scrolling alsnog accuraat is.
  const [pinnedSection, setPinnedSection] = useState(null)
  const activeSection = pinnedSection || observedSection
  function onNavigate(id) {
    setPinnedSection(id)
    setTimeout(() => setPinnedSection(null), 700)
  }

  const total = sessions.length
  const completed = sessions.filter((s) => s.completed).length
  const completionRate = total > 0 ? (completed / total) * 100 : 0
  const leads = sessions.filter((s) => s.lead?.email).length
  const phoneShares = sessions.filter((s) => s.lead?.phone).length
  const avgDuration = total > 0 ? sessions.reduce((sum, s) => sum + s.duration, 0) / total : 0
  const afhakers = sessions.filter((s) => s.afhaakReason).length

  const funnel = useMemo(() => buildFunnel(sessions), [sessions])
  const persona = useMemo(() => buildPersonaBreakdown(sessions), [sessions])
  const variants = useMemo(() => buildVariantBreakdown(sessions), [sessions])
  const abandonByStep = useMemo(() => buildAbandonByStep(sessions), [sessions])
  const reasons = useMemo(() => buildAfhaakReasons(sessions), [sessions])
  const handoffStats = useMemo(() => buildHandoffStats(sessions), [sessions])
  const handoffByPersona = useMemo(() => buildHandoffByPersona(sessions), [sessions])

  const replaySession = sessions.find((s) => s.sessionId === replaySessionId) || null
  const replayIndex = sessions.findIndex((s) => s.sessionId === replaySessionId)

  function openReplay(s) { setReplaySessionId(s.sessionId) }
  function closeReplay() { setReplaySessionId(null) }
  function nextSession() {
    if (replayIndex < 0) return
    const next = sessions[(replayIndex + 1) % sessions.length]
    if (next) setReplaySessionId(next.sessionId)
  }
  function prevSession() {
    if (replayIndex < 0) return
    const prev = sessions[(replayIndex - 1 + sessions.length) % sessions.length]
    if (prev) setReplaySessionId(prev.sessionId)
  }

  const onClear = () => {
    if (typeof window === 'undefined') return
    if (dataSource !== 'local') {
      window.alert('Wissen werkt alleen in Lokaal-mode. Team-data wordt in Supabase bewaard en kan niet via dit dashboard worden gewist.')
      return
    }
    if (window.confirm('Alle lokale event-data wordt verwijderd. Doorgaan?')) {
      clearAllEvents()
      setLocalSessions([])
      setTick((t) => t + 1)
    }
  }

  const onExport = () => {
    if (typeof window === 'undefined') return
    const payload = dataSource === 'team'
      ? JSON.stringify(allSessions, null, 2)
      : exportSessionsJson()
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clp-sessions-${dataSource}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onManualRefresh = () => setRefreshNonce((n) => n + 1)

  function formatRelative(ts) {
    if (!ts) return 'onbekend'
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60) return `${s}s geleden`
    if (s < 3600) return `${Math.floor(s / 60)}m geleden`
    return `${Math.floor(s / 3600)}u geleden`
  }

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur-md border-b border-mist-light">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-midnite flex items-center justify-center shrink-0">
              <img src="/images/repp-mark.svg" alt="" aria-hidden="true" className="w-[22px]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium leading-none whitespace-nowrap">REPP CLP analytics</div>
              <h1 className="text-[18px] font-semibold text-ink mt-1 leading-tight whitespace-nowrap">De Hofman dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {dataSource === 'local' && (
              <span
                className="text-[10px] tracking-[0.16em] uppercase text-rose-700 border border-rose-300 px-2 py-1 rounded-full whitespace-nowrap"
                title="?source=local URL-param actief"
              >
                Dev · lokale browser-data
              </span>
            )}
            {dataSource === 'team' && (
              <button
                onClick={onManualRefresh}
                disabled={teamLoading}
                className="text-[12px] text-ink-soft hover:text-ink border border-mist hover:border-midnite px-3 py-1.5 rounded-full transition whitespace-nowrap disabled:opacity-50"
                title={teamFetchedAt ? `Laatst opgehaald ${formatRelative(teamFetchedAt)}` : 'Vernieuwen'}
              >
                {teamLoading ? 'Vernieuwen…' : `↻ ${teamFetchedAt ? formatRelative(teamFetchedAt) : 'Ophalen'}`}
              </button>
            )}
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <a
              href="/"
              className="text-[13px] text-ink-soft hover:text-ink border border-mist hover:border-midnite px-3 py-1.5 rounded-full transition whitespace-nowrap"
              title="Terug naar demo"
            >
              ← Demo
            </a>
            <button
              onClick={onExport}
              className="text-[13px] text-ink-soft hover:text-ink border border-mist hover:border-midnite px-3 py-1.5 rounded-full transition whitespace-nowrap"
            >
              Export
            </button>
            {dataSource === 'local' && (
              <button
                onClick={onClear}
                className="text-[13px] text-rose-700 hover:text-rose-900 border border-rose-300 hover:bg-rose-50 px-3 py-1.5 rounded-full transition whitespace-nowrap"
                title="Wist localStorage van deze browser"
              >
                Wissen
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 py-6 grid lg:grid-cols-[200px_minmax(0,1fr)] gap-6 lg:gap-8">
        <AdminSidebar sections={SECTIONS} activeId={activeSection} onNavigate={onNavigate} />

        <main className="space-y-6 min-w-0">
          {/* Team-mode status banner: error of empty-state info */}
          {dataSource === 'team' && teamError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
              <strong className="font-semibold">Kon team-data niet ophalen.</strong>{' '}
              {teamError}{' '}
              <button onClick={onManualRefresh} className="underline ml-1">Opnieuw proberen</button>
            </div>
          )}
          {dataSource === 'team' && !teamError && allSessions.length === 0 && !teamLoading && (
            <div className="rounded-xl border border-mist-light bg-canvas-2 px-4 py-3 text-[13px] text-ink-soft">
              Nog geen sessies geregistreerd voor tenant <code className="bg-paper px-1.5 py-0.5 rounded">{getTenant() || 'onbekend'}</code>. Open de De Hofman CLP, doorloop de chat-flow, en kom terug.
            </div>
          )}

          {/* Overview */}
          <section id="overview" className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 scroll-mt-24">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Sessies" value={total} subtext={avgPerDayLabel(sessions)} />
              <KpiCard
                label="Voltooid"
                value={`${completionRate.toFixed(0)}%`}
                subtext={`${completed} van ${total}`}
                accent={completionRate >= 50}
              />
              <KpiCard label="Leads" value={leads} subtext={`waarvan ${phoneShares} met 06`} />
              <KpiCard label="Gem. duur" value={formatDuration(avgDuration)} subtext={`${afhakers} afgehaakt`} />
            </div>
            <RealTimeTile onOpenSession={openReplay} />
          </section>

          {/* Registraties (clp_leads dual-write kopieën) */}
          <section id="registraties" className="scroll-mt-24">
            <RegistrationsList
              leads={teamLeads}
              loading={leadsLoading}
              error={leadsError}
              teamMode={dataSource === 'team'}
              configured={leadsConfigured}
            />
          </section>

          {/* Insights */}
          <section id="insights" className="scroll-mt-24">
            <AIWeeklySummary sessions={sessions} />
          </section>

          {/* Route */}
          <section id="route" className="scroll-mt-24">
            <ErrorBoundary label="Sankey">
              <SankeyFlow sessions={sessions} />
            </ErrorBoundary>
          </section>

          {/* Bubbles + Hot leads */}
          <section id="bubbles" className="grid lg:grid-cols-2 gap-5 scroll-mt-24">
            <BubbleExposure sessions={sessions} />
            <HotLeads sessions={sessions} onOpenSession={openReplay} />
          </section>

          {/* Tempo + Activity */}
          <section id="tempo" className="grid lg:grid-cols-2 gap-5 scroll-mt-24">
            <TimeToConversion sessions={sessions} />
            <CohortHeatmap sessions={sessions} />
          </section>

          {/* Drop-off matrix */}
          <section id="dropoff" className="scroll-mt-24">
            <DropoffMatrix sessions={sessions} />
          </section>

          {/* Funnel + persona + A/B */}
          <section id="funnel" className="grid lg:grid-cols-2 gap-5 scroll-mt-24">
            <FunnelChart funnel={funnel} />
            <div className="space-y-5">
              <PersonaBreakdown data={persona} />
              <ABSignificance sessions={sessions} />
              <VariantBreakdown data={variants} sessions={sessions} />
            </div>
          </section>

          {/* Warm handoff */}
          <section id="handoff" className="scroll-mt-24">
            <HandoffBlock stats={handoffStats} byPersona={handoffByPersona} />
          </section>

          {/* Afhaak */}
          <section id="afhaak" className="scroll-mt-24">
            <AfhaakBreakdown byStep={abandonByStep} byReason={reasons} />
          </section>

          {/* Sessies list */}
          <section id="sessies" className="scroll-mt-24">
            <SessionsList sessions={sessions} onOpen={openReplay} />
          </section>

          {/* Supabase pipeline diagnose */}
          <SupabaseQueueTile />

          {/* Settings */}
          <AdminSettings />

          <footer className="pt-4 text-[12px] text-ink-mute leading-relaxed">
            {dataSource === 'team' ? (
              <>Bron: Supabase project <code className="bg-canvas-2 px-1.5 py-0.5 rounded">clp-analytics</code>, tabel <code className="bg-canvas-2 px-1.5 py-0.5 rounded">clp_events</code>, tenant <code className="bg-canvas-2 px-1.5 py-0.5 rounded">{getTenant() || 'onbekend'}</code>. Limit 10.000 events/refresh.</>
            ) : (
              <>Bron: alleen events uit deze browser via <code className="bg-canvas-2 px-1.5 py-0.5 rounded">clp-events-v1</code>.</>
            )}
            {' '}Plausible Pro forwardt non-PII custom events.
          </footer>
        </main>
      </div>

      <SessionReplay
        session={replaySession}
        onClose={closeReplay}
        onPrev={prevSession}
        onNext={nextSession}
      />
    </div>
  )
}

function HandoffBlock({ stats, byPersona }) {
  if (!stats || stats.shown === 0) {
    return (
      <section className="rounded-2xl border border-mist-light bg-paper p-5">
        <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">
          Warm-handoff
        </div>
        <div className="text-[15px] font-semibold text-ink">Nog geen hot signalen gedetecteerd</div>
        <div className="text-[13px] text-ink-soft leading-relaxed mt-1">
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
          <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">
            Warm-handoff
          </div>
          <div className="text-[15px] font-semibold text-ink">Hot signalen en accept-rate</div>
        </div>
        <div className="text-[12px] text-ink-mute">
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
          <div className="text-[11px] tracking-[0.16em] text-ink-mute uppercase mb-2">Per persona</div>
          <div className="space-y-1.5">
            {byPersona.map((row) => {
              const rate = row.shown > 0 ? Math.round((row.accepted / row.shown) * 100) : 0
              return (
                <div key={row.persona} className="flex items-baseline justify-between gap-3 text-[13.5px]">
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

function avgPerDayLabel(sessions) {
  if (sessions.length === 0) return '0 per dag'
  const oldest = sessions[sessions.length - 1].startedAt
  const days = Math.max(1, (Date.now() - oldest) / 86400000)
  return `${(sessions.length / days).toFixed(1)} per dag`
}
