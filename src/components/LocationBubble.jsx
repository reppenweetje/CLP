import { useState } from 'react'
import Avatar from './Avatar.jsx'
import { trackEvent } from '../lib/analytics.js'

// Locatie-bubble v2. Drie perspectieven via segment-control:
// bereikbaarheid (reistijden), omgeving (wat zit er), op de kaart (live embed).
// Reden voor segment-control ipv aparte bubbles: bezoeker wisselt makkelijk
// tussen perspectieven zonder de chat-flow te lengen, en het matcht de manier
// waarop iemand een locatie checkt voor bedrijfsvastgoed.
export default function LocationBubble({ location, projectName }) {
  const [tab, setTab] = useState('reach')

  const switchTab = (next) => {
    if (next === tab) return
    setTab(next)
    trackEvent('location:tab-switched', { tab: next })
  }

  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          {/* Hero: live Google Maps embed met automatische pin op de query-
              locatie. Vervangt de eerdere aerial-foto omdat de bezoeker bij
              een locatie-card vooral wíl weten waar het ligt — niet hoe het
              eruit ziet. Geen API key nodig: Google's gratis embed-endpoint.
              Lazy-loading zodat 'em pas laadt als de bubble in beeld komt. */}
          <div className="relative aspect-[16/9] bg-canvas-2 overflow-hidden">
            <iframe
              src={`https://maps.google.com/maps?q=${location.mapsQuery}&t=m&z=15&output=embed`}
              title={`Locatie ${location.address}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
              style={{ border: 0 }}
            />
          </div>
          <div className="p-4 pb-3">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">Locatie</div>
            <div className="text-[16px] font-semibold text-ink mt-1.5">{location.address}</div>
            <div className="text-[13.5px] text-ink-soft leading-relaxed mt-1">
              {projectName ? `${projectName} ligt op een gevestigde bedrijvenlocatie in Haarlem, in de Metropoolregio Amsterdam.` : 'Gevestigde bedrijvenlocatie in Haarlem, in de Metropoolregio Amsterdam.'}
            </div>
          </div>

          <div className="px-4">
            {/* Tabs zonder Kaart-optie — de hero IS al de kaart. Tabs voor
                inhoudelijke perspectieven (reistijden, omgeving). */}
            <SegmentControl
              value={tab}
              onChange={switchTab}
              options={[
                { id: 'reach',  label: 'Reistijden' },
                { id: 'around', label: 'Omgeving' },
              ]}
            />
          </div>

          <div className="p-4 pt-3">
            {tab === 'reach' && <ReachPanel travelTimes={location.travelTimes} />}
            {tab === 'around' && <SurroundingsPanel surroundings={location.surroundings} />}
            {/* Open in Google Maps onder de tabs — universele actie ongeacht
                welke tab actief is. Bezoeker kan vanaf hier route plannen of
                zelf inzoomen. */}
            {location.mapsLink && (
              <a
                href={location.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('location:maps-opened', {})}
                className="mt-3 flex items-center justify-center gap-2 text-[13.5px] text-midnite hover:text-midnite-soft border border-mist hover:border-midnite py-2.5 rounded-full transition"
              >
                <span>Open in Google Maps</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17 17 7" />
                  <path d="M8 7h9v9" />
                </svg>
              </a>
            )}
          </div>

          {location.scarcityNote && (
            <div className="mx-4 mb-4 rounded-2xl bg-canvas-2 border border-mist-light px-3.5 py-2.5">
              <div className="text-[11px] tracking-[0.16em] text-midnite uppercase font-medium mb-1">
                Waarom hier
              </div>
              <div className="text-[13.5px] text-ink leading-relaxed">{location.scarcityNote}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SegmentControl({ value, onChange, options }) {
  return (
    // Sterke visuele cue: pill-buttons met duidelijke borders zodat user
    // direct ziet dat 't klikbare tabs zijn (ipv platte tekst).
    <div className="rounded-full bg-canvas-2 border border-mist-light p-1 flex gap-0.5">
      {options.map((opt) => {
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            type="button"
            aria-pressed={active}
            className={
              'flex-1 text-[13.5px] py-2 px-2 rounded-full transition leading-none whitespace-nowrap ' +
              (active
                ? 'bg-paper text-midnite font-semibold shadow-sm border border-mist-light'
                : 'text-ink-soft hover:text-ink hover:bg-paper/60 border border-transparent')
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function ReachPanel({ travelTimes }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {travelTimes.map((t) => (
          <div
            key={t.to}
            className="rounded-xl bg-canvas-2 border border-mist-light px-3 py-2.5 flex items-baseline justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="text-[11px] tracking-wider text-ink-mute uppercase">
                {modeLabel(t.mode)}
              </div>
              <div className="text-[13.5px] text-ink truncate">{t.to}</div>
            </div>
            <div className="text-[15px] font-semibold text-ink shrink-0 tabular-nums">{t.value}</div>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-ink-mute leading-snug mt-3">
        Reistijden gemeten vanaf A. Hofmanweg buiten spits.
      </p>
    </div>
  )
}

function SurroundingsPanel({ surroundings = [] }) {
  return (
    <ul className="space-y-2">
      {surroundings.map((s, i) => (
        <li key={i} className="flex items-start gap-3 rounded-xl bg-canvas-2 border border-mist-light px-3 py-2.5">
          <div className="shrink-0 w-7 h-7 rounded-full bg-paper border border-mist-light flex items-center justify-center text-midnite">
            <SurroundingIcon name={s.icon} />
          </div>
          <span className="text-[13.5px] text-ink leading-relaxed pt-1">{s.text}</span>
        </li>
      ))}
    </ul>
  )
}

function modeLabel(mode) {
  switch (mode) {
    case 'car': return 'Auto'
    case 'bike': return 'Fiets'
    case 'walk': return 'Lopen'
    case 'transit': return 'OV'
    default: return ''
  }
}

function SurroundingIcon({ name }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'business':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <rect x="3" y="7" width="18" height="14" rx="1.5" />
          <path d="M9 7V4h6v3" />
          <path d="M3 13h18" />
        </svg>
      )
    case 'water':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <path d="M3 14c2.5-2 4.5-2 7 0s4.5 2 7 0 2.5-2 4 0" />
          <path d="M3 19c2.5-2 4.5-2 7 0s4.5 2 7 0 2.5-2 4 0" />
        </svg>
      )
    case 'home':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        </svg>
      )
    case 'parking':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 16V8h4a3 3 0 0 1 0 6H9" />
        </svg>
      )
    case 'lunch':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <path d="M5 4v8a3 3 0 0 0 3 3v6" />
          <path d="M9 4v6" />
          <path d="M13 4v6" />
          <path d="M17 4c0 4-2 6-2 8v9" />
        </svg>
      )
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      )
  }
}

