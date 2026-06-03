import { useState } from 'react'
import Avatar from './Avatar.jsx'
import MortgageCalc from './MortgageCalc.jsx'
import RentabilityCalc from './RentabilityCalc.jsx'
import { trackEvent } from '../lib/analytics.js'

// Situatietekening met units in N×M-grid volgens project.sitePlan.
// Status-kleuren matchen de officiele kopen.repp.nl plattegrond.
// Klik op een unit voor m² prijs en status detail.
// Project-specifieke labels (weg-naam, recreatie-blok, wijk-naam) komen
// uit sitePlan.cardinalLabels — zodat ééndere component meerdere projecten
// kan tonen.
export default function SitePlanBubble({ sitePlan, units, persona, onUnitView, onCalcInteract, onCredionRequest }) {
  const [selectedNumber, setSelectedNumber] = useState(null)
  // Verzamel alle units — werkt voor rows-layout (De Hofman) én sections-
  // layout (Paveri met L-vorm + sidebar). Lege arrays als beide ontbreken.
  const allUnits = [
    ...(sitePlan.rows?.flatMap((r) => r.units) || []),
    ...(sitePlan.sections?.flatMap((s) => s.units) || []),
    ...(sitePlan.sidebar?.units || []),
  ]
  const selected = allUnits.find((u) => u.number === selectedNumber)
  const selectedTypeData = selected ? units?.find((u) => u.type === selected.type) : null

  const stats = computeStats(allUnits)
  const totalUnits = allUnits.length

  // Aantal kolommen = breedste rij (alleen voor rows-layout). Inline style
  // ipv Tailwind class want Tailwind compileert grid-cols-N statisch.
  const maxCols = sitePlan.rows
    ? Math.max(...sitePlan.rows.map((r) => r.units.length))
    : 1

  // Orientatie-labels per project. Defaults zijn leeg (helemaal geen
  // weg/recreatie-strook getoond). Project zet wat 't wil tonen.
  const cardinal = sitePlan.cardinalLabels || {}
  const eastLabel = cardinal.east  // bv "A. Hofmanweg" of "Industrieweg"
  const eastAdjacent = cardinal.eastAdjacent  // optioneel: bv "Recreatie"
  const bottomLabel = cardinal.bottom  // bv "Waarderpolder" of "Assendelft Noord"

  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">situatietekening</div>
            <div className="text-[16px] font-semibold text-ink mt-1.5">{totalUnits} units in één oogopslag</div>
            <div className="text-[12px] text-ink-mute leading-snug mt-1">tik op een unit voor m² prijs en status</div>

            <div className="mt-3.5 flex items-center gap-3 text-[12px] text-ink-soft">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span><span className="font-semibold text-ink">{stats.available}</span> beschikbaar</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-300" />
                <span><span className="font-semibold text-ink">{stats.sold_ov}</span> verkocht ov</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span><span className="font-semibold text-ink">{stats.sold}</span> verkocht</span>
              </span>
            </div>

            <div className="mt-3 relative">
              <div className="rounded-2xl bg-canvas-2 border border-mist-light p-3 flex gap-2 items-stretch">
                <div className="flex-1 min-w-0">
                  {sitePlan.sections ? (
                    // Sections-layout (Paveri-style): meerdere grids verticaal
                    // gestapeld voor de hoofd-blokken. Bv. top-rij type C, daar-
                    // onder bottom-rij type D met verschillende kolom-counts.
                    sitePlan.sections.map((section, si) => (
                      <div
                        key={si}
                        className={`grid gap-1 ${si > 0 ? 'mt-1' : ''}`}
                        style={{ gridTemplateColumns: `repeat(${section.cols}, minmax(0, 1fr))` }}
                      >
                        {section.units.map((u) => renderUnit(u, selectedNumber, setSelectedNumber, onUnitView, section.aspect))}
                      </div>
                    ))
                  ) : (
                    // Rows-layout (De Hofman-style): uniforme grid per rij.
                    sitePlan.rows.map((row, ri) => (
                      <div
                        key={ri}
                        className={`grid gap-1 ${ri === 0 ? 'mb-1' : ''}`}
                        style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
                      >
                        {row.units.map((u) => renderUnit(u, selectedNumber, setSelectedNumber, onUnitView))}
                      </div>
                    ))
                  )}
                </div>
                {/* Sidebar-kolom rechts (Paveri-style): vertikaal gestapelde
                    units die naast de hoofd-grid staan. Bv. Type A/B units met
                    aspect-ratio 'wide' (langer dan hoog). */}
                {sitePlan.sidebar && (
                  <div className="shrink-0 w-[28%]">
                    <div
                      className="grid gap-1 h-full"
                      style={{ gridTemplateRows: `repeat(${sitePlan.sidebar.units.length}, minmax(0, 1fr))` }}
                    >
                      {sitePlan.sidebar.units.map((u) => renderUnit(u, selectedNumber, setSelectedNumber, onUnitView, sitePlan.sidebar.aspect))}
                    </div>
                  </div>
                )}
                {/* Orientatie-strook rechts — alleen tonen als project er een
                    label voor levert via sitePlan.cardinalLabels.east. */}
                {(eastLabel || eastAdjacent) && (
                  <div className="shrink-0 flex gap-1">
                    {eastLabel && (
                      <div className="w-3 relative flex items-center justify-center">
                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-mist" aria-hidden />
                        <span
                          className="relative text-[7px] tracking-[0.2em] text-ink-mute uppercase whitespace-nowrap"
                          style={{ writingMode: 'vertical-rl' }}
                        >
                          {eastLabel}
                        </span>
                      </div>
                    )}
                    {eastAdjacent && (
                      <div className="w-3 relative flex items-center justify-center bg-emerald-50/70 rounded-sm">
                        <span
                          className="text-[7px] tracking-[0.2em] text-emerald-700/80 uppercase whitespace-nowrap"
                          style={{ writingMode: 'vertical-rl' }}
                        >
                          {eastAdjacent}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {bottomLabel && (
                <div className="text-[9px] tracking-[0.22em] text-ink-mute uppercase mt-1.5 text-center">{bottomLabel}</div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {sitePlan.legend.map((l) => (
                <div key={l.state} className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                  <span className={`w-3 h-3 rounded-sm border ${dotClasses(l.state)}`} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>

            {selected && selectedTypeData && (
              <UnitDetail unit={selected} typeData={selectedTypeData} persona={persona} onCalcInteract={onCalcInteract} onCredionRequest={onCredionRequest} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Unit-button renderer — gedeeld door rows-, sections- en sidebar-layouts.
// aspect default = portrait '3/4' (voor Type C, D, L, XL). Voor Type A/B
// in een sidebar gebruik je 'landscape' = '5/3' om de bredere ratio te
// matchen met de werkelijke gevel-indeling.
function renderUnit(u, selectedNumber, setSelectedNumber, onUnitView, aspect) {
  const isSel = selectedNumber === u.number
  const aspectClass =
    aspect === 'landscape' ? 'aspect-[5/3]' :
    aspect === 'square' ? 'aspect-square' :
    'aspect-[3/4]'
  return (
    <button
      key={u.number}
      onClick={() => {
        const next = isSel ? null : u.number
        setSelectedNumber(next)
        if (next !== null) {
          trackEvent('unit:detail-opened', { number: u.number, type: u.type, state: u.state })
          if (onUnitView) onUnitView({ number: u.number, type: u.type, state: u.state })
        }
      }}
      className={`relative ${aspectClass} rounded-md border transition active:scale-95 ${stateClasses(u.state)} ${
        isSel ? 'ring-2 ring-midnite ring-offset-2 ring-offset-canvas-2' : ''
      }`}
      title={`unit ${u.number} ${u.type.toLowerCase()}`}
    >
      <span className="absolute top-1 left-1.5 text-[9px] tracking-wider font-medium opacity-70">
        {u.type.toLowerCase()}
      </span>
      <span className="absolute inset-0 flex items-center justify-center text-[14px] font-semibold">
        {u.number}
      </span>
    </button>
  )
}

function UnitDetail({ unit, typeData, persona, onCalcInteract, onCredionRequest }) {
  // Beleggers en mensen die als beide kijken zien een rendement-indicator.
  // Eigen gebruikers en onbekend zien een maandlast-calculator.
  const showRentability = persona === 'belegger' || persona === 'beide'
  return (
    <div className="mt-4 rounded-2xl bg-canvas-2 border border-mist-light overflow-hidden fade-up">
      <div className="px-4 py-3 flex items-baseline justify-between gap-3 border-b border-mist-light">
        <div>
          <div className="text-[11px] tracking-widest uppercase text-ink-mute">unit nummer</div>
          <div className="text-[20px] font-semibold text-ink leading-tight">{unit.number}</div>
        </div>
        <div className={`text-[12px] uppercase tracking-wider font-medium px-2.5 py-1 rounded-full ${pillClasses(unit.state)}`}>
          {stateLabel(unit.state)}
        </div>
      </div>
      <div className="px-4 py-3 grid grid-cols-2 gap-3">
        <DetailItem label="type" value={`Unit ${unit.type.toLowerCase()}`} />
        <DetailItem label="oppervlakte" value={`≈ ${typeData.size} m²`} />
        <DetailItem label="bouwlagen" value={`${typeData.levels} laags`} />
        {typeData.parking !== undefined && (
          <DetailItem label="parkeren" value={`${typeData.parking} ${typeData.parking === 1 ? 'plaats' : 'plaatsen'}`} />
        )}
        {typeData.priceFrom && (
          <DetailItem
            label={unit.state === 'coming_soon' ? 'prijs indicatief' : 'prijs excl btw'}
            value={`€${formatThousands(typeData.priceFrom)}`}
            highlight
          />
        )}
      </div>
      {typeData.priceFrom && typeData.pricePerM2 && (
        <div className="px-4 pb-3 text-[12px] text-ink-mute leading-relaxed">
          {`circa €${typeData.pricePerM2.toLocaleString('nl-NL')} per m² ${unit.state === 'coming_soon' ? 'indicatief' : 'v o n excl btw'}`}
        </div>
      )}
      {typeData.priceFrom && unit.state !== 'sold' && (
        <div className="px-4 pb-4">
          {showRentability ? (
            <RentabilityCalc
              price={typeData.priceFrom}
              size={typeData.size}
              indicative={unit.state === 'coming_soon'}
              onInteract={() => onCalcInteract && onCalcInteract('rentability')}
              onCredionRequest={onCredionRequest}
            />
          ) : (
            <MortgageCalc
              price={typeData.priceFrom}
              indicative={unit.state === 'coming_soon'}
              onInteract={() => onCalcInteract && onCalcInteract('mortgage')}
              onCredionRequest={onCredionRequest}
            />
          )}
        </div>
      )}
    </div>
  )
}

function DetailItem({ label, value, highlight }) {
  return (
    <div>
      <div className="text-[11px] tracking-widest uppercase text-ink-mute">{label}</div>
      <div className={`mt-0.5 leading-tight ${highlight ? 'text-[16px] font-semibold text-ink' : 'text-[14px] font-medium text-ink'}`}>
        {value}
      </div>
    </div>
  )
}

function computeStats(units) {
  return units.reduce(
    (acc, u) => {
      acc[u.state] = (acc[u.state] || 0) + 1
      return acc
    },
    { available: 0, sold_ov: 0, sold: 0, coming_soon: 0, reserved: 0 },
  )
}

function formatThousands(n) {
  return n.toLocaleString('nl-NL')
}

function stateClasses(state) {
  switch (state) {
    case 'available':
      return 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
    case 'reserved':
      return 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
    case 'sold_ov':
      return 'bg-orange-50 border-orange-300 text-orange-900 hover:bg-orange-100'
    case 'sold':
      // Rose ipv mist-grey: sold-units springen meer in het oog wat de
      // schaarste benadrukt. Bewust rose ipv vol-red zodat het bij REPP's
      // professionele toon past en geen alarm-associatie geeft. Geen
      // opacity-60 meer want die zou de rode kleur uitspoelen.
      return 'bg-rose-50 border-rose-300 text-rose-900'
    case 'coming_soon':
      return 'bg-paper border-mist text-ink-soft border-dashed'
    default:
      return 'bg-paper border-mist text-ink-soft'
  }
}

function dotClasses(state) {
  switch (state) {
    case 'available': return 'bg-emerald-300 border-emerald-400'
    case 'reserved': return 'bg-amber-300 border-amber-400'
    case 'sold_ov': return 'bg-orange-300 border-orange-400'
    case 'sold': return 'bg-rose-300 border-rose-400'
    case 'coming_soon': return 'bg-paper border-dashed border-mist'
    default: return 'bg-mist border-mist'
  }
}

function pillClasses(state) {
  switch (state) {
    case 'available': return 'bg-emerald-100 text-emerald-900'
    case 'reserved': return 'bg-amber-100 text-amber-900'
    case 'sold_ov': return 'bg-orange-100 text-orange-900'
    case 'sold': return 'bg-rose-100 text-rose-900'
    case 'coming_soon': return 'bg-paper text-ink-soft border border-dashed border-mist'
    default: return 'bg-mist-light text-ink-soft'
  }
}

function stateLabel(state) {
  switch (state) {
    case 'available': return 'beschikbaar'
    case 'reserved': return 'gereserveerd'
    case 'sold_ov': return 'verkocht ov'
    case 'sold': return 'verkocht'
    case 'coming_soon': return 'later in verkoop'
    default: return ''
  }
}
