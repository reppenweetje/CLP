import ProgressIndicator from './ProgressIndicator.jsx'

// header met repp logomark dunne goud divider en demo toggle
export default function AppShell({ children, progress, onBack, onDebugToggle, debugOpen, hideHeader }) {
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
            <div className="flex items-center gap-3">
              {progress && <ProgressIndicator current={progress.current} total={progress.total} />}
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
