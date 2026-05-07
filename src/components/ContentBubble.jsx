import Avatar from './Avatar.jsx'
import ImpressionNote from './ImpressionNote.jsx'

// content card als bot bubble compact mooie kaart in de chat
export default function ContentBubble({ tag, title, body, image }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md overflow-hidden bg-paper border border-mist-light">
          {image && (
            <div className="aspect-[16/9] overflow-hidden bg-canvas-2">
              <img src={image} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-4">
            {tag && (
              <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">
                {tag}
              </div>
            )}
            <div className="text-[16px] font-semibold text-ink leading-snug mt-1.5">{title}</div>
            <div className="text-[14px] text-ink-soft leading-relaxed mt-1.5">{body}</div>
            {image && <ImpressionNote variant="short" className="mt-3" />}
          </div>
        </div>
      </div>
    </div>
  )
}
