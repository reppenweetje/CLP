import { useState } from 'react'
import Avatar from './Avatar.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizePhone(raw) {
  return raw.replace(/[\s\-().]/g, '')
}

function isValidNlPhone(raw) {
  const n = normalizePhone(raw)
  return /^(06\d{8}|\+316\d{8}|316\d{8})$/.test(n)
}

// inline form als bot bubble onderstreping inputs passend bij repp brandbook
// na submit toont compact bevestigde view zodat het niet opnieuw kan worden ingevuld
export default function InlineLeadForm({ onSubmit }) {
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [showError, setShowError] = useState(false)
  const [submitted, setSubmitted] = useState(null)

  const emailOk = EMAIL_RE.test(email)
  const phoneOk = phone.length === 0 || isValidNlPhone(phone)
  const canSubmit = firstName.trim().length >= 2 && emailOk && phoneOk
  const hasPhone = phone.length > 0 && isValidNlPhone(phone)

  const submit = (e) => {
    e?.preventDefault?.()
    if (submitted || !canSubmit) {
      if (!canSubmit) setShowError(true)
      return
    }
    const payload = {
      firstName: firstName.trim(),
      email: email.trim(),
      phone: hasPhone ? normalizePhone(phone) : null,
    }
    setSubmitted(payload)
    onSubmit(payload)
  }

  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light px-4 py-3.5">
          <div className="text-[15px] leading-relaxed text-ink">
            even je gegevens dan zetten we de juiste info klaar
          </div>

          {!submitted ? (
            <form onSubmit={submit} className="mt-3 space-y-2">
              <input
                autoFocus
                autoComplete="given-name"
                placeholder="voornaam"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="repp-underline-input"
              />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="mailadres"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="repp-underline-input"
              />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="06 nummer optioneel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="repp-underline-input"
              />
              {showError && !canSubmit && (
                <div className="text-[12px] text-rose-700 pt-1">
                  {firstName.trim().length < 2 && 'voornaam graag '}
                  {!emailOk && 'geldig mailadres graag '}
                  {!phoneOk && '06 klopt niet helemaal'}
                </div>
              )}
              <div className="pt-3 flex flex-col gap-1.5">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`rounded-full px-5 py-3 text-[14px] font-medium transition active:scale-[0.99] ${
                    canSubmit
                      ? 'bg-midnite text-paper hover:bg-midnite-soft'
                      : 'bg-mist-light text-ink-mute cursor-not-allowed'
                  }`}
                >
                  {hasPhone ? 'stuur me de info plus whatsapp' : 'stuur me de info'}
                </button>
                <div className="text-[11px] text-ink-mute leading-snug pt-1">
                  06 is optioneel handig zodat we je via whatsapp persoonlijk kunnen helpen
                </div>
              </div>
            </form>
          ) : (
            <div className="mt-3 rounded-2xl bg-canvas-2 border border-mist-light px-3.5 py-3 flex items-center gap-2.5">
              <CheckIcon />
              <div className="text-[13px] text-ink leading-snug">
                <div className="font-medium">{submitted.firstName}</div>
                <div className="text-ink-soft truncate">{submitted.email}</div>
                {submitted.phone && (
                  <div className="text-ink-soft">{submitted.phone}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-midnite text-paper">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  )
}
