import Avatar from './Avatar.jsx'

// Horizontale snap-carousel met 6 USP-kaarten, persona-aware volgorde.
// Elke kaart is zelfstandig leesbaar: tag + titel + body + image.
export default function UspCardsBubble({ cards, intro }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          {intro && (
            <div className="px-4 pt-3.5 text-[15px] text-ink leading-relaxed">{intro}</div>
          )}
          <div
            className="overflow-x-auto snap-x snap-mandatory flex gap-2.5 px-3 py-3 scroll-px-3"
            style={{ scrollbarWidth: 'none' }}
          >
            {cards.map((card, i) => (
              <article
                key={card.id}
                className="snap-start shrink-0 w-[78%] rounded-2xl overflow-hidden bg-canvas-2 border border-mist-light"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-mist-light">
                  <img
                    src={card.image}
                    alt=""
                    className="w-full h-full object-cover"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                </div>
                <div className="p-4">
                  <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium">{card.tag}</div>
                  <h3 className="text-[16px] font-semibold text-ink leading-tight mt-1.5">{card.title}</h3>
                  <p className="text-[12px] text-ink-soft leading-relaxed mt-1.5">{card.body}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="px-4 pb-3 flex items-center gap-1.5">
            {cards.map((_, i) => (
              <span key={i} className="h-1 w-3 rounded-full bg-mist" />
            ))}
            <span className="text-[10px] tracking-widest text-ink-mute uppercase ml-2">Veeg</span>
          </div>
        </div>
      </div>
    </div>
  )
}
