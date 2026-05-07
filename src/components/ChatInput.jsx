import { useEffect, useRef, useState } from 'react'

// chat input bar onderin het scherm
// expliciet niet in een form element en alle pwm en autofill hints uit
// zodat 1password lastpass en chrome autofill geen overlay plaatsen
export default function ChatInput({ placeholder, inputMode, validate, onSend, sendLabel = 'verstuur' }) {
  const [value, setValue] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    // reset bij veranderen placeholder zodat volgende vraag schoon start
    setValue('')
    // microtask focus om mobiele keyboard te triggeren
    const t = setTimeout(() => ref.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [placeholder])

  const trimmed = value.trim()
  const valid = trimmed.length > 0 && (validate ? validate(trimmed) : true)

  const submit = () => {
    if (!valid) return
    onSend(trimmed)
    setValue('')
  }

  return (
    <div className="border-t border-mist-light bg-canvas/95 backdrop-blur-md px-4 pt-3 pb-3 shrink-0">
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize={inputMode === 'email' ? 'none' : 'sentences'}
          spellCheck={false}
          data-1p-ignore="true"
          data-lpignore="true"
          data-form-type="other"
          name={`chat-${placeholder?.replace(/\s+/g, '-') || 'input'}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          className="flex-1 rounded-full bg-paper border border-mist focus:border-midnite outline-none px-4 py-3 text-[16px] text-ink placeholder:text-ink-mute transition"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!valid}
          aria-label={sendLabel}
          className={`rounded-full w-11 h-11 shrink-0 flex items-center justify-center transition ${
            valid
              ? 'bg-midnite text-paper hover:bg-midnite-soft active:scale-95'
              : 'bg-mist-light text-ink-mute cursor-not-allowed'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
      {/* Bewust 1 regel + mat: vlak voor email/naam-invoer is privacy-claim
          relevant maar mag niet visueel concurreren met het input-veld.
          Verkoop-attributie zit in de Info-sheet onder de chip-bar. */}
      <div className="text-[11px] text-ink-mute/80 text-center mt-2 leading-tight">
        We bewaren je antwoorden om je goed te helpen.{' '}
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
