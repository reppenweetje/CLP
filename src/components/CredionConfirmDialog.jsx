import { useEffect } from 'react'
import { project } from '../data/project.js'

// Bevestigingsdialoog voor de financieringspartner-link in de calc-bubbles.
// Voorkomt misclicks: sliders en knoppen liggen dichtbij elkaar in de
// rendement-/maandlast-calc, en een per-ongeluk-tap naar de partner is
// disruptief (start een lead-capture flow met derde-partij-toestemming).
//
// Partner-naam komt uit project.financing.partner (De Hofman = Credion,
// De Paveri = generieke vastgoedfinancieringspartner, geen bedrijfsnaam in
// de copy). Component-naam blijft CredionConfirmDialog voor backwards-compat
// met imports.
//
// State-of-the-art mobile pattern: bottom-sheet met blur-backdrop, één
// duidelijke primary-bevestiging + neutrale annulering. ESC-key sluit.
export default function CredionConfirmDialog({ open, onConfirm, onCancel }) {
  const partner = project.financing?.partner || 'Credion'
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm pointer-events-auto fade-up"
        onClick={onCancel}
        aria-hidden
      />
      <div
        className="relative pointer-events-auto bg-paper rounded-t-3xl shadow-[0_-4px_30px_rgba(15,15,112,0.18)] slide-in-bottom"
        role="dialog"
        aria-label={`Financieringsscan via ${partner}`}
      >
        <div className="sticky top-0 bg-paper pt-3 pb-2 flex flex-col items-center">
          <div className="w-10 h-1 rounded-full bg-mist" aria-hidden />
        </div>
        <div className="px-5 pt-1 pb-6">
          <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">{project.financing?.partnerLabel || `Partner ${partner}`}</div>
          <div className="text-[18px] font-semibold text-ink mt-1.5 leading-snug">
            Vrijblijvende financieringsscan aanvragen?
          </div>

          <div className="mt-4 rounded-2xl bg-canvas-2 border border-mist-light p-3.5 space-y-2.5 text-[13.5px] text-ink-soft leading-relaxed">
            <div className="flex gap-2.5">
              <span className="shrink-0 w-1 h-1 rounded-full bg-midnite mt-2" aria-hidden />
              <span>{partner} belt je <strong className="text-ink">zo snel mogelijk</strong> om de cijfers door te lopen.</span>
            </div>
            <div className="flex gap-2.5">
              <span className="shrink-0 w-1 h-1 rounded-full bg-midnite mt-2" aria-hidden />
              <span>Helemaal <strong className="text-ink">vrijblijvend</strong>, geen verplichtingen.</span>
            </div>
            <div className="flex gap-2.5">
              <span className="shrink-0 w-1 h-1 rounded-full bg-midnite mt-2" aria-hidden />
              <span>We delen je <strong className="text-ink">naam, e-mail en 06</strong> alleen met {partner} na jouw bevestiging.</span>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={onConfirm}
              className="w-full rounded-full bg-midnite hover:bg-midnite-soft text-paper font-semibold py-3.5 text-[15px] active:scale-[0.99] transition"
            >
              Ja, vraag de scan aan
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-full border border-mist hover:border-midnite text-ink-soft hover:text-midnite font-medium py-3.5 text-[15px] transition"
            >
              Nee, nu niet
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
