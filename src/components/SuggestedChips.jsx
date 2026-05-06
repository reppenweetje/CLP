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
            className="rounded-full bg-paper border border-mist hover:border-midnite hover:bg-canvas-2 active:scale-[0.98] text-ink text-[13.5px] px-3.5 py-2 transition leading-snug"
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="text-[10.5px] text-ink-mute text-center mt-2 leading-tight px-4 pb-1">
        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-mute hover:text-midnite underline underline-offset-2 decoration-mist hover:decoration-midnite"
        >
          Privacystatement
        </a>
      </div>
    </div>
  )
}
