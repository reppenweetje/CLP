import Avatar from './Avatar.jsx'
import { project } from '../data/project.js'

// Laatste cta in de thread. Bel- en WhatsApp-knop voor directe actie,
// optioneel een brochure-link, een externe Hofman-portal link, en
// optioneel een mini-table-of-contents van al getoonde info-kaarten zodat
// de bezoeker direct terug kan naar relevante content zonder te scrollen.
//
// Props:
//  - portalUrl: string of null. Als gezet, derde pill-knop "Bekijk Hofman portal"
//  - seenTopics: array van { id, label, anchorId } voor de mini-TOC. Lege
//    array = TOC verbergen.
//  - onTopicJump: callback met topicId — App.jsx scrollt dan naar die bubble.
export default function CtaBubble({
  waLink,
  phoneLink,
  phoneDisplay,
  portalUrl,
  onBrochure,
  onReset,
  onWhatsapp,
  onPortalClick,
  summary,
  intro,
  seenTopics = [],
  onTopicJump,
}) {
  const showToc = Array.isArray(seenTopics) && seenTopics.length > 0 && typeof onTopicJump === 'function'

  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light p-4 space-y-3">
          {summary && (
            <div className="rounded-2xl bg-canvas-2 border border-mist-light p-3.5">
              <div className="text-[11px] tracking-[0.18em] text-ink-mute uppercase">Jouw interesse</div>
              <div className="text-[14px] text-ink leading-relaxed mt-1.5">{summary}</div>
            </div>
          )}
          {intro && (
            <div className="text-[14px] text-ink-soft leading-relaxed">{intro}</div>
          )}

          {/* Mini-TOC: tap een topic om terug te scrollen naar die bubble.
              Toont alleen wat de bezoeker zelf bekeken heeft. Maximum 6
              chips zodat de CTA-card niet te lang wordt op kleine schermen. */}
          {showToc && (
            <div className="rounded-2xl bg-canvas-2/60 border border-mist-light p-3">
              <div className="text-[11px] tracking-[0.18em] text-ink-mute uppercase mb-2">Even terugzien</div>
              <div className="flex flex-wrap gap-1.5">
                {seenTopics.slice(0, 6).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onTopicJump(t.id)}
                    className="rounded-full bg-paper border border-mist hover:border-midnite text-ink-soft hover:text-midnite text-[12.5px] px-3 py-1.5 transition leading-snug active:scale-[0.98]"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtle attribution: bezoeker kent op dit moment al de bot-stem
              ("Jesse van REPP") maar de CTA-card is het belangrijkste contact-
              moment. Hier maken we expliciet wie achter de knoppen staat. */}
          <div className="text-[12px] text-ink-mute leading-relaxed">
            REPP is verkopend makelaar van {project.displayName}.
          </div>
          {phoneLink && (
            <a
              href={phoneLink}
              className="block w-full text-center rounded-full bg-midnite text-paper font-semibold py-3.5 text-[15px] hover:bg-midnite-soft active:scale-[0.99] transition"
            >
              Bel direct{phoneDisplay ? ` ${phoneDisplay}` : ''}
            </a>
          )}
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              onClick={onWhatsapp}
              className="block w-full text-center rounded-full bg-neon text-midnite font-semibold py-3.5 text-[15px] hover:brightness-95 active:scale-[0.99] transition"
            >
              Open WhatsApp met REPP
            </a>
          )}
          {portalUrl && (
            // Portal-link: tertiaire actie. Visueel duidelijk minder gewicht
            // dan Bel/WhatsApp via paper-bg + midnite-border. Externe link met
            // pijl-icoon zodat de bezoeker weet dat 'ie de chat verlaat.
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onPortalClick}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-midnite/40 bg-paper text-midnite font-medium py-3.5 text-[15px] hover:bg-canvas-2 transition"
            >
              <span>Bekijk Hofman portal</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17 17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </a>
          )}
          {onBrochure && (
            <button
              type="button"
              onClick={onBrochure}
              className="block w-full text-center rounded-full border border-midnite/40 bg-paper text-midnite font-medium py-3.5 text-[15px] hover:bg-canvas-2 transition"
            >
              Bekijk brochure
            </button>
          )}
          {onReset && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && !window.confirm('Wil je opnieuw beginnen? Je antwoorden en gegevens worden gewist.')) {
                  return
                }
                onReset()
              }}
              className="block w-full text-[13px] text-ink-mute hover:text-ink py-2 text-center transition"
            >
              Start opnieuw
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
