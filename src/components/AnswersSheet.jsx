import { useEffect } from 'react'

// Bottom-sheet met alle gegeven antwoorden. Bezoeker kan een antwoord
// "wijzigen": de flow rolt terug naar dat punt, alle downstream-antwoorden
// worden gewist, lead-data blijft bewaard tenzij expliciet "vergeten".
//
// Lead-data tonen we alleen als "we hebben dit al" met een aparte
// vergeet-actie zodat de bezoeker er niet onnodig opnieuw door hoeft.
export default function AnswersSheet({ open, answers, onClose, onEdit, onForgetLead }) {
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
                Vergeten
              </button>
            </div>
            <div className="space-y-1 text-[13px] text-ink">
              {lead.firstName && (
                <div><span className="text-ink-mute mr-2">Naam</span>{lead.firstName}</div>
              )}
              {lead.email && (
                <div><span className="text-ink-mute mr-2">E-mail</span>{lead.email}</div>
              )}
              {lead.phone && (
                <div><span className="text-ink-mute mr-2">06</span>{lead.phone}</div>
              )}
            </div>
            <p className="text-[11px] text-ink-mute leading-snug mt-2">
              We vragen deze niet opnieuw, tenzij je ze vergeet.
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
      </div>
    </div>
  )
}

const ROW_DEFS = [
  { key: 'intent', label: 'Voor wie' },
  { key: 'availabilityCheck', label: 'Beschikbaarheid bekeken' },
  { key: 'brochureTrigger', label: 'Brochure' },
  { key: 'size', label: 'Grootte begane grond' },
  { key: 'timeline', label: 'Termijn' },
  { key: 'followup', label: 'Vervolg' },
]

function buildRows(answers) {
  return ROW_DEFS
    .filter((d) => answers[d.key]?.label)
    .map((d) => ({ key: d.key, label: d.label, value: answers[d.key].label }))
}
