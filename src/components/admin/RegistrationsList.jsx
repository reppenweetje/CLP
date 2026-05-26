import { useEffect, useMemo, useRef, useState } from 'react'
import {
  archiveLead,
  CRM_STATUS_AUTO_ARCHIVE,
  CRM_STATUS_LABEL,
  CRM_STATUS_LIST,
  CRM_STATUS_TONE,
  restoreLead,
  setLeadStatus,
} from '../../lib/api.js'

// Toont de daadwerkelijk gecapteerde registraties uit de clp_leads-tabel:
// bezoekers die hun contactgegevens hebben achtergelaten. Los van "Hete
// leads" — dat is gedrags-scoring over alle sessies; dit zijn de echte
// inschrijvingen met e-mail of telefoon.
//
// Data komt via de clp-leads-fetch Edge Function (api.js::fetchTeamLeads).
// clp_leads is RLS-locked want het bevat PII; alleen team-modus toont dit.
// Voor De Hofman zijn dit de dual-write kopieën van leads die canoniek in
// reppbot.leads staan (pushAnalyticsCopy in api.js).
//
// Mini-CRM:
//  - elke rij heeft een inline status-dropdown (de chip is klikbaar zonder
//    dat je de modal hoeft te openen)
//  - selectie-checkbox links per rij + select-all in de header
//  - bulk-action bar bovenaan zodra je iets selecteert: status wijzigen of
//    archiveren in één klap, perfect voor het opruimen van test-leads
//  - archief-toggle wisselt tussen actief en gearchiveerd; bulk-actie wordt
//    dan "Herstellen" ipv "Naar archief"
export default function RegistrationsList({
  leads = [],
  loading = false,
  error = null,
  teamMode = false,
  configured = false,
  onOpenLead,
  onLeadUpdate,
  showArchived = false,
  onToggleArchived,
}) {
  const sorted = useMemo(() => {
    return [...(leads || [])].sort(
      (a, b) =>
        new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime(),
    )
  }, [leads])
  const withPhone = useMemo(() => sorted.filter((l) => l && l.phone).length, [sorted])

  const [selected, setSelected] = useState(() => new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkErr, setBulkErr] = useState(null)

  // Reset selectie wanneer de zichtbare set verandert (bv. archive-toggle of
  // refetch) — anders blijven we ids "geselecteerd" die niet meer in beeld
  // staan en kan de bulk-actie verwarrend werken.
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev
      const visible = new Set(sorted.map((l) => l.id))
      const next = new Set()
      for (const id of prev) if (visible.has(id)) next.add(id)
      return next.size === prev.size ? prev : next
    })
  }, [sorted])

  const visibleIds = useMemo(() => sorted.map((l) => l.id).filter((x) => x != null), [sorted])
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0 && !allSelected

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(visibleIds))
  }
  function clearSelection() { setSelected(new Set()) }

  async function runBulk(fn, label) {
    if (selected.size === 0 || bulkBusy) return
    setBulkBusy(true); setBulkErr(null)
    const ids = [...selected]
    const failures = []
    for (const id of ids) {
      try {
        const updated = await fn(id)
        onLeadUpdate?.(updated)
      } catch (e) {
        failures.push({ id, msg: e?.message || 'mislukt' })
      }
    }
    setBulkBusy(false)
    setSelected(new Set())
    if (failures.length > 0) {
      setBulkErr(`${failures.length} van ${ids.length} ${label} mislukt (${failures[0].msg})`)
    }
  }

  const handleBulkStatus = (status) => runBulk((id) => setLeadStatus(id, status), 'status-update')
  const handleBulkArchive = () => runBulk((id) => archiveLead(id), 'archivering')
  const handleBulkRestore = () => runBulk((id) => restoreLead(id), 'herstel')

  async function handleRowStatus(lead, status) {
    if (!lead || status === lead.crm_status) return
    const previous = lead
    onLeadUpdate?.({ ...lead, crm_status: status })
    try {
      const updated = await setLeadStatus(lead.id, status)
      onLeadUpdate?.(updated)
    } catch (e) {
      onLeadUpdate?.(previous)
    }
  }

  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <header className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">
            {showArchived ? 'Archief' : 'Inschrijvingen'}
          </div>
          <h2 className="text-[15px] font-semibold text-ink">
            {showArchived ? 'Gearchiveerde registraties' : 'Registraties'}
          </h2>
          <p className="text-[13px] text-ink-soft leading-relaxed mt-1">
            {showArchived
              ? 'Eerder gearchiveerde leads. Selecteer om in bulk te herstellen.'
              : 'Klik op een naam voor de call-briefing. Selecteer rijen voor bulk-acties.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {sorted.length > 0 && (
            <div className="text-[12px] text-ink-mute whitespace-nowrap">
              {sorted.length} {showArchived ? 'gearchiveerd' : 'actief'}
              {!showArchived && `, ${withPhone} met 06`}
            </div>
          )}
          {typeof onToggleArchived === 'function' && (
            <button
              type="button"
              onClick={onToggleArchived}
              className="text-[11.5px] font-medium rounded-full border border-mist bg-paper px-3 py-1 text-ink-soft hover:border-midnite/40 hover:text-ink transition"
              aria-pressed={showArchived}
            >
              {showArchived ? '← Terug naar actief' : 'Toon archief'}
            </button>
          )}
        </div>
      </header>

      {/* Bulk-action bar — alleen zichtbaar bij selectie */}
      {selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          showArchived={showArchived}
          busy={bulkBusy}
          error={bulkErr}
          onPickStatus={handleBulkStatus}
          onArchive={handleBulkArchive}
          onRestore={handleBulkRestore}
          onClear={clearSelection}
        />
      )}

      <Body
        sorted={sorted}
        loading={loading}
        error={error}
        teamMode={teamMode}
        configured={configured}
        onOpenLead={onOpenLead}
        showArchived={showArchived}
        selected={selected}
        toggleOne={toggleOne}
        toggleAll={toggleAll}
        allSelected={allSelected}
        someSelected={someSelected}
        onRowStatus={handleRowStatus}
      />
    </section>
  )
}

