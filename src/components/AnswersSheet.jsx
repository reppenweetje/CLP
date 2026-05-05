import { useEffect } from 'react'

// Bottom-sheet met alle gegeven antwoorden. Bezoeker kan een antwoord
// "wijzigen": de flow rolt terug naar dat punt, alle downstream-antwoorden
// worden gewist, lead-data blijft bewaard.
//
// Lead-data tonen we per veld (naam / e-mail / 06) zodat de bezoeker
// alleen het veld kan aanpassen dat hij wil veranderen, of in één keer
// alles vergeten.
export default function AnswersSheet({ open, answers, onClose, onEdit, onEditLeadField, onForgetLead, onReset }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const rows = buildRows(answers)
  const lead = answers.lead

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center pointer-events-none">
      <div
        className="pointer-events-auto absolute inset-0 bg-ink/30 backdrop-blur-sm fade-up"
        onClick={onClose}
      />
      <div className="pointer-events-auto relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-paper border border-mist-light p-5 m-0 sm:m-4 shadow-2xl fade-up">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[18px] font-semibold text-ink">Jouw antwoorden</h2>
          <button onClick={onClose} className="text-ink-soft hover:text-ink p-2 -mr-2" aria-label="sluit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p className="text-[12px] text-ink-soft mb-4">
          Tik op "Wijzig" om een antwoord aan te passen. We gaan dan vanaf dat punt verder.
        </p>

        {(lead?.email || lead?.firstName || lead?.phone) && (
          <div className="rounded-2xl bg-canvas-2 border border-mist-light p-3.5 mb-3">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium">
                Jouw gegevens
              </div>
              <button
                onClick={onForgetLead}
                className="text-[11px] text-rose-700 hover:text-rose-900"
              >
                Alles vergeten
              </button>
            </div>
            <div className="rounded-xl bg-paper border border-mist-light overflow-hidden">
              {lead.firstName && (
                <LeadRow
                  label="Naam"
                  value={lead.firstName}
                  onEdit={() => {
                    onEditLeadField('name')
                    onClose()
                  }}
                />
              )}
              {lead.email && (
                <LeadRow
                  label="E-mail"
                  value={lead.email}
                  onEdit={() => {
                    onEditLeadField('email')
                    onClose()
                  }}
                />
              )}
              {lead.phone && (
                <LeadRow
                  label="06"
                  value={lead.phone}
                  onEdit={() => {
                    onEditLeadField('phone')
                    onClose()
                  }}
                />
              )}
              {!lead.phone && (
                <LeadRow
                  label="06"
                  value="Niet gedeeld"
                  muted
                  onEdit={() => {
                    onEditLeadField('phone')
                    onClose()
                  }}
                  editLabel="Toevoegen"
                />
              )}
            </div>
            <p className="text-[11px] text-ink-mute leading-snug mt-2">
              We vragen deze niet opnieuw, tenzij je ze aanpast of vergeet.
            </p>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-mist-light bg-canvas-2 p-4 text-[13px] text-ink-soft text-center">
            Nog geen antwoorden om aan te passen.
          </div>
        ) : (
          <div className="rounded-2xl border border-mist-light overflow-hidden">
            {rows.map((row, i) => (
              <div
                key={row.key}
                className={`flex items-center gap-3 px-3.5 py-3 ${i > 0 ? 'border-t border-mist-light' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] tracking-[0.18em] text-ink-mute uppercase mb-0.5">
                    {row.label}
                  </div>
                  <div className="text-[13px] text-ink truncate">{row.value}</div>
                </div>
                <button
                  onClick={() => {
                    onEdit(row.key)
                    onClose()
                  }}
                  className="text-[12px] text-midnite hover:text-midnite-soft border border-mist hover:border-midnite px-3 py-1.5 rounded-full transition shrink-0"
                >
                  Wijzig
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full text-[13px] text-ink-soft hover:text-ink border border-mist hover:border-midnite py-2.5 rounded-full transition"
        >
          Terug
        </button>

        {onReset && (
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && !window.confirm('Wil je opnieuw beginnen? Je antwoorden en gegevens worden gewist.')) {
                return
              }
              onReset()
              onClose()
            }}
            className="mt-2 w-full text-[12px] text-ink-mute hover:text-rose-700 py-2 text-center transition"
          >
            Opnieuw beginnen
          </button>
        )}

        <div className="mt-4 pt-3 border-t border-mist-light text-[11px] text-ink-mute leading-relaxed text-center">
          We bewaren deze antwoorden lokaal in jouw browser.{' '}
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-soft hover:text-midnite underline underline-offset-2 decoration-mist hover:decoration-midnite"
          >
            Lees ons privacystatement
          </a>
          .
        </div>
      </div>
    </div>
  )
}

function LeadRow({ label, value, onEdit, muted, editLabel = 'Aanpassen' }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-mist-light last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] tracking-[0.16em] text-ink-mute uppercase">{label}</div>
        <div className={`text-[13px] truncate ${muted ? 'text-ink-mute italic' : 'text-ink'}`}>
          {value}
        </div>
      </div>
      <button
        onClick={onEdit}
        className="text-[11px] text-midnite hover:text-midnite-soft border border-mist hover:border-midnite px-2.5 py-1 rounded-full transition shrink-0"
      >
        {editLabel}
      </button>
    </div>
  )
}

const ROW_DEFS = [
  { key: 'intent', label: 'Voor wie' },
  { key: 'availabilityCheck', label: 'Beschikbaarheid bekeken' },
  { key: 'brochureTrigger', label: 'Brochure' },
  { key: 'afhaakReason', label: 'Afhaak-reden' },
  { key: 'rentRange', label: 'Huurprijs-range' },
  { key: 'size', label: 'Grootte begane grond' },
  { key: 'timeline', label: 'Termijn' },
  { key: 'followup', label: 'Vervolg' },
]

function buildRows(answers) {
  return ROW_DEFS
    .filter((d) => answers[d.key]?.label)
    .map((d) => ({ key: d.key, label: d.label, value: answers[d.key].label }))
}
