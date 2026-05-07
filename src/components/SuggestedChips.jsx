// Chips als suggested replies onderaan het scherm.
//
// Layout-keuze (na user-feedback): wrap-naar-volgende-regel ipv horizontale
// scroll. De gebruiker zag in de oude versie alleen de eerste 2-3 opties en
// moest naar rechts scrollen om de rest te ontdekken — onontdekte opties
// = lagere conversie. Wrap zorgt dat alle opties in één oogopslag zichtbaar
// zijn. Compacte rechter-padding houdt 't visueel rustig.
//
// Bij ≥5 opties (bv. afhaak-redenen) wordt 't 2 regels — nog steeds
// makkelijker te scannen dan side-scroll.
export default function SuggestedChips({ options, onPick, hint }) {
  if (!options || options.length === 0) return null
  return (
    <div className="border-t border-mist-light bg-canvas/95 backdrop-blur-md pt-3 pb-2 shrink-0">
      {hint && (
        <div className="text-[11px] tracking-wider text-ink-mute uppercase mb-2 px-4">{hint}</div>
      )}
      <div className="flex flex-wrap gap-2 px-4 justify-center">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onPick(opt)}
            className={
              opt.variant === 'primary'
                // Primary-variant: midnite achtergrond, paper tekst. Gebruikt
                // voor de callback-chip wanneer de bezoeker warme signalen
                // afgeeft — visueel uit de toon springen zonder dat het
                // marketing-achtig wordt. Iconisch genoeg om de "service"-actie
                // te signaleren naast informatie-chips.
                ? 'rounded-full bg-midnite hover:bg-midnite-soft text-paper border border-midnite text-[13.5px] px-3.5 py-2 transition leading-snug active:scale-[0.98] font-medium'
                : 'rounded-full bg-paper border border-mist hover:border-midnite hover:bg-canvas-2 active:scale-[0.98] text-ink text-[13.5px] px-3.5 py-2 transition leading-snug'
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="text-[10.5px] text-ink-mute text-center mt-2 leading-tight px-4 pb-1 flex items-center justify-center gap-3">
        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-mute hover:text-midnite underline underline-offset-2 decoration-mist hover:decoration-midnite"
        >
          Privacystatement
        </a>
        <span className="text-mist" aria-hidden="true">|</span>
        <a
          href="https://repp.nl"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-mute hover:text-midnite underline underline-offset-2 decoration-mist hover:decoration-midnite"
        >
          Verkoop door REPP
        </a>
      </div>
    </div>
  )
}
