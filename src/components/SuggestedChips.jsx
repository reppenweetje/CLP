import { useState, useRef, useEffect } from 'react'

// Chips als suggested replies onderaan het scherm.
//
// Layout: wrap-naar-volgende-regel ipv horizontale scroll. Bij ≥5 opties
// (bv. afhaak-redenen of moreInfo expanded) wordt 't 2-3 regels — nog
// steeds makkelijker te scannen dan side-scroll.
//
// Inklapbaar via swipe-down: bezoeker kan de chip-bar minimaliseren tot
// een handle zodat de chat-thread meer verticale ruimte krijgt. Tap op de
// handle of swipe-up klapt 'em weer uit. Per chipset (gevormd door de
// labels) een eigen collapsed-staat zodat elke nieuwe vraag default open
// is — de bezoeker mist anders nieuwe opties onbewust.
//
// Footer (privacy + verkoop): bewust mat en compact, achter een mini info-
// icoon dat een sheet opent. Voorkomt dat de meta-tekst visueel concurreert
// met de chips.
export default function SuggestedChips({ options, onPick, hint }) {
  const [collapsed, setCollapsed] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const startY = useRef(null)
  const lastY = useRef(null)

  // Reset collapsed-state wanneer een nieuwe chip-set verschijnt: nieuwe
  // vraag = bezoeker wil zien wat er kan. Hash van labels als
  // identifier — verandert zodra de opties wijzigen.
  const setKey = (options || []).map((o) => o.id).join('|')
  useEffect(() => { setCollapsed(false) }, [setKey])

  if (!options || options.length === 0) return null

  // Touch handlers voor swipe-detectie op de chip-bar zelf. Drempel: 40px
  // verticale beweging triggert collapse/expand. Horizontale swipes negeren
  // we want die zijn gereserveerd voor scrollende elementen (bv. gallery
  // carousels) elders in de thread.
  const onTouchStart = (e) => {
    startY.current = e.touches[0]?.clientY ?? null
    lastY.current = startY.current
  }
  const onTouchMove = (e) => {
    lastY.current = e.touches[0]?.clientY ?? null
  }
  const onTouchEnd = () => {
    if (startY.current == null || lastY.current == null) return
    const dy = lastY.current - startY.current
    if (dy > 40 && !collapsed) setCollapsed(true)
    else if (dy < -40 && collapsed) setCollapsed(false)
    startY.current = null
    lastY.current = null
  }

  return (
    <div
      className="border-t border-mist-light bg-canvas/95 backdrop-blur-md shrink-0 select-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Drag-handle bovenaan: visuele cue dat dit blok in te klappen is.
          Tap toggelt tussen collapsed/expanded ook voor non-touch users. */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? 'Toon opties' : 'Verberg opties'}
        className="w-full pt-2 pb-1.5 flex flex-col items-center gap-0.5 group"
      >
        <span className={`h-1 rounded-full bg-mist group-hover:bg-mist-light transition-all ${collapsed ? 'w-12' : 'w-10'}`} aria-hidden />
        {collapsed && (
          <span className="text-[10px] tracking-[0.18em] text-ink-mute uppercase mt-0.5">
            {options.length} {options.length === 1 ? 'optie' : 'opties'}
          </span>
        )}
      </button>

      {!collapsed && (
        <>
          {hint && (
            <div className="text-[12px] tracking-wider text-ink-mute uppercase mb-2 px-4">{hint}</div>
          )}
          <div className="flex flex-wrap gap-2 px-4 justify-center pb-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onPick(opt)}
                className={(() => {
                  if (opt.variant === 'primary') {
                    return 'rounded-full bg-midnite hover:bg-midnite-soft text-paper border border-midnite text-[14.5px] px-3.5 py-2 transition leading-snug active:scale-[0.98] font-medium'
                  }
                  if (opt.variant === 'ghost') {
                    return 'rounded-full bg-canvas-2/50 hover:bg-canvas-2 border border-dashed border-mist hover:border-midnite text-ink-soft hover:text-midnite text-[14px] px-3.5 py-2 transition leading-snug active:scale-[0.98]'
                  }
                  return 'rounded-full bg-paper border border-mist hover:border-midnite hover:bg-canvas-2 active:scale-[0.98] text-ink text-[14.5px] px-3.5 py-2 transition leading-snug'
                })()}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Mat info-knopje rechts-onder. Tap opent een mini-sheet met privacy
          + verkoop-attribution. Voorheen stond die tekst altijd zichtbaar
          en concurreerde 'em met de chips — nu alleen op verzoek. */}
      <div className="flex items-center justify-end px-3 pb-1">
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          aria-label="Info over privacy en verkoop"
          className="text-ink-mute/60 hover:text-ink-mute text-[10px] tracking-[0.14em] uppercase flex items-center gap-1 px-2 py-1 transition"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>Info</span>
        </button>
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end pointer-events-none">
          <div
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm pointer-events-auto fade-up"
            onClick={() => setShowInfo(false)}
            aria-hidden
          />
          <div
            className="relative pointer-events-auto bg-paper rounded-t-3xl shadow-[0_-4px_30px_rgba(15,15,112,0.15)] slide-in-bottom"
            role="dialog"
            aria-label="Privacy en verkoop"
          >
            <div className="sticky top-0 bg-paper pt-3 pb-2 flex flex-col items-center">
              <div className="w-10 h-1 rounded-full bg-mist" aria-hidden />
            </div>
            <div className="px-5 pt-1 pb-6">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-[15px] font-semibold text-ink">Over deze chat</div>
                <button
                  type="button"
                  onClick={() => setShowInfo(false)}
                  aria-label="Sluit"
                  className="text-ink-mute hover:text-ink text-[18px] leading-none p-1 -mr-1"
                >×</button>
              </div>
              <div className="mt-3 space-y-3 text-[13.5px] text-ink-soft leading-relaxed">
                <p>
                  Deze landingspagina is in beheer van REPP, verkopend makelaar van De Hofman.
                  We bewaren alleen de antwoorden die je deelt om je goed te helpen.
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <a
                    href="/privacy.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-mist hover:border-midnite text-ink hover:text-midnite text-[13.5px] px-4 py-2.5 text-center transition"
                  >
                    Privacystatement
                  </a>
                  <a
                    href="https://repp.nl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-mist hover:border-midnite text-ink hover:text-midnite text-[13.5px] px-4 py-2.5 text-center transition"
                  >
                    Verkoop door REPP
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
