import Avatar from './Avatar.jsx'

// 6 highlights als compacte icon achtige grid
export default function HighlightsBubble({ highlights, intro }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium">highlights</div>
            {intro && <div className="text-[14px] text-ink leading-relaxed mt-1.5">{intro}</div>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {highlights.slice(0, 6).map((h, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-canvas-2 border border-mist-light px-3 py-2.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-gold text-[10px]">◆</span>
                    <div className="text-[12px] font-semibold text-ink leading-tight">{h.title}</div>
                  </div>
                  <div className="text-[11px] text-ink-soft leading-snug mt-1">{h.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
