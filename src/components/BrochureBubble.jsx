import Avatar from './Avatar.jsx'
import ImpressionNote from './ImpressionNote.jsx'

// brochure card als bot bubble cover thumbnail plus open knop
export default function BrochureBubble({ url, hero, projectName }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="relative aspect-[16/9] bg-canvas-2 overflow-hidden">
            <img src={hero} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-paper/60 via-transparent to-transparent" />
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-paper/95 backdrop-blur text-[11px] tracking-[0.18em] text-midnite uppercase font-medium border border-mist">
              brochure pdf
            </div>
          </div>
          <div className="p-4">
            <div className="text-[16px] font-semibold text-ink leading-tight">{projectName} brochure</div>
            <div className="text-[13px] text-ink-soft mt-1 leading-snug">
              24 pagina visuals plattegronden specs prijzen en aankoopproces
            </div>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block w-full text-center rounded-full bg-midnite text-paper font-medium py-3 text-[15px] hover:bg-midnite-soft transition active:scale-[0.99]"
            >
              open brochure
            </a>
            <ImpressionNote variant="short" className="mt-3" />
          </div>
        </div>
      </div>
    </div>
  )
}
