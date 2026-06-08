import { useState } from 'react'
import Avatar from './Avatar.jsx'
import MortgageCalc from './MortgageCalc.jsx'
import RentabilityCalc from './RentabilityCalc.jsx'
import { trackEvent } from '../lib/analytics.js'

// Situatietekening voor projecten met een onregelmatige plattegrond. In plaats
// van het grid-schema van SitePlanBubble tekent deze component elke unit als
// een echte <rect> of <polygon> op exacte coordinaten uit project.sitePlan.svg.
// Dat geeft de plattegrond 1-op-1 de juiste vorm (trapezoids, parallellogram,
// L-vormen) waar het grid-schema dat niet kan.
//
// project.sitePlan.svg-shape:
//   { viewBox: '0 0 W H',
//     background: 'x,y x,y ...',   // optioneel terrein-omtrek
//     units: [{ number, type, state, size, price?, bgM2?, verdM2?,
//               rect:{x,y,w,h} | polygon:'x,y x,y ...' }] }
//
// Per-unit size/price staat in svg.units zelf (anders dan SitePlanBubble dat
// op type-niveau leest). De type-level `units`-array wordt alleen gebruikt om
// de detail-weergave te verrijken (parkeren, bouwlagen).
export default function SitePlanPolygonBubble({ sitePlan, units, persona, onUnitView, onCalcInteract, onCredionRequest }) {
  const [selectedNumber, setSelectedNumber] = useState(null)
  const svg = sitePlan.svg || {}
  const svgUnits = svg.units || []
  const selected = svgUnits.find((u) => u.number === selectedNumber)
  const selectedTypeData = selected ? units?.find((u) => u.type === selected.type) : null

  const stats = computeStats(svgUnits)
  const totalUnits = svgUnits.length

  const cardinal = sitePlan.cardinalLabels || {}
  const bottomLabel = cardinal.bottom

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
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span><span className="font-semibold text-ink">{stats.sold}</span> verkocht</span>
              </span>
            </div>

            <div className="mt-3 relative">
              <div className="rounded-2xl bg-canvas-2 border border-mist-light p-3">
                <svg
                  viewBox={svg.viewBox || '0 0 1497.8 897.9'}
                  className="w-full h-auto block"
                  preserveAspectRatio="xMidYMid meet"
                  role="group"
                  aria-label="Situatietekening units"
                >
                  {svg.background && (
                    <polygon
                      points={svg.background}
                      fill="#efeee8"
                      stroke="#d8d6d6"
                      strokeWidth="2"
                    />
                  )}
                  {svgUnits.map((u) => {
                    const isSel = selectedNumber === u.number
                    const c = svgColors(u.state)
                    const center = unitCenter(u)
                    const common = {
                      fill: c.fill,
                      stroke: isSel ? '#0f0f70' : c.stroke,
                      strokeWidth: isSel ? 6 : 2,
                      style: { cursor: 'pointer', transition: 'fill 120ms ease' },
                      onClick: () => {
                        const next = isSel ? null : u.number
                        setSelectedNumber(next)
                        if (next !== null) {
                          trackEvent('unit:detail-opened', { number: u.number, type: u.type, state: u.state })
                          if (onUnitView) onUnitView({ number: u.number, type: u.type, state: u.state })
                        }
                      },
                    }
                    return (
                      <g key={u.number}>
                        {u.rect ? (
                          <rect x={u.rect.x} y={u.rect.y} width={u.rect.w} height={u.rect.h} {...common} />
                        ) : (
                          <polygon points={u.polygon} {...common} />
                        )}
                        <text
                          x={center.x}
                          y={center.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="34"
                          fontWeight="600"
                          fill={c.text}
                          style={{ pointerEvents: 'none' }}
                        >
                          {u.number}
                        </text>
                        <text
                          x={center.x}
                          y={center.y + 30}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="18"
                          fill={c.text}
                          opacity="0.7"
                          style={{ pointerEvents: 'none' }}
                        >
                          {u.type.toLowerCase()}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
              {bottomLabel && (
                <div className="text-[9px] tracking-[0.22em] text-ink-mute uppercase mt-1.5 text-center">{bottomLabel}</div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {(sitePlan.legend || []).map((l) => (
                <div key={l.state} className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                  <span className={`w-3 h-3 rounded-sm border ${dotClasses(l.state)}`} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>

            {selected && (
              <UnitDetail
                unit={selected}
                typeData={selectedTypeData}
                persona={persona}
                onCalcInteract={onCalcInteract}
                onCredionRequest={onCredionRequest}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Centroid voor label-plaatsing. Rect = geometrisch midden, polygon = simpel
// gemiddelde van de punten (goed genoeg voor deze convexe/L-vormen).
function unitCenter(u) {
  if (u.rect) {
    return { x: u.rect.x + u.rect.w / 2, y: u.rect.y + u.rect.h / 2 }
  }
  const pts = (u.polygon || '').trim().split(/\s+/).map((p) => p.split(',').map(Number))
  if (pts.length === 0) return { x: 0, y: 0 }
  const sum = pts.reduce((acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }), { x: 0, y: 0 })
  return { x: sum.x / pts.length, y: sum.y / pts.length }
}

function UnitDetail({ unit, typeData, persona, onCalcInteract, onCredionRequest }) {
  const showRentability = persona === 'belegger' || persona === 'beide'
  const isSold = unit.state === 'sold'
  const hasVerdieping = unit.bgM2 && unit.verdM2
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
        {unit.size !== undefined && <DetailItem label="oppervlakte" value={`≈ ${unit.size} m²`} />}
        {hasVerdieping && <DetailItem label="begane grond" value={`≈ ${unit.bgM2} m²`} />}
        {hasVerdieping && <DetailItem label="verdieping" value={`≈ ${unit.verdM2} m²`} />}
        {typeData?.parking !== undefined && (
          <DetailItem label="parkeren" value={`${typeData.parking} ${typeData.parking === 1 ? 'plaats' : 'plaatsen'}`} />
        )}
        {!isSold && unit.price && (
          <DetailItem label="prijs excl btw" value={`€${formatThousands(unit.price)}`} highlight />
        )}
      </div>
      {!isSold && unit.price && unit.size && (
        <div className="px-4 pb-3 text-[12px] text-ink-mute leading-relaxed">
          {`circa €${Math.round(unit.price / unit.size).toLocaleString('nl-NL')} per m² v o n excl btw`}
        </div>
      )}
      {!isSold && unit.price && unit.size && (
        <div className="px-4 pb-4">
          {showRentability ? (
            <RentabilityCalc
              price={unit.price}
              size={unit.size}
              onInteract={() => onCalcInteract && onCalcInteract('rentability')}
              onCredionRequest={onCredionRequest}
            />
          ) : (
            <MortgageCalc
              price={unit.price}
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
    { available: 0, sold: 0 },
  )
}

function formatThousands(n) {
  return n.toLocaleString('nl-NL')
}

// SVG fill/stroke/text per state — afgeleid van de Tailwind-kleuren in
// SitePlanBubble zodat beide plattegrond-varianten dezelfde taal spreken.
function svgColors(state) {
  switch (state) {
    case 'available':
      return { fill: '#ecfdf5', stroke: '#6ee7b7', text: '#064e3b' }
    case 'reserved':
      return { fill: '#fffbeb', stroke: '#fcd34d', text: '#78350f' }
    case 'sold_ov':
      return { fill: '#fff7ed', stroke: '#fdba74', text: '#7c2d12' }
    case 'sold':
      return { fill: '#fff1f2', stroke: '#fda4af', text: '#881337' }
    default:
      return { fill: '#ffffff', stroke: '#d8d6d6', text: '#6b6a66' }
  }
}

function dotClasses(state) {
  switch (state) {
    case 'available': return 'bg-emerald-300 border-emerald-400'
    case 'reserved': return 'bg-amber-300 border-amber-400'
    case 'sold_ov': return 'bg-orange-300 border-orange-400'
    case 'sold': return 'bg-rose-300 border-rose-400'
    default: return 'bg-mist border-mist'
  }
}

function pillClasses(state) {
  switch (state) {
    case 'available': return 'bg-emerald-100 text-emerald-900'
    case 'reserved': return 'bg-amber-100 text-amber-900'
    case 'sold_ov': return 'bg-orange-100 text-orange-900'
    case 'sold': return 'bg-rose-100 text-rose-900'
    default: return 'bg-mist-light text-ink-soft'
  }
}

function stateLabel(state) {
  switch (state) {
    case 'available': return 'beschikbaar'
    case 'reserved': return 'gereserveerd'
    case 'sold_ov': return 'verkocht ov'
    case 'sold': return 'verkocht'
    default: return ''
  }
}
