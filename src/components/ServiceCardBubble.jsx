import { useState } from 'react'
import Avatar from './Avatar.jsx'
import ImpressionNote from './ImpressionNote.jsx'
import { getTimeContext, getCallbackPromise } from '../lib/buyingSignals.js'

// Geintegreerde service-card voor het hot-moment direct na de timeline-keuze.
// Combineert de unit-aanbeveling (visueel + specs) en de persoonlijke
// handoff (tag, copy, value-bullets, CTA-ladder, optionele inline 06-input)
// in 1 visueel object. Doel is dat de bezoeker op het beslis-moment niet
// 5-6 losse bubbels krijgt te verwerken maar 1 samenhangend service-aanbod.
//
// De copy wordt door App.jsx gerendered (via buildHandoffCopy) en als prop
// meegegeven. Component is puur presentationaal en bevat geen copy-logica.
export default function ServiceCardBubble({
  unit,
  copy,
  salesTeam,
  hasPhone = false,
  phoneDisplay = '',
  waLink,
  phoneLink,
  phoneTextDisplay,
  outcome = null,
  onCallback,
  onWhatsapp,
  onPhone,
  onMoreInfo,
  onSubmitPhone,
}) {
  const repName = salesTeam?.rep?.name || 'een collega'
  const botOrg = salesTeam?.bot?.org || ''
  const [expanded, setExpanded] = useState(false)
  const [phoneAsk, setPhoneAsk] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')

  const time = getTimeContext()
  const promise = getCallbackPromise(time)
  const u = unit?.primary
  const safeCopy = copy || { tag: 'Persoonlijk', headline: '', body: '', value: [], primaryCta: 'Laat mij bellen' }

  const primaryDone = outcome === 'callback' || outcome === 'phone' || outcome === 'whatsapp'
  const isInteractive = !primaryDone && outcome !== 'dismissed'
  const phoneFormatted = formatPhone(phoneDisplay)

  const handlePrimaryClick = () => {
    if (hasPhone) {
      onCallback?.()
      return
    }
    // Geen 06 bekend — onthul inline input voor het 06-nummer.
    setPhoneAsk(true)
  }

  const handlePhoneSubmit = () => {
    const text = phoneInput.trim()
    if (!isValidPhoneText(text)) return
    onSubmitPhone?.(text)
  }

  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md overflow-hidden bg-paper border border-mist-light">
          {/* Unit visual + specs: de aanbeveling */}
          {u && (
            <div>
              <div className="relative aspect-[16/10] overflow-hidden bg-canvas-2">
                <img src={u.image} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-paper/95 backdrop-blur text-[10px] tracking-[0.18em] text-midnite uppercase font-medium border border-mist">
                  aanbevolen
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-paper/95 backdrop-blur text-[10px] text-ink uppercase tracking-wider font-medium border border-mist">
                  {u.stateLabel}
                </div>
              </div>
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="text-[20px] font-semibold text-ink leading-tight">unit {u.type}</div>
                    <div className="text-[12px] text-ink-soft mt-0.5">
                      ≈ {String(u.size).replace('.', ',')} m² {u.levels} laags
                    </div>
                  </div>
                  {u.priceFrom && (
                    <div className="text-right">
                      <div className="text-[10px] tracking-widest text-ink-mute uppercase">vanaf</div>
                      <div className="text-[16px] font-semibold text-ink">€{Math.floor(u.priceFrom / 1000)}k</div>
                      <div className="text-[10px] text-ink-mute">excl btw</div>
                    </div>
                  )}
                </div>
                <div className="text-[13px] text-ink-soft leading-relaxed mt-3">{u.pitch}</div>
                {unit?.note && (
                  <div className="text-[12px] text-midnite leading-relaxed mt-3">
                    {unit.note}
                  </div>
                )}
                <ImpressionNote className="mt-3" />
              </div>
            </div>
          )}

          {/* Dunne scheiding tussen aanbeveling en service-aanbod */}
          <div className="border-t border-mist-light" />

          {/* Persoonlijk service-aanbod */}
          <div className="px-4 pt-4 pb-4 space-y-3 bg-canvas-2/40">
            <div>
              <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium">
                {safeCopy.tag}
              </div>
              <div className="text-[15px] font-semibold text-ink mt-1 leading-snug">
                {safeCopy.headline}
              </div>
            </div>

            <p className="text-[13.5px] text-ink leading-relaxed">{safeCopy.body}</p>

            {/* Uitklapbaar: wat we kort kunnen doornemen */}
            {safeCopy.value && safeCopy.value.length > 0 && (
              <div className="rounded-xl bg-paper border border-mist-light overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-canvas-2/50 transition"
                  aria-expanded={expanded}
                >
                  <span className="text-[10px] tracking-[0.16em] text-ink-soft uppercase">
                    Wat we kort kunnen doornemen
                  </span>
                  <Chevron open={expanded} />
                </button>
                {expanded && (
                  <ul className="text-[12.5px] text-ink-soft leading-relaxed space-y-1 px-3 pb-3 pt-1">
                    {safeCopy.value.map((v) => (
                      <li key={v} className="flex gap-2">
                        <span className="text-midnite mt-1.5 shrink-0 w-1 h-1 rounded-full bg-midnite" />
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Outcome-strips */}
            {outcome === 'callback' && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                <div className="text-[12.5px] text-emerald-900 leading-relaxed">
                  Genoteerd. {repName} belt je {promise}{phoneFormatted ? ` op ${phoneFormatted}` : ''}.
                </div>
              </div>
            )}
            {outcome === 'whatsapp' && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                <div className="text-[12.5px] text-emerald-900 leading-relaxed">
                  WhatsApp opent in een nieuw venster.
                </div>
              </div>
            )}
            {outcome === 'dismissed' && (
              <div className="rounded-xl bg-paper border border-mist-light px-3 py-2.5">
                <div className="text-[12.5px] text-ink-soft leading-relaxed">
                  Geen probleem. Je kunt later altijd nog bellen of WhatsApp'en.
                </div>
              </div>
            )}

            {/* Inline 06-input wanneer bezoeker callback wil maar nog geen 06 heeft gedeeld */}
            {isInteractive && phoneAsk && !hasPhone && (
              <div className="rounded-xl bg-paper border border-mist-light px-3 py-3 space-y-2">
                <div className="text-[12.5px] text-ink leading-relaxed">
                  Op welk 06-nummer mag {repName} je bellen?
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="tel"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    name="callback-phone-inline"
                    placeholder="06 12 34 56 78"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handlePhoneSubmit()
                      }
                    }}
                    className="flex-1 rounded-full bg-canvas-2 border border-mist focus:border-midnite outline-none px-4 py-2.5 text-[16px] text-ink placeholder:text-ink-mute transition"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handlePhoneSubmit}
                    disabled={!isValidPhoneText(phoneInput.trim())}
                    aria-label="Verstuur"
                    className={`rounded-full w-10 h-10 shrink-0 flex items-center justify-center transition ${
                      isValidPhoneText(phoneInput.trim())
                        ? 'bg-midnite text-paper hover:bg-midnite-soft active:scale-95'
                        : 'bg-mist-light text-ink-mute cursor-not-allowed'
                    }`}
                  >
                    <ArrowIcon />
                  </button>
                </div>
              </div>
            )}

            {/* CTA-ladder: alleen zichtbaar als geen outcome en geen actieve phone-prompt */}
            {isInteractive && !phoneAsk && (
              <div className="space-y-2 pt-1">
                <button
                  onClick={handlePrimaryClick}
                  className="w-full bg-midnite hover:bg-midnite-soft text-paper text-[13px] font-medium py-3 rounded-full transition flex items-center justify-center gap-2"
                >
                  <PhoneIcon />
                  <span>{safeCopy.primaryCta}</span>
                </button>
                <div className="flex gap-2">
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onWhatsapp}
                    className="flex-1 border border-mist hover:border-midnite text-ink hover:text-midnite text-[12.5px] py-2.5 rounded-full transition flex items-center justify-center gap-1.5"
                  >
                    <WaIcon />
                    <span>WhatsApp {botOrg || 'ons'}</span>
                  </a>
                  <a
                    href={phoneLink}
                    onClick={onPhone}
                    className="flex-1 border border-mist hover:border-midnite text-ink hover:text-midnite text-[12.5px] py-2.5 rounded-full transition flex items-center justify-center"
                  >
                    {phoneTextDisplay || 'Bel zelf'}
                  </a>
                </div>
                <button
                  onClick={onMoreInfo}
                  className="w-full text-[11.5px] text-ink-mute hover:text-ink-soft py-1.5 transition"
                >
                  Liever zelf eerst meer info zoeken
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 06-validatie. Identiek aan App.jsx::isValidPhoneText. Bewust gedupliceerd
// zodat de card geen App-internals importeert.
function isValidPhoneText(text) {
  const stripped = (text || '').replace(/[\s-]/g, '')
  return /^(?:\+316\d{8}|316\d{8}|06\d{8})$/.test(stripped)
}

// Format normalized telefoon naar leesbare 06-vorm met spaties.
function formatPhone(phone) {
  if (!phone) return ''
  const stripped = String(phone).replace(/\D/g, '')
  let normalized = stripped
  if (normalized.startsWith('316')) normalized = '0' + normalized.slice(2)
  if (normalized.length !== 10 || !normalized.startsWith('06')) return String(phone)
  return `${normalized.slice(0, 2)} ${normalized.slice(2, 4)} ${normalized.slice(4, 6)} ${normalized.slice(6, 8)} ${normalized.slice(8, 10)}`
}

function Chevron({ open }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.71 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.71A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function WaIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"/>
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}
