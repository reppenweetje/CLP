import Avatar from './Avatar.jsx'

// locatie kaart met drone shot reistijd pills en korte highlights
export default function LocationBubble({ location, projectName }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="relative aspect-[16/9] bg-canvas-2 overflow-hidden">
            <img src={location.aerialImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-paper/40 via-transparent to-transparent" />
            <PinMarker />
          </div>
          <div className="p-4">
            <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium">locatie</div>
            <div className="text-[15px] font-semibold text-ink mt-1.5">a hofmanweg waarderpolder</div>
            <div className="text-[13px] text-ink-soft leading-relaxed mt-1">
              gevestigde bedrijvenlocatie in haarlem in de metropoolregio amsterdam
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-2">
              {location.travelTimes.map((t) => (
                <div key={t.to} className="rounded-xl bg-canvas-2 border border-mist-light px-3 py-2 flex items-baseline justify-between gap-2">
                  <span className="text-[12px] text-ink-soft truncate">{t.to}</span>
                  <span className="text-[13px] font-semibold text-ink shrink-0">{t.value}</span>
                </div>
              ))}
            </div>

            <ul className="mt-3.5 space-y-1.5">
              {location.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-ink-soft leading-snug">
                  <span className="text-gold mt-1">◆</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function PinMarker() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="relative">
        <div className="absolute -top-1 -left-1 w-7 h-7 rounded-full bg-midnite/30 animate-ping" />
        <div className="w-5 h-5 rounded-full bg-midnite border-2 border-paper shadow-lg" />
      </div>
    </div>
  )
}
