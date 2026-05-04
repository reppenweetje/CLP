import Avatar from './Avatar.jsx'

// Laatste cta in de thread. Bel- en WhatsApp-knop voor directe actie,
// optioneel ook een brochure-link. De brochure wordt verborgen bij het
// afhaak-pad omdat de bezoeker geen match aangaf.
export default function CtaBubble({
  waLink,
  phoneLink,
  phoneDisplay,
  onBrochure,
  onReset,
  onWhatsapp,
  summary,
  intro,
}) {
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
          {intro && (
            <div className="text-[13px] text-ink-soft leading-relaxed">{intro}</div>
          )}
          {phoneLink && (
            <a
              href={phoneLink}
              className="block w-full text-center rounded-full bg-midnite text-paper font-semibold py-3.5 text-[14px] hover:bg-midnite-soft active:scale-[0.99] transition"
            >
              Bel direct{phoneDisplay ? ` ${phoneDisplay}` : ''}
            </a>
          )}
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              onClick={onWhatsapp}
              className="block w-full text-center rounded-full bg-neon text-midnite font-semibold py-3.5 text-[14px] hover:brightness-95 active:scale-[0.99] transition"
            >
              Open WhatsApp met REPP
            </a>
          )}
          {onBrochure && (
            <button
              type="button"
              onClick={onBrochure}
              className="block w-full text-center rounded-full border border-midnite/40 bg-paper text-midnite font-medium py-3.5 text-[14px] hover:bg-canvas-2 transition"
            >
              Bekijk brochure
            </button>
          )}
          {onReset && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && !window.confirm('Wil je opnieuw beginnen? Je antwoorden en gegevens worden gewist.')) {
                  return
                }
                onReset()
              }}
              className="block w-full text-[12px] text-ink-mute hover:text-ink py-2 text-center transition"
            >
              Start opnieuw
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
