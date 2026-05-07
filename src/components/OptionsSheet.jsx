import { useEffect } from 'react'

// Bottom-sheet die alle moreInfo-onderwerpen netjes gegroepeerd toont. Wordt
// geopend wanneer de bezoeker tikt op 'Bekijk alle onderwerpen'. Sheet sluit
// automatisch zodra een chip gekozen is — de keuze wordt doorgegeven aan
// dezelfde chip-handler als de inline chips, zodat we geen duplicate flow
// onderhouden.
//
// Design-keuzes:
//  - Bottom sheet ipv full-modal: bezoeker blijft visueel verbonden met de
//    chat eronder, geen "ander scherm" gevoel
//  - Backdrop met blur ipv harde overlay: rust binnen brand
//  - Categorieën als micro-headers in dezelfde all-caps stijl als elders
//    in de app (consistent met REPP brand-tokens)
//  - Body scroll lock zolang sheet open is, zodat tap-outside intuitief sluit
//
// Categorisering (vast per project, future-vrij voor andere CLPs door
// MORE_INFO_DEFS uitgebreid te maken):
//  - "Project": locatie / sfeer / highlights / aankoopproces / planning
//  - "Plattegrond & prijs": situatietekening / prijslijst / prijsvergelijking
//  - "Voor jou": belegger-info / financiering / brochure
const CATEGORY_ORDER = ['project', 'price', 'forYou']
const CATEGORY_LABEL = {
  project:  'Project',
  price:    'Plattegrond & prijs',
  forYou:   'Voor jou',
}
const CATEGORY_OF = {
  location:      'project',
  gallery:       'project',
  highlights:    'project',
  process:       'project',
  planning:      'project',
  sitePlan:      'price',
  price:         'price',
  priceCompare:  'price',
  investor:      'forYou',
  financing:     'forYou',
  brochure:      'forYou',
}

export default function OptionsSheet({ open, onClose, options, onPick }) {
  // Body scroll lock — voorkomt dat de chat eronder mee-scrollt terwijl
  // bezoeker door de sheet bladert. Cleanup zodra sheet sluit.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // ESC-key sluit sheet, conventioneel UX-patroon.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // Groepeer de inkomende chip-opties per categorie. Onbekende chips landen
  // in 'project' als fallback zodat ze altijd zichtbaar zijn.
  const grouped = { project: [], price: [], forYou: [] }
  for (const opt of options || []) {
    const cat = CATEGORY_OF[opt.id] || 'project'
    grouped[cat].push(opt)
  }
  const visibleCategories = CATEGORY_ORDER.filter((c) => grouped[c].length > 0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
      {/* Backdrop met blur — tap sluit sheet */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm pointer-events-auto fade-up"
        onClick={onClose}
        aria-hidden
      />
      {/* Sheet content */}
      <div
        className="relative pointer-events-auto bg-paper rounded-t-3xl shadow-[0_-4px_30px_rgba(15,15,112,0.15)] max-h-[80dvh] overflow-y-auto pb-safe slide-in-bottom"
        role="dialog"
        aria-label="Alle onderwerpen"
      >
        {/* Top handle voor visuele cue dat het een sheet is */}
        <div className="sticky top-0 bg-paper pt-3 pb-2 flex flex-col items-center z-10">
          <div className="w-10 h-1 rounded-full bg-mist" aria-hidden />
        </div>

        <div className="px-5 pt-1 pb-2">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">Onderwerpen</div>
              <div className="text-[16px] font-semibold text-ink mt-1 leading-snug">Waar wil je dieper op ingaan?</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluit"
              className="text-ink-mute hover:text-ink text-[18px] leading-none p-1 -mr-1"
            >×</button>
          </div>
        </div>

        <div className="px-5 pt-3 pb-5 space-y-5">
          {visibleCategories.map((cat) => (
            <div key={cat}>
              <div className="text-[10px] tracking-[0.18em] text-ink-mute uppercase font-medium mb-2">
                {CATEGORY_LABEL[cat]}
              </div>
              <div className="flex flex-wrap gap-2">
                {grouped[cat].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onPick?.(opt)
                      onClose?.()
                    }}
                    className="rounded-full bg-canvas-2 hover:bg-canvas border border-mist hover:border-midnite text-ink text-[14.5px] px-4 py-2.5 transition leading-snug active:scale-[0.98]"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
