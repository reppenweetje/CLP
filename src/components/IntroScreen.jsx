import { useEffect, useState } from 'react'
import { project } from '../data/project.js'
import { CTA_VARIANTS, pickCtaVariant } from '../lib/cta.js'
import HeroCarousel from './HeroCarousel.jsx'

// Volledig scherm intro voor de verplichte begin. Daarna gaat alles chat.
// Hero is full-width edge-to-edge; de overlay-tekst en de content eronder
// delen dezelfde max-w-md + px-4 zodat alles netjes op één lijn staat.
// CTA roteert: ?cta=A|B|C|D > localStorage > random (persistent per bezoeker).
export default function IntroScreen({ onStart }) {
  const [ctaVariant, setCtaVariant] = useState('A')
  useEffect(() => {
    setCtaVariant(pickCtaVariant())
  }, [])

  return (
    <div className="flex-1 flex flex-col w-full overflow-y-auto">
      <div className="relative w-full h-80 sm:h-96 lg:h-[520px] xl:h-[600px] bg-canvas-2 fade-up overflow-hidden">
        <HeroCarousel images={project.gallery} />
        <div className="absolute inset-0 bg-gradient-to-t from-paper/95 via-paper/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 pb-5 lg:pb-8">
          <div className="mx-auto w-full max-w-md lg:max-w-2xl px-4 lg:px-6">
            {project.wordmark ? (
              <img
                src={project.wordmark}
                alt={project.displayName}
                /* Iteratief bijgesteld op feedback: h-12/h-4/h-6 waren respectievelijk
                   te dominant, te klein en nog steeds te klein. h-10/h-14 (40/56px)
                   geeft de wordmark vergelijkbare visuele aanwezigheid als de
                   "thuishaven"-tagline eronder, conform de oorspronkelijke wens. */
                className="h-10 lg:h-14 w-auto"
              />
            ) : (
              <div className="text-[28px] lg:text-[44px] font-semibold text-ink leading-tight">{project.displayName}</div>
            )}
            <div className="text-[14px] lg:text-[16px] text-ink-soft mt-0.5 lg:mt-1">{project.tagline}</div>
            <div className="text-[11px] lg:text-[13px] tracking-[0.16em] text-ink-mute uppercase mt-1.5 lg:mt-2">exclusief in verkoop bij REPP</div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md lg:max-w-2xl px-4 lg:px-6 pt-6 lg:pt-10 flex-1 flex flex-col">
        <div className="space-y-4 lg:space-y-6 fade-up">
          <h1 className="text-[22px] lg:text-[28px] leading-tight font-semibold text-ink">
            Welkom. Via een korte chat krijg je direct de brochure en de prijzen te zien die het beste bij jouw wensen passen.
          </h1>

          <div className="grid grid-cols-2 gap-2 lg:gap-3 pt-1">
            <Stat label="Units" value={String(countProjectUnits(project) || '')} />
            <Stat label="Vanaf" value={formatPriceK(project.units?.find((u) => u.state === 'available')?.priceFrom ?? project.units?.[0]?.priceFrom)} />
          </div>
        </div>

        <div className="mt-auto pt-8 lg:pt-12 pb-4 lg:pb-6 space-y-3 fade-up">
          <button
            onClick={() => onStart(ctaVariant)}
            data-cta-variant={ctaVariant}
            className="w-full lg:max-w-md lg:mx-auto block rounded-full bg-neon text-midnite font-semibold py-4 lg:py-5 text-[16px] lg:text-[17px] tracking-wider hover:brightness-95 active:scale-[0.99] transition"
          >
            {CTA_VARIANTS[ctaVariant]}
          </button>
          <div className="text-[11px] lg:text-[12px] text-ink-mute italic text-center leading-snug">
            Sfeerimpressies. Inrichting, beplanting en materialen kunnen afwijken. Geen rechten te ontlenen.
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-mist-light bg-paper px-3 py-2.5 lg:px-4 lg:py-3">
      <div className="text-[11px] lg:text-[12px] tracking-[0.16em] text-ink-mute uppercase">{label}</div>
      <div className="text-[16px] lg:text-[20px] font-semibold text-ink mt-0.5">{value}</div>
    </div>
  )
}

// "€199.950" → "€200k" voor de Stat-tegel. Compacte vorm voor mobile-cards.
function formatPriceK(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return ''
  if (amount >= 1000) return `€${Math.round(amount / 1000)}k`
  return `€${amount}`
}

// Telt alle units uit project.sitePlan over alle ondersteunde layout-schemas
// heen (rows / sections+sidebar / layoutRows / columns).
function countProjectUnits(project) {
  const sp = project.sitePlan || {}
  return (
    (sp.rows?.flatMap((r) => r.units).length || 0) +
    (sp.sections?.flatMap((s) => s.units).length || 0) +
    (sp.sidebar?.units?.length || 0) +
    (sp.layoutRows?.reduce((n, r) => n + (r.left?.units?.length || 0) + (r.right ? 1 : 0), 0) || 0) +
    (sp.columns?.left?.sections?.flatMap((s) => s.units).length || 0) +
    (sp.columns?.right?.units?.length || 0) +
    (sp.svg?.units?.length || 0)
  )
}
