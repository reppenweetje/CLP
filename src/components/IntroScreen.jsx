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
            <div className="text-[28px] lg:text-[44px] font-semibold text-ink leading-tight">{project.displayName}</div>
            <div className="text-[13px] lg:text-[16px] text-ink-soft mt-0.5 lg:mt-1">{project.tagline}</div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md lg:max-w-2xl px-4 lg:px-6 pt-6 lg:pt-10 flex-1 flex flex-col">
        <div className="space-y-4 lg:space-y-6 fade-up">
          <h1 className="text-[22px] lg:text-[28px] leading-tight font-semibold text-ink">
            Welkom. Bekijk hier de brochure en de prijzen die het beste bij jouw wensen passen.
          </h1>

          <div className="grid grid-cols-3 gap-2 lg:gap-3 pt-1">
            <Stat label="Units" value="14" />
            <Stat label="Verkocht" value="50%" />
            <Stat label="Vanaf" value="€239k" />
          </div>
        </div>

        <div className="mt-auto pt-8 lg:pt-12 pb-4 lg:pb-6 space-y-3 fade-up">
          <button
            onClick={() => onStart(ctaVariant)}
            data-cta-variant={ctaVariant}
            className="w-full lg:max-w-md lg:mx-auto block rounded-full bg-neon text-midnite font-semibold py-4 lg:py-5 text-[15px] lg:text-[17px] hover:brightness-95 active:scale-[0.99] transition"
          >
            {CTA_VARIANTS[ctaVariant]}
          </button>
          <div className="text-[11px] lg:text-[12px] text-ink-mute text-center">
            Geen spam, alleen relevante info over De Hofman.
          </div>
          <div className="text-[10px] lg:text-[11px] text-ink-mute italic text-center leading-snug">
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
      <div className="text-[10px] lg:text-[11px] tracking-[0.16em] text-ink-mute uppercase">{label}</div>
      <div className="text-[16px] lg:text-[20px] font-semibold text-ink mt-0.5">{value}</div>
    </div>
  )
}
