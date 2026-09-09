import { useEffect, useState } from 'react'
import Avatar from './Avatar.jsx'

// ConfigContactBubble — één contactkaart met meerdere velden (naam, bedrijf,
// e-mail, telefoon) voor de config-gedreven survey-engine. Vervangt de losse
// vraag-per-veld-stappen door één formulier dat in één keer wordt ingediend.
//
// BELANGRIJK (zie CLAUDE.md): bewust GEEN <form>-element en geen
// autocomplete=email/tel/name. Password managers detecteren dat patroon en
// leggen een overlay op de chat. Daarom per input: autocomplete=off,
// data-1p-ignore, data-lpignore, data-form-type=other, een willekeurige
// name en alleen inputMode als toetsenbord-hint (triggert geen PWM).
//
// Velden komen volledig uit props (fields[]), zodat elke config-survey deze
// kaart kan hergebruiken. Verplichte velden en e-mail worden client-side
// gevalideerd; telefoon is optioneel.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Telefooncontrole. Bewust soepel in wat we accepteren (spaties, streepjes,
// haakjes en punten mogen), maar streng in de lengte, zodat een typefout of
// een half ingetikt nummer meteen opvalt in plaats van pas bij het nabellen.
// Geeft null terug als het klopt, anders een leesbare melding.
function phoneError(raw) {
  const cleaned = String(raw).replace(/[\s\-().]/g, '')
  if (!/^\+?\d+$/.test(cleaned)) return 'Gebruik alleen cijfers, eventueel met + ervoor.'
  // 00 31 ... → +31 ...
  const normalized = cleaned.startsWith('00') ? '+' + cleaned.slice(2) : cleaned
  if (normalized.startsWith('+')) {
    const digits = normalized.slice(1)
    if (digits.startsWith('31')) {
      const national = digits.slice(2)
      if (national.length < 9) return 'Dit nummer is te kort.'
      if (national.length > 9) return 'Dit nummer is te lang.'
      return null
    }
    // Buitenlands nummer: E.164 staat 8 tot 15 cijfers toe.
    if (digits.length < 8) return 'Dit nummer is te kort.'
    if (digits.length > 15) return 'Dit nummer is te lang.'
    return null
  }
  if (normalized.startsWith('0')) {
    if (normalized.length < 10) return 'Dit nummer is te kort.'
    if (normalized.length > 10) return 'Dit nummer is te lang.'
    return null
  }
  // Zonder 0 of landcode: alleen een kaal mobiel nummer (bv. 612345678).
  if (normalized.length === 9) return null
  return normalized.length > 9 ? 'Dit nummer is te lang.' : 'Dit nummer is te kort.'
}

export default function ConfigContactBubble({ fields = [], initial = null, warm = false, onSubmit, onNotYou }) {
  const [values, setValues] = useState(() => {
    const base = {}
    for (const f of fields) base[f.key] = (initial && initial[f.key]) || ''
    return base
  })
  const [touched, setTouched] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [primed, setPrimed] = useState(!!initial)

  // Warme CLP: de voorvul-gegevens komen async binnen (lead-prefetch). Als ze
  // ná de eerste render arriveren, vullen we het formulier alsnog — maar alleen
  // zolang de bezoeker nog niets heeft aangepast of ingediend, zodat we een
  // handmatige wijziging nooit overschrijven.
  useEffect(() => {
    if (primed || submitted || dirty || !initial) return
    setValues((prev) => {
      const next = { ...prev }
      for (const f of fields) if (!next[f.key]) next[f.key] = initial[f.key] || ''
      return next
    })
    setPrimed(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  function setField(key, val) {
    if (submitted) return
    setDirty(true)
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  function fieldError(f) {
    const v = (values[f.key] || '').trim()
    if (f.required && !v) return 'Vul dit veld in.'
    if (f.crm?.lead === 'email' && v && !EMAIL_RE.test(v)) return 'Dit lijkt geen geldig e-mailadres.'
    // Telefoon is optioneel: leeg mag, maar ingevuld moet kloppen.
    if (f.inputMode === 'tel' && v) return phoneError(v)
    return null
  }

  const firstError = fields.map(fieldError).find(Boolean) || null

  function handleSubmit() {
    if (submitted) return
    setTouched(true)
    if (firstError) return
    const out = {}
    for (const f of fields) out[f.key] = (values[f.key] || '').trim()
    setSubmitted(true)
    onSubmit?.(out)
  }

  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">Contactgegevens</div>
            {warm && (
              <div className="text-[13px] text-ink-soft mt-1.5">
                Controleer uw gegevens en pas ze aan waar nodig.
              </div>
            )}
            <div className="mt-3 flex flex-col gap-3">
              {fields.map((f) => {
                const err = touched ? fieldError(f) : null
                return (
                  <div key={f.key}>
                    <label className="block text-[12px] text-ink-soft mb-1">{f.label}</label>
                    <input
                      type="text"
                      inputMode={f.inputMode}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize={f.inputMode === 'email' ? 'none' : 'sentences'}
                      spellCheck={false}
                      data-1p-ignore="true"
                      data-lpignore="true"
                      data-form-type="other"
                      name={`chat-${f.key}-${Math.random().toString(36).slice(2, 8)}`}
                      placeholder={f.placeholder || ''}
                      value={values[f.key]}
                      disabled={submitted}
                      onChange={(e) => setField(f.key, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleSubmit()
                        }
                      }}
                      className={`w-full rounded-2xl bg-paper border px-3.5 py-2.5 text-[16px] text-ink placeholder:text-ink-mute outline-none transition ${
                        err ? 'border-rose-400 focus:border-rose-500' : 'border-mist focus:border-midnite'
                      } ${submitted ? 'opacity-60' : ''}`}
                    />
                    {err && <div className="text-[12px] text-rose-600 mt-1">{err}</div>}
                  </div>
                )
              })}
            </div>
            {!submitted ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full mt-4 bg-midnite hover:bg-midnite-soft text-paper text-sm font-medium py-2.5 rounded-full transition"
              >
                {warm ? 'Bevestigen' : 'Versturen'}
              </button>
            ) : (
              <div className="mt-4 text-sm text-emerald-700 font-medium">✓ Genoteerd, dank u wel.</div>
            )}
            {/* Doorgestuurde mail: de ontvanger ziet dan de gegevens van een
                collega. Zonder deze uitweg zou hij die record overschrijven.
                Hiermee begint hij schoon, als losse lead. */}
            {warm && !submitted && onNotYou && (initial?.naam || initial?.email) && (
              <button
                type="button"
                onClick={() => {
                  const leeg = {}
                  for (const f of fields) leeg[f.key] = ''
                  setValues(leeg)
                  setDirty(true)
                  setTouched(false)
                  onNotYou()
                }}
                className="w-full mt-2.5 text-[12px] text-ink-mute hover:text-midnite transition"
              >
                {initial?.naam ? `Bent u niet ${initial.naam}?` : 'Zijn dit niet uw gegevens?'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