// ── Bulk-action bar ──────────────────────────────────────────────────────────

function BulkActionBar({
  count,
  showArchived,
  busy,
  error,
  onPickStatus,
  onArchive,
  onRestore,
  onClear,
}) {
  return (
    <div className="mb-3 rounded-xl bg-midnite text-paper px-3 py-2.5 flex flex-wrap items-center gap-2 shadow-sm">
      <span className="text-[13px] font-semibold tabular-nums shrink-0">
        {count} geselecteerd
      </span>
      <span className="text-[11px] text-paper/70 hidden sm:inline">·</span>
      <BulkStatusPicker onPick={onPickStatus} disabled={busy} />
      <button
        type="button"
        onClick={showArchived ? onRestore : onArchive}
        disabled={busy}
        className={
          'rounded-full px-3 py-1 text-[12px] font-medium transition disabled:opacity-50 ' +
          (showArchived
            ? 'bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30'
            : 'bg-rose-400/20 text-rose-100 hover:bg-rose-400/30')
        }
      >
        {busy ? 'Bezig…' : showArchived ? 'Herstel naar actief' : 'Naar archief'}
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={busy}
        className="rounded-full border border-paper/30 px-3 py-1 text-[12px] font-medium text-paper/80 hover:bg-paper/10 disabled:opacity-50 transition"
      >
        Annuleer
      </button>
      {error && (
        <span className="text-[11px] text-rose-200 ml-auto truncate max-w-full">{error}</span>
      )}
    </div>
  )
}

