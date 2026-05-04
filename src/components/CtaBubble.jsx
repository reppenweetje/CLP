import Avatar from './Avatar.jsx'

// laatste cta in thread whatsapp deeplink en brochure
export default function CtaBubble({ waLink, onBrochure, summary }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light p-4 space-y-3">
          {summary && (
            <div className="rounded-2xl bg-canvas-2 border border-mist-light p-3.5">
              <div className="text-[10px] tracking-[0.18em] text-ink-mute uppercase">Jouw interesse</div>
              <div className="text-[13px] text-ink leading-relaxed mt-1.5">{summary}</div>
            </div>
          )}
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="block w-full text-center rounded-full bg-neon text-midnite font-semibold py-3.5 text-[14px] hover:brightness-95 active:scale-[0.99] transition"
          >
            Open WhatsApp met REPP
          </a>
          {onBrochure && (
            <button
              type="button"
              onClick={onBrochure}
              className="block w-full text-center rounded-full border border-midnite/40 bg-paper text-midnite font-medium py-3.5 text-[14px] hover:bg-canvas-2 transition"
            >
              Bekijk brochure
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
