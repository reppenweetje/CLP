import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDuration, humanizeEventType, humanizePersona } from '../../lib/analytics.js'
import {
  addLeadNote,
  archiveLead,
  CRM_STATUS_LABEL,
  CRM_STATUS_LIST,
  CRM_STATUS_TONE,
  deleteLeadNote,
  restoreLead,
  setLeadStatus,
} from '../../lib/api.js'

// Modal-overlay met curated overzicht per lead. Eén plek voor:
//   - sales-briefing (header, quick actions, hoogtepunten, gedrag)
//   - mini-CRM (status, notities, archief)
//   - call-sheet (gemaakte keuzes in tijdvolgorde, geen ruis-events)
//
// Combineert clp_leads (contact + persona + crm-velden) + clp_events
// (gedragsignalen + chat-trace). Sluiten: Esc, kruis-knop, klik buiten.
//
// CRM-mutaties gaan via clp-leads-update edge function en updaten optimistisch
// de lokale state — onLeadUpdate propagates de patch naar de parent zodat
// RegistrationsList ook bijwerkt.
export default function LeadDetail({ lead, session, onClose, onLeadUpdate }) {
  // Hooks ALTIJD eerst (geen conditionals) — React eis.
  const events = session?.events || []
  const [optimistic, setOptimistic] = useState(lead)
  // Synchroniseer optimistic met externe lead-changes (bv. nieuwe lead geopend).
  useEffect(() => { setOptimistic(lead) }, [lead])

  const signals = useMemo(() => computeSignals(events, optimistic), [events, optimistic])
  const callSheet = useMemo(() => buildCallSheet(events, optimistic), [events, optimistic])
  const answersData = optimistic?.attributes?.answers ?? null

  useEffect(() => {
    if (!lead) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lead, onClose])

  function applyUpdate(updated) {
    if (!updated) return
    setOptimistic(updated)
    onLeadUpdate?.(updated)
  }

  if (!lead || !optimistic) return null

  const name = optimistic.first_name || 'Onbekend'
  const highlights = signals.filter((s) => s.tone === 'hot').slice(0, 4)
  const phoneE164 = toE164(optimistic.phone)
  const phoneDisplay = formatPhone(optimistic.phone)
  const archived = !!optimistic.archived_at

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
            <div className="flex items-center gap-2">
              <h2 className="text-[22px] font-semibold text-ink truncate">{name}</h2>
              {archived && (
                <span className="text-[10px] uppercase tracking-wider rounded-full border border-mist bg-canvas-2 text-ink-mute px-2 py-0.5">
                  Gearchiveerd
                </span>
              )}
            </div>
            {optimistic.email && (
              <a
                href={`mailto:${optimistic.email}`}
                className="text-[13px] text-midnite hover:underline truncate block"
              >
                {optimistic.email}
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SessionStatusBadge status={optimistic.status} />
            {optimistic.temperature && <TempBadge value={optimistic.temperature} />}
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
          {optimistic.email && (
            <a
              href={`mailto:${optimistic.email}`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-mist hover:border-midnite rounded-full text-[13px] text-ink-soft hover:text-ink transition"
            >
              <span aria-hidden>✉️</span> Mail
            </a>
          )}
        </div>

        {/* Mini-CRM strip: status + archive */}
        <CrmStrip
          lead={optimistic}
          onUpdate={applyUpdate}
        />

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
          <Field label="Persona" value={optimistic.persona ? humanizePersona(optimistic.persona) : 'onbekend'} />
          <Field
            label="Stage"
            value={optimistic.stage ? String(optimistic.stage).replace(/_/g, ' ') : 'onbekend'}
          />
          <Field
            label="Score"
            value={typeof optimistic.score === 'number' ? `${optimistic.score}` : 'onbekend'}
            sub={typeof optimistic.score === 'number' ? scoreHint(optimistic.score) : null}
            accent={typeof optimistic.score === 'number' && optimistic.score >= 60}
          />
          <Field label="Geregistreerd" value={formatWhen(optimistic.created_at)} />
        </section>

        {/* Call-sheet: gemaakte keuzes in chrono-volgorde */}
        {callSheet.length > 0 && (
          <CallSheet entries={callSheet} />
        )}

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

        {/* Antwoorden (form-velden uit lead.attributes.answers) */}
        {answersData && Object.keys(answersData).length > 0 && (
          <Answers answers={answersData} />
        )}

        {/* Notities — mini CRM */}
        <NotesSection
          lead={optimistic}
          onUpdate={applyUpdate}
        />

        {/* Volledige event-log — verborgen achter <details> voor power-users */}
        {events.length > 0 && (
          <section className="px-5 py-4 border-b border-mist-light">
            <details>
              <summary className="cursor-pointer text-[11px] tracking-[0.18em] text-ink-mute uppercase font-medium select-none hover:text-ink-soft">
                Volledige event-log ({events.length})
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

        {/* Meta + archive-knop */}
        <section className="px-5 py-4 text-[11.5px] text-ink-mute leading-relaxed space-y-2">
          <div>
            <strong className="text-ink-soft">Aangemaakt:</strong> {formatFull(optimistic.created_at)}
          </div>
          <div>
            <strong className="text-ink-soft">Session-id:</strong>{' '}
            <code className="bg-canvas-2 px-1.5 py-0.5 rounded text-[11px]">
              {optimistic.session_id?.slice(0, 16) || 'onbekend'}
            </code>
          </div>
          <div>
            <strong className="text-ink-soft">Lead-id (clp_leads):</strong>{' '}
            <code className="bg-canvas-2 px-1.5 py-0.5 rounded text-[11px]">
              {optimistic.id ?? 'onbekend'}
            </code>
          </div>
          {!session && (
            <div className="mt-2 text-rose-700">
              Geen event-data voor deze sessie in clp_events. Mogelijk een lead van vóór
              de events-koppeling live ging (backfill).
            </div>
          )}

          <ArchiveControl lead={optimistic} onUpdate={applyUpdate} />
        </section>
      </div>
    </div>
  )
}

// ── Mini-CRM controls ─────────────────────────────────────────────────────────

function CrmStrip({ lead, onUpdate }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const status = lead.crm_status || 'new'

  async function handleStatus(newStatus) {
    if (newStatus === status || busy) return
    setBusy(true); setErr(null)
    // Optimistisch eerst, dan netwerk. Bij fout terugdraaien.
    const previous = lead
    onUpdate({ ...lead, crm_status: newStatus })
    try {
      const updated = await setLeadStatus(lead.id, newStatus)
      onUpdate(updated)
    } catch (e) {
      onUpdate(previous)
      setErr(e?.message || 'Status-update mislukt')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="px-5 py-3 border-b border-mist-light bg-canvas-2/40">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-[10px] tracking-[0.18em] text-ink-mute uppercase font-medium">
          Status
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CRM_STATUS_LIST.map((s) => {
            const active = s === status
            return (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => handleStatus(s)}
                className={
                  'rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition disabled:opacity-50 ' +
                  (active
                    ? CRM_STATUS_TONE[s] + ' shadow-sm'
                    : 'border-mist bg-paper text-ink-soft hover:border-midnite/40 hover:text-ink')
                }
              >
                {CRM_STATUS_LABEL[s]}
              </button>
            )
          })}
        </div>
        {err && (
          <span className="text-[11px] text-rose-700">{err}</span>
        )}
      </div>
    </section>
  )
}

function NotesSection({ lead, onUpdate }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const taRef = useRef(null)
  const notes = Array.isArray(lead.crm_notes) ? lead.crm_notes : []
  const sorted = [...notes].sort((a, b) => {
    const ta = new Date(a?.created_at || 0).getTime()
    const tb = new Date(b?.created_at || 0).getTime()
    return tb - ta
  })

  async function handleAdd(e) {
    e?.preventDefault?.()
    const t = text.trim()
    if (!t || busy) return
    setBusy(true); setErr(null)
    try {
      const updated = await addLeadNote(lead.id, t)
      onUpdate(updated)
      setText('')
      taRef.current?.focus()
    } catch (e) {
      setErr(e?.message || 'Notitie opslaan mislukt')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(noteId) {
    if (busy) return
    if (!window.confirm('Notitie verwijderen?')) return
    setBusy(true); setErr(null)
    const previous = lead
    onUpdate({ ...lead, crm_notes: notes.filter((n) => n?.id !== noteId) })
    try {
      const updated = await deleteLeadNote(lead.id, noteId)
      onUpdate(updated)
    } catch (e) {
      onUpdate(previous)
      setErr(e?.message || 'Notitie verwijderen mislukt')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="px-5 py-4 border-b border-mist-light">
      <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-3">
        Notities ({notes.length})
      </div>

      <form onSubmit={handleAdd} className="mb-3">
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Wat heb je net besproken? Korte aantekening voor jezelf of het team."
          rows={2}
          className="w-full rounded-lg border border-mist bg-paper px-3 py-2 text-[13.5px] text-ink resize-y focus:outline-none focus:border-midnite/60 focus:ring-2 focus:ring-midnite/10"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="rounded-full bg-midnite text-paper px-4 py-1.5 text-[12.5px] font-medium hover:bg-midnite-soft disabled:opacity-50 transition"
          >
            {busy ? 'Opslaan…' : 'Notitie toevoegen'}
          </button>
          {err && <span className="text-[11px] text-rose-700">{err}</span>}
        </div>
      </form>

      {sorted.length === 0 ? (
        <div className="text-[12.5px] text-ink-mute italic">Nog geen notities.</div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((n) => (
            <li
              key={n.id}
              className="group rounded-lg border border-mist-light bg-canvas px-3 py-2"
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-[11px] text-ink-mute tabular-nums">
                  {formatFull(n.created_at)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(n.id)}
                  className="opacity-0 group-hover:opacity-100 text-[11px] text-rose-700 hover:text-rose-900 transition"
                  aria-label="Notitie verwijderen"
                >
                  Verwijder
                </button>
              </div>
              <div className="text-[13.5px] text-ink whitespace-pre-wrap leading-snug">
                {n.text}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ArchiveControl({ lead, onUpdate }) {
  const [busy, setBusy] = useState(false)
  const archived = !!lead.archived_at

  async function handle() {
    if (busy) return
    if (!archived) {
      if (!window.confirm('Deze registratie naar archief verplaatsen? Hij verdwijnt uit het hoofdoverzicht maar blijft in de database staan.')) return
    }
    setBusy(true)
    try {
      const updated = archived ? await restoreLead(lead.id) : await archiveLead(lead.id)
      onUpdate(updated)
    } catch (e) {
      window.alert((archived ? 'Herstellen' : 'Archiveren') + ' mislukt: ' + (e?.message || 'onbekend'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-mist-light/60">
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        className={
          'text-[12px] font-medium rounded-full border px-3 py-1.5 transition disabled:opacity-50 ' +
          (archived
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            : 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100')
        }
      >
        {busy
          ? 'Bezig…'
          : archived
            ? 'Terughalen uit archief'
            : 'Naar archief'}
      </button>
    </div>
  )
}

// ── Call sheet — alleen door bezoeker gemaakte keuzes ────────────────────────

function CallSheet({ entries }) {
  return (
    <section className="px-5 py-4 border-b border-mist-light">
      <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-3">
        Call sheet — gemaakte keuzes
      </div>
      <ol className="space-y-1.5">
        {entries.map((e, i) => (
          <li
            key={i}
            className="flex items-baseline gap-3 text-[13px] leading-snug"
          >
            <span className="text-ink-mute tabular-nums shrink-0 w-14">
              {formatHHMM(e.timestamp)}
            </span>
            <span className={'shrink-0 w-5 text-center ' + (e.tone === 'hot' ? 'text-emerald-700' : e.tone === 'cold' ? 'text-rose-700' : e.tone === 'done' ? 'text-emerald-700' : 'text-ink-mute')}>
              {e.icon}
            </span>
            <span className={'flex-1 ' + (e.tone === 'hot' ? 'text-ink font-medium' : e.tone === 'cold' ? 'text-rose-800' : e.tone === 'done' ? 'text-emerald-800 font-medium' : 'text-ink')}>
              {e.text}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// Welke event-types verschijnen op het call sheet, en hoe ze worden
// gepresenteerd. Bewust beperkt tot daadwerkelijk door de gebruiker gemaakte
// keuzes en aankoop-signalen — geen UI-renders of timer-events.
function buildCallSheet(events, lead) {
  if (!Array.isArray(events) || events.length === 0) return []
  const out = []
  // Voor unit:detail-opened verzamelen we per-unit aantal en tonen we
  // dat als één gecondenseerde entry.
  let unitDetailCount = 0
  let firstUnitDetailTs = null
  let rentCalcCount = 0
  let firstRentCalcTs = null
  let mortgageCalcCount = 0
  let firstMortgageCalcTs = null

  for (const ev of events) {
    const entry = callSheetEntry(ev, lead)
    if (entry === 'unit') {
      unitDetailCount += 1
      if (!firstUnitDetailTs) firstUnitDetailTs = ev.timestamp
      continue
    }
    if (entry === 'rent') {
      rentCalcCount += 1
      if (!firstRentCalcTs) firstRentCalcTs = ev.timestamp
      continue
    }
    if (entry === 'mortgage') {
      mortgageCalcCount += 1
      if (!firstMortgageCalcTs) firstMortgageCalcTs = ev.timestamp
      continue
    }
    if (entry) out.push({ ...entry, timestamp: ev.timestamp })
  }

  // Voeg gecondenseerde entries toe op de chronologisch juiste plek.
  if (unitDetailCount > 0) {
    insertChrono(out, {
      icon: '🏠',
      text: `Bekeek unit-details (${unitDetailCount}×)`,
      tone: 'hot',
      timestamp: firstUnitDetailTs,
    })
  }
  if (rentCalcCount > 0) {
    insertChrono(out, {
      icon: '🧮',
      text: `Speelde met rendement-calc (${rentCalcCount}×)`,
      tone: 'hot',
      timestamp: firstRentCalcTs,
    })
  }
  if (mortgageCalcCount > 0) {
    insertChrono(out, {
      icon: '🧮',
      text: `Speelde met maandlast-calc (${mortgageCalcCount}×)`,
      tone: 'hot',
      timestamp: firstMortgageCalcTs,
    })
  }

  return out
}

function insertChrono(list, item) {
  const idx = list.findIndex((x) => x.timestamp > item.timestamp)
  if (idx === -1) list.push(item)
  else list.splice(idx, 0, item)
}

// Return 'unit' / 'rent' / 'mortgage' voor te condenseren typen,
// een entry-object voor één-malige items, of null om de event te skippen.
function callSheetEntry(ev, lead) {
  const t = ev.type
  const p = ev.payload || {}
  switch (t) {
    case 'session:start':
      return { icon: '◉', text: 'Sessie gestart' }
    case 'intro:cta-clicked':
      return { icon: '↗', text: 'Klikte op CTA' + (p.variant ? ` (variant ${p.variant})` : '') }
    case 'intent:answered':
      return {
        icon: '🎯',
        text: 'Persona: ' + humanizePersona(p.persona || lead?.persona || 'onbekend'),
      }
    case 'focus:answered':
      return { icon: '🔍', text: 'Focus: ' + (p.label || p.id || 'onbekend') }
    case 'brochure-trigger:answered': {
      const ja = p.id === 'ja'
      return {
        icon: '📄',
        text: ja ? 'Wilde de brochure ontvangen' : 'Wilde GEEN brochure',
        tone: ja ? 'hot' : 'cold',
      }
    }
    case 'lead-name:submitted':
      return {
        icon: '✍',
        text: 'Vulde naam in' + (lead?.first_name ? `: ${lead.first_name}` : ''),
      }
    case 'lead-email:submitted':
      return {
        icon: '✉',
        text: 'Vulde e-mail in' + (lead?.email ? `: ${lead.email}` : ''),
        tone: 'hot',
      }
    case 'lead-phone-ask:answered': {
      const yes = p.id === 'yes' || p.id === 'ja'
      return {
        icon: '💬',
        text: yes ? 'Stemde in met WhatsApp-contact' : 'Wees WhatsApp af',
        tone: yes ? 'hot' : null,
      }
    }
    case 'lead-phone:submitted':
      return {
        icon: '📞',
        text: 'Vulde telefoonnummer in' + (lead?.phone ? `: ${formatPhone(lead.phone)}` : ''),
        tone: 'hot',
      }
    case 'size:answered':
      return { icon: '📏', text: 'Grootte: ' + (p.label || p.id || 'onbekend') }
    case 'timeline:answered':
      return { icon: '⏱', text: 'Termijn: ' + (p.label || p.id || 'onbekend') }
    case 'more-info:viewed':
      return { icon: 'ℹ', text: 'Vroeg extra info' }
    case 'more-info:continue':
      return { icon: '↪', text: 'Sloeg extra info over' }
    case 'followup:answered':
      return {
        icon: '➜',
        text: 'Vervolg: ' + (p.label || p.id || 'onbekend'),
        tone: ['wa_nu', 'bel', 'plan'].includes(p.id) ? 'hot' : null,
      }
    case 'direct-contact:requested':
      return { icon: '☎', text: 'Vroeg om direct contact', tone: 'hot' }
    case 'warm-handoff:shown':
      return null  // skip — alleen uitkomst is interessant
    case 'warm-handoff:callback':
      return { icon: '↩', text: 'Vroeg om terugbel', tone: 'hot' }
    case 'warm-handoff:whatsapp':
      return { icon: '💬', text: 'Koos WhatsApp via handoff', tone: 'hot' }
    case 'warm-handoff:phone':
      return { icon: '📞', text: 'Koos bellen via handoff', tone: 'hot' }
    case 'warm-handoff:dismissed':
      return { icon: '⊘', text: 'Sloeg handoff af', tone: 'cold' }
    case 'cta:brochure-clicked':
      return { icon: '📥', text: 'Opende brochure-PDF' }
    case 'cta:whatsapp-clicked':
      return { icon: '💬', text: 'Klikte WhatsApp-knop', tone: 'hot' }
    case 'cta:phone-clicked':
      return { icon: '📞', text: 'Klikte tel-link', tone: 'hot' }
    case 'unit:detail-opened':
      return 'unit'
    case 'calc:rentability-interaction':
      return 'rent'
    case 'calc:mortgage-interaction':
      return 'mortgage'
    case 'afhaak-reason:answered':
      return {
        icon: '⊥',
        text: 'Afhaakreden: ' + (p.label || p.id || 'onbekend'),
        tone: 'cold',
      }
    case 'flow:complete':
      return {
        icon: '✓',
        text: 'Voltooid' + (p.stage ? ` (${String(p.stage).replace(/_/g, ' ')})` : ''),
        tone: 'done',
      }
    default:
      return null
  }
}

// ── Sub-componenten (header/profile/answers) ──────────────────────────────────

function Field({ label, value, accent, sub }) {
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
      {sub && (
        <div className="text-[10.5px] text-ink-mute mt-0.5 truncate">{sub}</div>
      )}
    </div>
  )
}

function SessionStatusBadge({ status }) {
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
  const SKIP_KEYS = new Set(['lead'])
  const entries = Object.entries(answers).filter(
    ([k, v]) => v != null && !SKIP_KEYS.has(k),
  )
  if (entries.length === 0) return null
  return (
    <section className="px-5 py-4 border-b border-mist-light">
      <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-3">
        Antwoorden (samengevat)
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
  if (lead?.phone) {
    out.push({ label: 'Telefoonnummer gedeeld', value: 'ja', tone: 'hot' })
  }
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
  const afhaak = events.find((e) => e.type === 'afhaak-reason:answered')
  if (afhaak) {
    const reason = afhaak.payload?.label || afhaak.payload?.id || 'onbekend'
    out.push({ label: 'Afhaakreden', value: reason, tone: 'cold' })
  }
  return out
}

// Geef een kort hintje terug bij de score: laat de bel-beller in 1 oogopslag
// zien op welk niveau deze lead zit. Drempels in lijn met deriveStage in
// src/lib/scoring.js (sales_ready ≥ 60, koopintentie ≥ 45, etc.).
function scoreHint(score) {
  if (score >= 80) return 'sales-ready'
  if (score >= 60) return 'koopintentie'
  if (score >= 40) return 'warm'
  if (score >= 20) return 'oriënterend'
  return 'koud'
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