function BulkStatusPicker({ onPick, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false))
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])
  function handle(s) {
    setOpen(false)
    onPick?.(s)
  }
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-full bg-paper/15 hover:bg-paper/25 disabled:opacity-50 px-3 py-1 text-[12px] font-medium text-paper transition"
      >
        Status wijzigen
        <Caret />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-30 min-w-[170px] rounded-lg border border-mist bg-paper py-1 text-ink shadow-lg"
        >
          {CRM_STATUS_LIST.map((s) => (
            <button
              key={s}
              role="menuitem"
              type="button"
              onClick={() => handle(s)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-[12.5px] hover:bg-canvas-2 text-left"
            >
              <span className={'inline-block w-2.5 h-2.5 rounded-full border ' + (CRM_STATUS_TONE[s] || '')} aria-hidden />
              <span className="text-ink">{CRM_STATUS_LABEL[s]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Body / states ────────────────────────────────────────────────────────────

function Body({
  sorted,
  loading,
  error,
  teamMode,
  configured,
  onOpenLead,
  showArchived,
  selected,
  toggleOne,
  toggleAll,
  allSelected,
  someSelected,
  onRowStatus,
}) {
  if (!teamMode) {
    return (
      <Empty>
        Registraties zijn alleen zichtbaar in team-modus. De lokale modus toont
        enkel events uit deze browser.
      </Empty>
    )
  }
  if (!configured) {
    return (
      <Empty>
        Leads-fetch is nog niet geconfigureerd. Zet <Code>VITE_ADMIN_READ_TOKEN</Code> in
        de Vercel-omgeving en deploy de <Code>clp-leads-fetch</Code> Edge Function.
      </Empty>
    )
  }
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
        <strong className="font-semibold">Kon registraties niet ophalen.</strong> {error}
      </div>
    )
  }
  if (loading && sorted.length === 0) {
    return <Empty>Registraties ophalen.</Empty>
  }
  if (sorted.length === 0) {
    return (
      <Empty>
        {showArchived
          ? 'Archief is leeg.'
          : 'Nog geen registraties. Zodra een bezoeker de chat afrondt met een e-mailadres verschijnt die hier.'}
      </Empty>
    )
  }
  return (
    <div>
      {/* Selectie-header — alleen tonen als er rijen zijn */}
      <div className="flex items-center gap-3 px-2 -mx-1 py-2 border-b border-mist-light">
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={toggleAll}
          ariaLabel={allSelected ? 'Alles deselecteren' : 'Alles selecteren'}
        />
        <span className="text-[11px] uppercase tracking-wider text-ink-mute font-medium">
          {allSelected ? 'Alle' : someSelected ? `${[...selected].length} geselecteerd` : 'Selecteer'}
        </span>
      </div>
      <ul className="divide-y divide-mist-light">
        {sorted.map((lead) => (
          <LeadRow
            key={lead.id ?? lead.session_id}
            lead={lead}
            onOpen={onOpenLead}
            selected={selected.has(lead.id)}
            onToggle={() => toggleOne(lead.id)}
            onStatusChange={(s) => onRowStatus(lead, s)}
          />
        ))}
      </ul>
    </div>
  )
}

// ── Lead row ─────────────────────────────────────────────────────────────────

function LeadRow({ lead, onOpen, selected, onToggle, onStatusChange }) {
  const name = lead.first_name || 'Onbekend'
  const consents = Array.isArray(lead.consent_log) ? lead.consent_log.length : 0
  const noteCount = Array.isArray(lead.crm_notes) ? lead.crm_notes.length : 0
  const handleOpen = () => onOpen?.(lead)
  const clickable = typeof onOpen === 'function'
  return (
    <li
      className={
        'grid grid-cols-[auto_1fr_auto] items-start gap-3 px-2 -mx-1 py-2.5 rounded-lg transition ' +
        (selected ? 'bg-midnite/5' : 'hover:bg-canvas-2')
      }
    >
      <div className="pt-1.5">
        <Checkbox
          checked={selected}
          onChange={onToggle}
          ariaLabel={`Selecteer ${name}`}
        />
      </div>
      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? handleOpen : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleOpen()
                }
              }
            : undefined
        }
        className={
          'min-w-0 ' +
          (clickable ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-midnite/30 rounded' : '')
        }
      >
        <div className="text-[14px] font-medium text-ink truncate flex items-center gap-2">
          <span className={clickable ? 'text-midnite' : ''}>{name}</span>
          {lead.email && (
            <span className="text-[11.5px] font-normal text-ink-mute truncate">
              {lead.email}
            </span>
          )}
        </div>
        <div className="text-[11.5px] text-ink-mute mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          {lead.phone && (
            <span className="text-ink-soft tabular-nums">{lead.phone}</span>
          )}
          {lead.persona && <span className="capitalize">{lead.persona}</span>}
          {lead.stage && <span>{String(lead.stage).replace(/_/g, ' ')}</span>}
          <span>{formatWhen(lead.created_at)}</span>
          {noteCount > 0 && (
            <span className="text-midnite font-medium">
              {noteCount} notitie{noteCount === 1 ? '' : 's'}
            </span>
          )}
          {consents > 0 && (
            <span>
              {consents} consent{consents === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <RowStatusDropdown
          status={lead.crm_status}
          onChange={onStatusChange}
        />
        {typeof lead.score === 'number' && <ScoreChip value={lead.score} />}
      </div>
    </li>
  )
}

// Klikbare status-chip per rij — opent een popover met de 6 statussen.
// Stop propagation zodat de modal niet ook nog opent.
function RowStatusDropdown({ status, onChange }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  const key = status && CRM_STATUS_LABEL[status] ? status : 'new'
  const tone = CRM_STATUS_TONE[key] || 'bg-canvas-2 text-ink-soft border-mist'

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function pick(e, s) {
    e.stopPropagation()
    setOpen(false)
    if (s === key) return
    setBusy(true)
    try { await onChange?.(s) } finally { setBusy(false) }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={busy}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Klik om status te wijzigen"
        className={
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider whitespace-nowrap transition disabled:opacity-50 hover:ring-2 hover:ring-midnite/15 ' +
          tone
        }
      >
        {CRM_STATUS_LABEL[key]}
        <Caret />
      </button>
      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 z-20 min-w-[170px] rounded-lg border border-mist bg-paper py-1 text-ink shadow-lg"
        >
          {CRM_STATUS_LIST.map((s) => {
            const active = s === key
            const autoArchive = CRM_STATUS_AUTO_ARCHIVE.has(s)
            return (
              <button
                key={s}
                role="menuitem"
                type="button"
                onClick={(e) => pick(e, s)}
                title={autoArchive ? 'Lead verdwijnt uit hoofdoverzicht (auto-archief)' : undefined}
                className={
                  'flex w-full items-center gap-2 px-3 py-1.5 text-[12.5px] text-left hover:bg-canvas-2 ' +
                  (active ? 'font-semibold text-midnite' : 'text-ink')
                }
              >
                <span
                  className={'inline-block w-2.5 h-2.5 rounded-full border ' + (CRM_STATUS_TONE[s] || '')}
                  aria-hidden
                />
                {CRM_STATUS_LABEL[s]}
                {autoArchive && (
                  <span className="ml-auto text-[10px] text-ink-mute" aria-hidden>→ archief</span>
                )}
                {active && !autoArchive && (
                  <span className="ml-auto text-[11px] text-midnite">huidig</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ScoreChip({ value }) {
  const tone = value >= 70 ? 'rose' : value >= 45 ? 'amber' : 'blue'
  const cls = {
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
  }[tone]
  return (
    <span
      className={
        'rounded-full border px-2 py-0.5 text-[12px] font-semibold tabular-nums ' + cls
      }
    >
      {value}
    </span>
  )
}

// ── Tiny atoms ──────────────────────────────────────────────────────────────

function Checkbox({ checked, indeterminate = false, onChange, ariaLabel }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked
  }, [indeterminate, checked])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={!!checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel}
      className="w-4 h-4 rounded border-mist text-midnite focus:ring-2 focus:ring-midnite/30 cursor-pointer accent-midnite"
    />
  )
}

function Caret() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
      <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Empty({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-mist-light bg-canvas px-4 py-8 text-center text-[13px] text-ink-soft leading-relaxed">
      {children}
    </div>
  )
}

function Code({ children }) {
  return (
    <code className="bg-canvas-2 px-1.5 py-0.5 rounded text-[12px]">{children}</code>
  )
}

function formatWhen(iso) {
  if (!iso) return 'onbekend'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'onbekend'
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 60) return `${s}s geleden`
  if (s < 3600) return `${Math.floor(s / 60)}m geleden`
  if (s < 86400) return `${Math.floor(s / 3600)}u geleden`
  return `${Math.floor(s / 86400)}d geleden`
}
