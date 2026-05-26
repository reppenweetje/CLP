import { useEffect, useMemo } from 'react'
import { formatDuration, humanizeEventType, humanizePersona } from '../../lib/analytics.js'

// Modal-overlay met curated overzicht per lead — bedoeld om sales in 30s
// te briefen voor 'n outbound bel. Opent vanuit Registraties zodra je op
// een naam klikt. Combineert clp_leads (contact + persona) + clp_events
// (gedragsignalen + chat-trace) voor de volledige context.
//
// Sluiten: Esc, kruis-knop, of klik buiten het panel.
export default function LeadDetail({ lead, session, onClose }) {
  // Hooks ALTIJD eerst (geen conditionals) — React eis.
  const events = session?.events || []
  const signals = useMemo(() => computeSignals(events, lead), [events, lead])
  const answersData = lead?.attributes?.answers ?? null

  useEffect(() => {
    if (!lead) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lead, onClose])

  if (!lead) return null

  const name = lead.first_name || 'Onbekend'
  const highlights = signals.filter((s) => s.tone === 'hot').slice(0, 4)
  const phoneE164 = toE164(lead.phone)
  const phoneDisplay = formatPhone(lead.phone)

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Lead-detail van ${name}`}
      className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-paper rounded-2xl max-w-2xl w-full my-4 sm:my-8 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[22px] font-semibold text-ink truncate">{name}</h2>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="text-[13px] text-midnite hover:underline truncate block"
              >
                {lead.email}
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={lead.status} />
            {lead.temperature && <TempBadge value={lead.temperature} />}
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              className="w-8 h-8 rounded-full hover:bg-canvas-2 flex items-center justify-center text-ink-mute hover:text-ink text-[16px]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-5 pb-4 flex flex-wrap gap-2 border-b border-mist-light">
          {phoneE164 ? (
            <a
              href={`tel:${phoneE164}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-midnite text-paper rounded-full text-[13px] font-medium hover:bg-midnite-soft transition"
            >
              <span aria-hidden>📞</span> Bel {phoneDisplay}
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] text-ink-mute border border-dashed border-mist">
              Geen 06 doorgegeven
            </span>
          )}
          {phoneE164 && (
            <a
              href={`https://wa.me/${phoneE164.replace(/^\+/, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-mist hover:border-midnite rounded-full text-[13px] text-ink-soft hover:text-ink transition"
            >
              <span aria-hidden>💬</span> WhatsApp
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-mist hover:border-midnite rounded-full text-[13px] text-ink-soft hover:text-ink transition"
            >
              <span aria-hidden>✉️</span> Mail
            </a>
          )}
        </div>

        {/* Hoogtepunten (alleen als er hot-signalen zijn) */}
        {highlights.length > 0 && (
          <div className="mx-5 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="text-[11px] tracking-[0.18em] text-amber-800 uppercase font-medium mb-2">
              Hoogtepunten voor het gesprek
            </div>
            <ul className="space-y-1">
              {highlights.map((s, i) => (
                <li key={i} className="text-[13.5px] text-ink leading-snug">
                  <span className="font-semibold">{s.label}:</span> {s.value}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Profiel */}
        <section className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-mist-light mt-2">
          <Field label="Persona" value={lead.persona ? humanizePersona(lead.persona) : 'onbekend'} />
          <Field
            label="Stage"
            value={lead.stage ? String(lead.stage).replace(/_/g, ' ') : 'onbekend'}
          />
          <Field
            label="Score"
            value={typeof lead.score === 'number' ? `${lead.score}/100` : 'onbekend'}
            accent={typeof lead.score === 'number' && lead.score >= 60}
          />
          <Field label="Geregistreerd" value={formatWhen(lead.created_at)} />
        </section>

        {/* Gedragsignalen */}
        {signals.length > 0 && (
          <section className="px-5 py-4 border-b border-mist-light">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-3">
              Gedragsignalen
            </div>
            <ul className="space-y-1.5">
              {signals.map((s, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between gap-3 text-[13.5px]"
                >
                  <span className="text-ink-soft">{s.label}</span>
                  <span className={'font-medium tabular-nums ' + toneClass(s.tone)}>
                    {s.value}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Antwoorden */}
        {answersData && Object.keys(answersData).length > 0 && (
          <Answers answers={answersData} />
        )}

        {/* Tijdlijn */}
        {events.length > 0 && (
          <section className="px-5 py-4 border-b border-mist-light">
            <details>
              <summary className="cursor-pointer text-[11px] tracking-[0.18em] text-midnite uppercase font-medium select-none hover:text-midnite-soft">
                Volledige tijdlijn ({events.length} events)
              </summary>
              <ol className="mt-3 space-y-1.5">
                {events.map((e, i) => (
                  <li key={i} className="flex items-baseline gap-3 text-[12.5px]">
                    <span className="text-ink-mute tabular-nums shrink-0 w-14">
                      {formatHHMM(e.timestamp)}
                    </span>
                    <span className="text-ink-soft">{humanizeEventType(e.type)}</span>
                  </li>
                ))}
              </ol>
            </details>
          </section>
        )}

        {/* Meta */}
        <section className="px-5 py-4 text-[11.5px] text-ink-mute leading-relaxed space-y-1">
          <div>
            <strong className="text-ink-soft">Aangemaakt:</strong> {formatFull(lead.created_at)}
          </div>
          <div>
            <strong className="text-ink-soft">Session-id:</strong>{' '}
            <code className="bg-canvas-2 px-1.5 py-0.5 rounded text-[11px]">
              {lead.session_id?.slice(0, 16) || 'onbekend'}
            </code>
          </div>
          <div>
            <strong className="text-ink-soft">Lead-id (clp_leads):</strong>{' '}
            <code className="bg-canvas-2 px-1.5 py-0.5 rounded text-[11px]">
              {lead.id ?? 'onbekend'}
            </code>
          </div>
          {!session && (
            <div className="mt-2 text-rose-700">
              Geen event-data voor deze sessie in clp_events. Mogelijk een lead van vóór
              de events-koppeling live ging (backfill).
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Sub-componenten ─────────────────────────────────────────────────────────

function Field({ label, value, accent }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] tracking-[0.16em] text-ink-mute uppercase">{label}</div>
      <div
        className={
          'text-[14px] font-semibold mt-0.5 truncate ' +
          (accent ? 'text-emerald-700' : 'text-ink')
        }
      >
        {value}
      </div>
    </div>
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

function TempBadge({ value }) {
  const v = String(value).toLowerCase()
  const cls =
    v === 'hot'
      ? 'bg-rose-50 text-rose-800 border-rose-200'
      : v === 'warm'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-blue-50 text-blue-800 border-blue-200'
  return (
    <span
      className={
        'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider whitespace-nowrap ' +
        cls
      }
    >
      {v}
    </span>
  )
}

function Answers({ answers }) {
  // Filter PII-keys + lege values. answers.lead bevat een dubbele kopie van
  // contact-velden (firstName/email/phone) die al in de header staan.
  const SKIP_KEYS = new Set(['lead'])
  const entries = Object.entries(answers).filter(
    ([k, v]) => v != null && !SKIP_KEYS.has(k),
  )
  if (entries.length === 0) return null
  return (
    <section className="px-5 py-4 border-b border-mist-light">
      <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-3">
        Antwoorden
      </div>
      <dl className="space-y-1.5">
        {entries.map(([key, val]) => (
          <div
            key={key}
            className="flex items-baseline justify-between gap-3 text-[13.5px]"
          >
            <dt className="text-ink-soft capitalize">{humanizeAnswerKey(key)}</dt>
            <dd className="text-ink font-medium text-right max-w-[65%]">
              {formatAnswerValue(val)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeSignals(events, lead) {
  const out = []
  if (!Array.isArray(events) || events.length === 0) return out
  const types = new Set(events.map((e) => e.type))

  // High-value engagement
  const unitDetailCount = events.filter((e) => e.type === 'unit:detail-opened').length
  if (unitDetailCount > 0) {
    out.push({
      label: 'Unit-details bekeken',
      value: String(unitDetailCount),
      tone: 'hot',
    })
  }
  if (types.has('calc:rentability-interaction')) {
    out.push({ label: 'Rendement-calculator gebruikt', value: 'ja', tone: 'hot' })
  }
  if (types.has('calc:mortgage-interaction')) {
    out.push({ label: 'Maandlast-calculator gebruikt', value: 'ja', tone: 'hot' })
  }

  // Conversion intent
  if (types.has('cta:brochure-clicked')) {
    out.push({ label: 'Brochure geopend', value: 'ja', tone: 'warm' })
  }
  if (types.has('cta:whatsapp-clicked')) {
    out.push({ label: 'WhatsApp-knop gebruikt', value: 'ja', tone: 'hot' })
  }
  if (types.has('cta:phone-clicked')) {
    out.push({ label: 'Bel-knop gebruikt', value: 'ja', tone: 'hot' })
  }
  if (types.has('direct-contact:requested')) {
    out.push({ label: 'Direct contact gevraagd', value: 'ja', tone: 'hot' })
  }

  // Warm handoff
  if (types.has('warm-handoff:shown')) {
    const acceptedTypes = [
      'warm-handoff:callback',
      'warm-handoff:whatsapp',
      'warm-handoff:phone',
    ]
    const accepted = acceptedTypes.some((t) => types.has(t))
    out.push({
      label: 'Warm-handoff',
      value: accepted ? 'aanvaard' : 'getoond, niet aanvaard',
      tone: accepted ? 'hot' : 'cold',
    })
  }

  // Contact-volledigheid
  if (lead?.phone) {
    out.push({ label: 'Telefoonnummer gedeeld', value: 'ja', tone: 'hot' })
  }

  // Voltooiing + duur
  const completed = types.has('flow:complete')
  out.push({
    label: 'Flow afgerond',
    value: completed ? 'ja' : 'nee',
    tone: completed ? 'hot' : 'cold',
  })
  if (events.length >= 2) {
    const duration = events[events.length - 1].timestamp - events[0].timestamp
    out.push({ label: 'Sessieduur', value: formatDuration(duration), tone: 'neutral' })
  }

  // Afhaak-reden
  const afhaak = events.find((e) => e.type === 'afhaak-reason:answered')
  if (afhaak) {
    const reason = afhaak.payload?.label || afhaak.payload?.id || 'onbekend'
    out.push({ label: 'Afhaakreden', value: reason, tone: 'cold' })
  }

  return out
}

function toneClass(tone) {
  if (tone === 'hot') return 'text-emerald-700'
  if (tone === 'warm') return 'text-amber-700'
  if (tone === 'cold') return 'text-rose-700'
  return 'text-ink'
}

function humanizeAnswerKey(key) {
  const map = {
    intent: 'Doel',
    focus: 'Focus',
    timeline: 'Termijn',
    size: 'Grootte',
    moreInfo: 'Extra info',
    followup: 'Vervolg',
    afhaakReason: 'Afhaakreden',
    persona: 'Persona',
    project: 'Project',
    cta_variant: 'CTA-variant',
    handoff_persona: 'Handoff persona',
    handoff_temperature: 'Handoff temperatuur',
    flags: 'Flags',
    buyingSignals: 'Buy-signalen',
    rentRange: 'Huur-range',
  }
  return map[key] || key.replace(/_/g, ' ')
}

function formatAnswerValue(val) {
  if (val == null) return 'onbekend'
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val)
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return 'geen'
    return val.map(formatAnswerValue).join(', ')
  }
  if (typeof val === 'object') {
    return val.label || val.value || val.id || JSON.stringify(val).slice(0, 80)
  }
  return String(val)
}

function toE164(phone) {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '')
  if (!cleaned) return ''
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('00')) return '+' + cleaned.slice(2)
  if (cleaned.startsWith('0')) return '+31' + cleaned.slice(1)
  return '+' + cleaned
}

function formatPhone(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('06')) {
    return `06 ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
  }
  if (digits.length === 11 && digits.startsWith('316')) {
    return `+31 6 ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`
  }
  return phone
}

function formatHHMM(ts) {
  if (!ts) return 'onbekend'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return 'onbekend'
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
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

function formatFull(iso) {
  if (!iso) return 'onbekend'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'onbekend'
  return d.toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
