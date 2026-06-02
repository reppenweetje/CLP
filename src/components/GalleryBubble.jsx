import Avatar from './Avatar.jsx'
import ImpressionNote from './ImpressionNote.jsx'
import { useSnapCarousel } from '../lib/useSnapCarousel.js'

// horizontale snap carousel met sfeerbeelden van het project.
// Touch + trackpad-swipe werken via CSS snap-x. Voor desktop muis-gebruikers
// voegt useSnapCarousel click-and-drag toe + klikbare dots.
export default function GalleryBubble({ images, intro }) {
  const { ref, activeIndex, scrollToIndex, dragHandlers } = useSnapCarousel()

  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          {intro && (
            <div className="px-4 pt-3.5 text-[16px] text-ink leading-relaxed">{intro}</div>
          )}
          <div
            ref={ref}
            {...dragHandlers}
            className="overflow-x-auto snap-x snap-mandatory flex gap-2 px-3 py-3 scroll-px-3 cursor-grab select-none"
            style={{ scrollbarWidth: 'none' }}
          >
            {images.map((img, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[80%] aspect-[16/10] rounded-2xl overflow-hidden bg-canvas-2 border border-mist-light"
              >
                <img
                  src={img.src}
                  alt={img.alt || ''}
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none"
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>
          <div className="px-4 pb-2 flex items-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIndex(i)}
                aria-label={`Ga naar afbeelding ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIndex ? 'w-5 bg-midnite' : 'w-3 bg-mist hover:bg-ink-mute'
                }`}
              />
            ))}
            <span className="text-[11px] tracking-widest text-ink-mute uppercase ml-2">Veeg of klik</span>
          </div>
          <ImpressionNote className="px-4 pb-3" />
        </div>
      </div>
    </div>
  )
}
