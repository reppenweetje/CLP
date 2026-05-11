import Avatar from './Avatar.jsx'
import ImpressionNote from './ImpressionNote.jsx'

// Horizontale snap-carousel met USP-kaarten, persona-aware volgorde.
// Elke kaart is zelfstandig leesbaar: tag + titel + body + image of video.
// Een kaart kan optioneel een `video` veld hebben (path naar mp4); dan
// renderen we een autoplay-muted-loop <video> ipv een statische <img>.
// `image` blijft als poster zodat de eerste frame al direct in beeld is
// voor de video geladen is.
export default function UspCardsBubble({ cards, intro }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          {intro && (
            <div className="px-4 pt-3.5 text-[16px] text-ink leading-relaxed">{intro}</div>
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
                  {card.video ? (
                    <video
                      src={card.video}
                      poster={card.image}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                      aria-hidden="true"
                    />
                  ) : (
                    <img
                      src={card.image}
                      alt=""
                      className="w-full h-full object-cover"
                      loading={i === 0 ? 'eager' : 'lazy'}
                    />
                  )}
                </div>
                <div className="p-4">
                  <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">{card.tag}</div>
                  <h3 className="text-[16px] font-semibold text-ink leading-tight mt-1.5">{card.title}</h3>
                  <p className="text-[13px] text-ink-soft leading-relaxed mt-1.5">{card.body}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="px-4 pb-2 flex items-center gap-1.5">
            {cards.map((_, i) => (
              <span key={i} className="h-1 w-3 rounded-full bg-mist" />
            ))}
            <span className="text-[11px] tracking-widest text-ink-mute uppercase ml-2">Veeg</span>
          </div>
          <ImpressionNote className="px-4 pb-3" />
        </div>
      </div>
    </div>
  )
}
