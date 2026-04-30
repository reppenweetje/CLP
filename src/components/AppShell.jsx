import ProgressIndicator from './ProgressIndicator.jsx'

// header met repp logomark dunne goud divider whatsapp escape en demo toggle
export default function AppShell({ children, progress, onBack, onDebugToggle, debugOpen, hideHeader, waLink }) {
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
                <div className="w-7 h-7 rounded-full bg-midnite text-paper flex items-center justify-center">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="2" y="9" width="6" height="6" transform="rotate(45 5 12)" stroke="currentColor" strokeWidth="1.7" />
                    <rect x="9" y="9" width="6" height="6" transform="rotate(45 12 12)" fill="currentColor" />
                    <rect x="16" y="9" width="6" height="6" transform="rotate(45 19 12)" stroke="currentColor" strokeWidth="1.7" />
                  </svg>
                </div>
              )}
              <div className="text-[12px] tracking-[0.18em] text-ink uppercase font-medium whitespace-nowrap">de hofman</div>
            </div>
            <div className="flex items-center gap-2">
              {progress && <ProgressIndicator current={progress.current} total={progress.total} />}
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
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
              <button
                onClick={onDebugToggle}
                className={`text-[10px] tracking-[0.18em] font-medium px-2 py-1 rounded-full border transition uppercase ${
                  debugOpen
                    ? 'border-midnite bg-midnite text-paper'
                    : 'border-mist text-ink-soft hover:text-ink hover:border-midnite'
                }`}
                aria-label="demo"
              >
                {debugOpen ? 'sluit' : 'demo'}
              </button>
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
