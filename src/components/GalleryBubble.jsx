import Avatar from './Avatar.jsx'

// horizontale snap carousel met sfeerbeelden van het project
export default function GalleryBubble({ images, intro }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          {intro && (
            <div className="px-4 pt-3.5 text-[15px] text-ink leading-relaxed">{intro}</div>
          )}
          <div className="overflow-x-auto snap-x snap-mandatory flex gap-2 px-3 py-3 scroll-px-3" style={{ scrollbarWidth: 'none' }}>
            {images.map((img, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[80%] aspect-[16/10] rounded-2xl overflow-hidden bg-canvas-2 border border-mist-light"
              >
                <img src={img.src} alt={img.alt || ''} className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
              </div>
            ))}
          </div>
          <div className="px-4 pb-3 flex items-center gap-1.5">
            {images.map((_, i) => (
              <span key={i} className="h-1 w-3 rounded-full bg-mist" />
            ))}
            <span className="text-[10px] tracking-widest text-ink-mute uppercase ml-2">veeg</span>
          </div>
        </div>
      </div>
    </div>
  )
}
