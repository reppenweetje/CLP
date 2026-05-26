import { useState } from 'react'
import Avatar from './Avatar.jsx'

// LeadFormBubble — vervangt het oude 4-staps lead-capture pad (email → naam
// → phoneAsk → phone) door één bubble met drie verplichte velden. Wordt
// ingezet na "Ja, stuur maar" op de brochureTrigger.
//
// Phone-validatie: NL formats. Accepteert 06xxxxxxxx of +316xxxxxxxx en
// normaliseert naar +316... zodat de outbound-dispatcher en CRM-matching
// in international format zien (zie ook lib/parseLead.js findPhone-fix).
// Andere landen / niet-NL nummers krijgen een foutmelding — match met
// huidige doelgroep De Hofman.
//
// PWM-bescherming (1Password etc): geen <form name=...>, geen
// autocomplete="email"/"tel"/"given-name". We laten 1Password expliciet
// negeren via data-1p-ignore + random name attributes (zelfde patroon
// als ChatInput.jsx).
export default function LeadFormBubble({ onSubmit }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  function validate() {
    const next = {}
    if (!name.trim()) next.name = 'Vul je naam in'
    if (!email.trim()) next.email = 'Vul je e-mail in'
    else if (!/^[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z]{2,}$/i.test(email.trim())) {
      next.email = 'Dit lijkt geen geldig e-mailadres'
    }
    const phoneDigits = phone.replace(/\D/g, '')
    if (!phoneDigits) {
      next.phone = 'Vul je 06-nummer in'
    } else if (!isValidNLPhone(phoneDigits)) {
      next.phone = 'Gebruik een NL-mobiel nummer (06...)'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (submitted) return
    if (!validate()) return
    setSubmitted(true)
    onSubmit?.({
      firstName: capitalize(name.trim()),
      email: email.trim().toLowerCase(),
      phone: normalizeNLPhone(phone),
    })
  }

  // Random suffix om password-managers te ontmoedigen het patroon te
  // herkennen. Combineert met data-1p-ignore + autocomplete=off.
  const ns = useNamespace()

  return (
    <div className="flex gap-2 items-end animate-fade-up">
      <Avatar />
      <div className="bg-paper rounded-2xl rounded-bl-md px-5 py-4 max-w-[28rem] border border-mist-light shadow-sm">
        <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft font-semibold mb-2">
          Gegevens
        </div>
        <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other">
          <Field
            label="Naam"
            value={name}
            onChange={setName}
            error={errors.name}
            disabled={submitted}
            ns={ns + '-n'}
            placeholder="Naam"
          />
          <Field
            label="E-mail"
            value={email}
            onChange={setEmail}
            error={errors.email}
            disabled={submitted}
            ns={ns + '-e'}
            inputMode="email"
            placeholder="jouw@bedrijf.nl"
          />
          <Field
            label="Telefoon"
            value={phone}
            onChange={setPhone}
            error={errors.phone}
            disabled={submitted}
            ns={ns + '-p'}
            inputMode="tel"
            placeholder="06 12 34 56 78"
          />
          {!submitted && (
            <button
              type="submit"
              className="w-full mt-1 bg-midnite hover:bg-midnite-soft text-paper text-sm font-medium py-2.5 rounded-full transition"
            >
              Verstuur
            </button>
          )}
          {submitted && (
            <div className="mt-1 text-sm text-emerald-700 font-medium">
              ✓ Bedankt, we sturen je zo de brochure.
            </div>
          )}
          <p className="text-[11px] text-ink-mute leading-snug pt-1">
            We mailen je de brochure en bewaren je voorkeur zodat onze
            makelaar je gericht kan opvolgen. Hoe we met je gegevens
            omgaan staat in onze{' '}
            <a
              href="/privacy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-ink-soft"
            >
              privacystatement
            </a>
            .
          </p>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, error, disabled, ns, inputMode, placeholder }) {
  return (
    <label className="block">
      <span className="text-[11px] text-ink-soft font-medium block mb-1">{label}</span>
      <input
        type="text"
        name={ns}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`repp-underline-input w-full text-sm bg-transparent py-1.5 ${
          error ? 'border-rose-400' : ''
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      />
      {error && <span className="text-[11px] text-rose-600 mt-0.5 block">{error}</span>}
    </label>
  )
}

function capitalize(s) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

// Accept 06xxxxxxxx (10 digits) of +316xxxxxxxx / 316xxxxxxxx (11 digits).
function isValidNLPhone(digits) {
  if (digits.length === 10 && digits.startsWith('06')) return true
  if (digits.length === 11 && digits.startsWith('316')) return true
  return false
}

// Normalize to international format consistent with parseLead.js fix:
// 06... → +316..., 316... → +316..., +316... → +316...
function normalizeNLPhone(raw) {
  const d = raw.replace(/\D/g, '')
  if (d.length === 10 && d.startsWith('06')) return '+31' + d.slice(1)
  if (d.length === 11 && d.startsWith('316')) return '+' + d
  return raw
}

// Random short suffix om input-names per render uniek te maken zonder
// een dependency-bloat. useId-alternative.
function useNamespace() {
  const [ns] = useState(() => 'lf-' + Math.random().toString(36).slice(2, 8))
  return ns
}
