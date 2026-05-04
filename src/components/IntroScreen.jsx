import { useEffect, useState } from 'react'
import { project } from '../data/project.js'
import { CTA_VARIANTS, pickCtaVariant } from '../lib/cta.js'

// Volledig scherm intro voor de verplichte begin. Daarna gaat alles chat.
// CTA roteert: ?cta=A|B|C|D > localStorage > random (persistent per bezoeker).
export default function IntroScreen({ onStart }) {
  const [ctaVariant, setCtaVariant] = useState('A')
  useEffect(() => {
    setCtaVariant(pickCtaVariant())
  }, [])

  return (
    <div className="flex-1 flex flex-col mx-auto w-full max-w-md px-4 pt-2 pb-4 overflow-y-auto">
      <div className="relative rounded-3xl overflow-hidden mb-6 fade-up bg-canvas-2">
        <img src={project.hero} alt="" className="w-full h-72 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-paper/95 via-paper/30 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-[10px] tracking-[0.22em] text-midnite uppercase font-medium">Pilotproject</div>
          <div className="text-[28px] font-semibold mt-1 text-ink leading-tight">{project.displayName}</div>
          <div className="text-[13px] text-ink-soft mt-0.5">{project.tagline}</div>
        </div>
      </div>

      <div className="space-y-4 fade-up">
        <h1 className="text-[22px] leading-tight font-semibold text-ink">
          Welkom. Bekijk hier de brochure en de prijzen die het beste bij jouw wensen passen.
        </h1>
        <p className="text-[14px] text-ink-soft leading-relaxed">
          Beantwoord een paar korte vragen en ontvang de informatie die voor jou relevant is.
        </p>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <Stat label="Units" value="14" />
          <Stat label="Verkocht" value="50%" />
          <Stat label="Vanaf" value="€239k" />
        </div>
      </div>

      <div className="mt-auto pt-8 space-y-3 fade-up">
        <button
          onClick={onStart}
          data-cta-variant={ctaVariant}
          className="w-full rounded-full bg-neon text-midnite font-semibold py-4 text-[15px] hover:brightness-95 active:scale-[0.99] transition"
        >
          {CTA_VARIANTS[ctaVariant]}
        </button>
        <div className="text-[11px] text-ink-mute text-center">
          Geen spam, alleen relevante info over De Hofman.
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-mist-light bg-paper px-3 py-2.5">
      <div className="text-[10px] tracking-[0.16em] text-ink-mute uppercase">{label}</div>
      <div className="text-[16px] font-semibold text-ink mt-0.5">{value}</div>
    </div>
  )
}
