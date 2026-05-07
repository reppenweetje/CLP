import Avatar from './Avatar.jsx'
import { getTimeContext, getCallbackPromise } from '../lib/buyingSignals.js'

// Persoonlijke nudge richting telefonisch contact. Wordt nu uitsluitend
// getoond op expliciete chip-keuze van de bezoeker, niet meer op een
// achtergrond-score-trigger. Copy wordt door App.jsx via buildHandoffCopy()
// opgebouwd uit project.personaCopy en als prop meegegeven.
//
// Layout-keuzes:
// - Tag is neutraal ("Kort overleg") in plaats van marketing-claim
// - Callback-belofte staat vooraf in een commitment-strip zodat de bezoeker
//   weet wat hij koopt voor hij klikt — geen verrassingen pas na klik
// - 4 gelijkwaardige opties: primair Bel, secundair WhatsApp + Bel zelf,
//   en tertiair "Ik kijk eerst zelf verder" als volwaardige knop ipv
//   matte tekstlink. Bezoeker voelt geen drempel om uit de bubble te stappen.
export default function WarmHandoffBubble({
  copy,
  salesTeam,
  hasPhone = false,
  waLink,
  phoneLink,
  phoneDisplay,
  onCallback,
  onWhatsapp,
  onPhone,
  onDismiss,
  outcome = null,
}) {
  const time = getTimeContext()
  const promise = getCallbackPromise(time)
  // repName niet meer gebruikt sinds rep == bot (zelfde Jesse). De
  // outcome-strip spreekt in eerste persoon ("Ik bel je terug") wat
  // natuurlijker leest dan "Jesse belt je terug" (Jesse spreekt nu).
  const botOrg = salesTeam?.bot?.org || ''
  const safeCopy = copy || { tag: 'Kort overleg', headline: '', body: '', value: [], primaryCta: 'Laat mij bellen' }

  const primaryDone = outcome === 'callback' || outcome === 'phone' || outcome === 'whatsapp'

  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="px-4 pt-3.5 pb-3 border-b border-mist-light bg-canvas-2/50">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">
              {safeCopy.tag}
            </div>
            <div className="text-[16px] font-semibold text-ink mt-1 leading-snug">
              {safeCopy.headline}
            </div>
          </div>
          <div className="px-4 py-3.5 space-y-3">
            <p className="text-[14.5px] text-ink leading-relaxed">{safeCopy.body}</p>

            {/* Commitment-strip: vertel vooraf wat de bezoeker krijgt als hij
                klikt. Zo heeft de "Bel me" CTA al een verwachting voor de klik
                ipv pas na de klik in een outcome-strip. */}
            <div className="rounded-xl bg-paper border border-mist-light px-3 py-2.5">
              <div className="text-[11px] tracking-[0.16em] text-ink-mute uppercase mb-1">
                Wat je krijgt
              </div>
              <div className="text-[13.5px] text-ink-soft leading-relaxed">
                Ik bel je {promise}, meestal een korte call van tien minuten. Geen verkoop­praatje, gewoon je vragen doornemen.
              </div>
            </div>

            {safeCopy.value && safeCopy.value.length > 0 && (
              <div className="rounded-xl bg-canvas-2 border border-mist-light px-3 py-2.5">
                <div className="text-[11px] tracking-[0.16em] text-ink-mute uppercase mb-1">
                  Wat we kort kunnen doornemen
                </div>
                <ul className="text-[13.5px] text-ink-soft leading-relaxed space-y-0.5">
                  {safeCopy.value.map((v) => (
                    <li key={v} className="flex gap-2">
                      <span className="text-midnite mt-1.5 shrink-0 w-1 h-1 rounded-full bg-midnite" />
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {outcome === 'callback' && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                <div className="text-[13.5px] text-emerald-900 leading-relaxed">
                  Genoteerd. Ik bel je {promise}.
                </div>
              </div>
            )}
            {outcome === 'whatsapp' && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                <div className="text-[13.5px] text-emerald-900 leading-relaxed">
                  WhatsApp opent in een nieuw venster.
                </div>
              </div>
            )}
            {outcome === 'dismissed' && (
              <div className="rounded-xl bg-canvas-2 border border-mist-light px-3 py-2.5">
                <div className="text-[13.5px] text-ink-soft leading-relaxed">
                  Geen probleem. Je kunt altijd terugkomen op deze stap.
                </div>
              </div>
            )}

            {!primaryDone && outcome !== 'dismissed' && (
              <div className="space-y-2 pt-1">
                <button
                  onClick={onCallback}
                  className="w-full bg-midnite hover:bg-midnite-soft text-paper text-[14px] font-medium py-3 rounded-full transition flex items-center justify-center gap-2"
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
                    className="flex-1 border border-mist hover:border-midnite text-ink hover:text-midnite text-[13.5px] py-2.5 rounded-full transition flex items-center justify-center gap-1.5"
                  >
                    <WaIcon />
                    <span>WhatsApp {botOrg || 'ons'}</span>
                  </a>
                  <a
                    href={phoneLink}
                    onClick={onPhone}
                    className="flex-1 border border-mist hover:border-midnite text-ink hover:text-midnite text-[13.5px] py-2.5 rounded-full transition flex items-center justify-center"
                  >
                    {phoneDisplay || 'Bel zelf'}
                  </a>
                </div>
                {/* Vierde, gelijkwaardige optie: bezoeker mag zonder drempel
                    terug naar zelf rondkijken. Voorheen was dit een matte
                    tekstlink — visueel 3 vs 1 — wat als drammerig aanvoelde. */}
                <button
                  onClick={onDismiss}
                  className="w-full border border-mist hover:border-midnite text-ink-soft hover:text-midnite text-[13.5px] py-2.5 rounded-full transition flex items-center justify-center"
                >
                  Ik kijk eerst zelf verder
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
