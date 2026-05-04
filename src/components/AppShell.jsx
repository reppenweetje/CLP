import ProgressIndicator from './ProgressIndicator.jsx'

// Header met REPP logomark, dunne goud-divider, WhatsApp escape en
// een "aanpassen"-icoon dat de antwoorden-sheet opent.
// De DEMO-toggle is verwijderd; debug-paneel blijft beschikbaar via ?debug=1.
export default function AppShell({
  children,
  progress,
  onBack,
  hideHeader,
  waLink,
  onWaClick,
  phoneLink,
  onPhoneClick,
  onAnswersOpen,
  showAnswersButton,
}) {
  return (
    <div className="h-[100dvh] flex flex-col bg-canvas text-ink overflow-hidden">
      {!hideHeader && (
        <header className="sticky top-0 z-20 bg-canvas/85 backdrop-blur-md">
          <div className="mx-auto w-full max-w-md px-4 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {onBack ? (
                <button
                  onClick={onBack}
                  className="p-2 -ml-2 rounded-full text-ink-soft hover:text-ink hover:bg-canvas-2 transition"
                  aria-label="terug"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
              ) : (
                <div className="w-7 h-7 rounded-full bg-midnite flex items-center justify-center">
                  <img src="/images/repp-mark.svg" alt="" aria-hidden="true" className="w-[18px]" />
                </div>
              )}
              <div className="text-[12px] tracking-[0.18em] text-ink uppercase font-medium whitespace-nowrap">de hofman</div>
            </div>
            <div className="flex items-center gap-2">
              {progress && <ProgressIndicator current={progress.current} total={progress.total} />}
              {showAnswersButton && (
                <button
                  onClick={onAnswersOpen}
                  className="w-9 h-9 rounded-full bg-paper border border-mist hover:border-midnite text-ink-soft hover:text-ink active:scale-95 flex items-center justify-center transition"
                  aria-label="aanpassen"
                  title="aanpassen"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="13" y2="6"></line>
                    <line x1="3" y1="12" x2="13" y2="12"></line>
                    <line x1="3" y1="18" x2="9" y2="18"></line>
                    <path d="M18 12l3 3-6 6h-3v-3z"></path>
                  </svg>
                </button>
              )}
              {phoneLink && (
                <a
                  href={phoneLink}
                  onClick={onPhoneClick}
                  className="w-9 h-9 rounded-full bg-paper border border-mist hover:border-midnite text-ink-soft hover:text-midnite active:scale-95 flex items-center justify-center transition"
                  aria-label="direct bellen"
                  title="direct bellen"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </a>
              )}
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onWaClick}
                  className="w-9 h-9 rounded-full bg-emerald-50 hover:bg-emerald-100 active:scale-95 flex items-center justify-center text-emerald-700 transition"
                  aria-label="direct whatsapp"
                  title="direct whatsapp"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.3 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2.1 3.2 5 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z" />
                    <path d="M20.5 3.5C18.3 1.2 15.2 0 12 0 5.4 0 0 5.4 0 12c0 2.1.5 4.2 1.6 6L0 24l6.2-1.6c1.7.9 3.7 1.4 5.7 1.4 6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.4-8.3zM12 21.8c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-3.7 1 1-3.6-.2-.4c-1-1.6-1.5-3.4-1.5-5.3C2.1 6.6 6.5 2.2 12 2.2c2.6 0 5.1 1 7 2.9 1.9 1.9 2.9 4.4 2.9 7-.1 5.5-4.5 9.7-9.9 9.7z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
          <div className="mx-auto max-w-md px-4">
            <div className="h-px bg-gold/40" />
          </div>
        </header>
      )}
      {children}
    </div>
  )
}
