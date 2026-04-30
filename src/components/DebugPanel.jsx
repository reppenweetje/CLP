import {
  STAGE_LABEL,
  TEMPERATURE_LABEL,
} from '../lib/scoring.js'
import { recommendSalesAction, recommendContentCards, recommendUnit } from '../lib/recommendation.js'
import { project } from '../data/project.js'

// internal demo panel toont wat sales zou krijgen voor deze lead
// toggelbaar via demo knop in header of debug=1 in url
export default function DebugPanel({ open, state, score, persona, stage, temperature, onClose, onReset }) {
  if (!open) return null
  const { answers } = state
  const cards = recommendContentCards(answers, persona, project)
  const unit = recommendUnit(answers, project)
  const action = recommendSalesAction(stage)

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center pointer-events-none">
      <div className="pointer-events-auto absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="pointer-events-auto relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-paper border border-mist-light p-5 m-0 sm:m-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium">demo interne view</div>
            <div className="text-[18px] font-semibold text-ink mt-0.5">wat ziet sales</div>
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-ink p-2 -mr-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <Stat label="aankoopfase" value={STAGE_LABEL[stage] || 'nog niet'} />
          <Stat label="temperatuur" value={TEMPERATURE_LABEL[temperature]} highlight={temperatureBg(temperature)} />
          <Stat label="score" value={String(score)} />
          <Stat label="persona" value={personaLabel(persona)} />
        </div>

        <Section title="antwoorden">
          <Row k="intentie" v={answers.intent?.label || 'nog niet'} />
          <Row k="focus" v={answers.focus?.label || 'nog niet'} />
          <Row k="lead" v={leadLabel(answers.lead)} />
          <Row k="termijn" v={answers.timeline?.label || 'nog niet'} />
          <Row k="grootte" v={answers.size?.label || 'nog niet'} />
          <Row k="vervolg" v={answers.followup?.label || 'nog niet'} />
        </Section>

        <Section title="aanbevolen content">
          <div className="flex flex-wrap gap-1.5">
            {cards.length === 0 ? (
              <span className="text-[12px] text-ink-mute">nog niet beschikbaar</span>
            ) : (
              cards.map((c) => (
                <span key={c.id} className="text-[11px] px-2 py-1 rounded-full bg-canvas-2 text-ink-soft">
                  {c.title}
                </span>
              ))
            )}
          </div>
        </Section>

        <Section title="aanbevolen unit">
          <Row k="primair" v={`unit ${unit.primary?.type?.toLowerCase() || 'nog niet'}  ${unit.primary?.stateLabel || ''}`} />
          {unit.fallback && <Row k="alternatief" v={`unit ${unit.fallback.type?.toLowerCase()}`} />}
          {unit.note && <div className="text-[12px] text-ink-soft leading-relaxed mt-2">{unit.note}</div>}
        </Section>

        <Section title="aanbevolen salesactie">
          <div className="text-[13px] text-ink leading-relaxed">{action}</div>
        </Section>

        <Section title="risico afhaken">
          <div className="text-[12px] text-ink-soft leading-relaxed">{riskCopy(state, answers)}</div>
        </Section>

        <button
          onClick={onReset}
          className="mt-4 w-full text-[12px] text-rose-700 border border-rose-300 bg-rose-50 hover:bg-rose-100 rounded-full py-2.5"
        >
          reset demo
        </button>
      </div>
    </div>
  )
}

function temperatureBg(t) {
  switch (t) {
    case 'cold': return 'bg-sky-50 border-sky-200 text-sky-900'
    case 'lukewarm': return 'bg-amber-50 border-amber-200 text-amber-900'
    case 'warm': return 'bg-orange-50 border-orange-200 text-orange-900'
    case 'hot': return 'bg-rose-50 border-rose-200 text-rose-900'
    case 'sales-ready': return 'bg-emerald-50 border-emerald-200 text-emerald-900'
    default: return ''
  }
}

function Stat({ label, value, highlight }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 ${highlight || 'border-mist-light bg-canvas-2'}`}>
      <div className="text-[10px] tracking-[0.16em] uppercase opacity-70">{label}</div>
      <div className="text-[14px] font-semibold mt-0.5">{value}</div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="border-t border-mist-light pt-3 mt-3">
      <div className="text-[10px] tracking-[0.18em] text-ink-mute uppercase mb-2 font-medium">{title}</div>
      {children}
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-[13px]">
      <span className="text-ink-mute shrink-0">{k}</span>
      <span className="text-ink text-right truncate">{v}</span>
    </div>
  )
}

function personaLabel(p) {
  if (p === 'eigen_gebruiker') return 'eigen gebruiker'
  if (p === 'belegger') return 'belegger'
  return 'onbekend'
}

function leadLabel(lead) {
  if (!lead) return 'nog niet'
  const parts = []
  if (lead.firstName) parts.push(lead.firstName)
  if (lead.email) parts.push(lead.email)
  if (lead.phone) parts.push(lead.phone)
  return parts.join('  ')
}

function riskCopy(state, answers) {
  if (!answers.lead) return 'hoog gegevens nog niet ingevuld'
  if (!answers.lead.phone) return 'middel geen 06 ingevuld opvolging via mail'
  if (state.currentQuestion === null && answers.followup) return 'laag flow afgemaakt gegevens compleet'
  return 'laag gegevens compleet flow loopt door'
}
