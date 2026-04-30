import { project } from '../data/project.js'

// volledig scherm intro voor verplichte begin daarna gaat alles chat
// neon cta enige neon op de hele app
export default function IntroScreen({ onStart }) {
  return (
    <div className="flex-1 flex flex-col mx-auto w-full max-w-md px-4 pt-2 pb-4">
      <div className="relative rounded-3xl overflow-hidden mb-6 fade-up bg-canvas-2">
        <img src={project.hero} alt="" className="w-full h-72 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-paper/95 via-paper/30 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-[10px] tracking-[0.22em] text-midnite uppercase font-medium">pilotproject</div>
          <div className="text-[28px] font-semibold mt-1 text-ink leading-tight">{project.displayName}</div>
          <div className="text-[13px] text-ink-soft mt-0.5">{project.tagline}</div>
        </div>
      </div>

      <div className="space-y-4 fade-up">
        <h1 className="text-[24px] leading-tight font-semibold text-ink">
          ontdek in 60 seconden welke informatie over de hofman voor jou interessant is
        </h1>
        <p className="text-[14px] text-ink-soft leading-relaxed">
          beantwoord een paar korte vragen daarna sturen we direct brochure plattegronden prijzen en actuele beschikbaarheid
        </p>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <Stat label="units" value="14" />
          <Stat label="verkocht" value="≈ 50%" />
          <Stat label="vanaf" value="€239k" />
        </div>
      </div>

      <div className="mt-auto pt-8 space-y-3 fade-up">
        <button
          onClick={onStart}
          className="w-full rounded-full bg-neon text-midnite font-semibold py-4 text-[15px] hover:brightness-95 active:scale-[0.99] transition"
        >
          begin in 60 seconden
        </button>
        <div className="text-[11px] text-ink-mute text-center">
          geen spam alleen relevante info over de hofman
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
