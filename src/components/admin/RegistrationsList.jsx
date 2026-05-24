import { useMemo } from 'react'

// Toont de daadwerkelijk gecapteerde registraties uit de clp_leads-tabel:
// bezoekers die hun contactgegevens hebben achtergelaten. Los van "Hete
// leads" — dat is gedrags-scoring over alle sessies; dit zijn de echte
// inschrijvingen met e-mail of telefoon.
//
// Data komt via de clp-leads-fetch Edge Function (api.js::fetchTeamLeads).
// clp_leads is RLS-locked want het bevat PII; alleen team-modus toont dit.
// Voor De Hofman zijn dit de dual-write kopieën van leads die canoniek in
// reppbot.leads staan (pushAnalyticsCopy in api.js).
export default function RegistrationsList({
  leads = [],
  loading = false,
  error = null,
  teamMode = false,
  configured = false,
}) {
  const sorted = useMemo(() => {
    return [...(leads || [])].sort(
      (a, b) =>
        new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime(),
    )
  }, [leads])
  const withPhone = useMemo(() => sorted.filter((l) => l && l.phone).length, [sorted])

  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <header className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">
            Inschrijvingen
          </div>
          <h2 className="text-[15px] font-semibold text-ink">Registraties</h2>
          <p className="text-[13px] text-ink-soft leading-relaxed mt-1">
            Bezoekers die hun contactgegevens achterlieten. Rechtstreeks uit de
            beveiligde clp_leads-tabel.
          </p>
        </div>
        {sorted.length > 0 && (
          <div className="text-[12px] text-ink-mute whitespace-nowrap">
            {sorted.length} totaal, {withPhone} met 06
          </div>
        )}
      </header>
      <Body
        sorted={sorted}
        loading={loading}
        error={error}
        teamMode={teamMode}
        configured={configured}
      />
    </section>
  )
}

function Body({ sorted, loading, error, teamMode, configured }) {
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
        Nog geen registraties. Zodra een bezoeker de chat afrondt met een
        e-mailadres verschijnt die hier.
      </Empty>
    )
  }
  return (
    <ul className="divide-y divide-mist-light">
      {sorted.map((lead) => (
        <LeadRow key={lead.id ?? lead.session_id} lead={lead} />
      ))}
    </ul>
  )
}

function LeadRow({ lead }) {
  const name = lead.first_name || 'Onbekend'
  const consents = Array.isArray(lead.consent_log) ? lead.consent_log.length : 0
  return (
    <li className="grid grid-cols-[1fr_auto] items-start gap-3 px-1 py-2.5">
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-ink truncate flex items-center gap-2">
          {name}
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
          {consents > 0 && (
            <span>
              {consents} consent{consents === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <StatusBadge status={lead.status} />
        {typeof lead.score === 'number' && <ScoreChip value={lead.score} />}
      </div>
    </li>
  )
}

function StatusBadge({ status }) {
  const done = status === 'completed'
  const cls = done
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : 'bg-canvas-2 text-ink-soft border-mist'
  return (
    <span
      className={
        'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider whitespace-nowrap ' +
        cls
      }
    >
      {done ? 'Voltooid' : 'Bezig'}
    </span>
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
