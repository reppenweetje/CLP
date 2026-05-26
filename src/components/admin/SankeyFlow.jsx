import { useMemo, useState } from 'react'
import { ResponsiveSankey } from '@nivo/sankey'
import { buildSankey } from '../../lib/analytics.js'

// Sankey flow diagram — toont de werkelijke gebruikersroute door de chat,
// inclusief vertakkingen op persona-keuze en brochure-ja/nee. Banden zijn
// breder naarmate meer mensen die transitie maakten. Doel: in één blik
// zien WAAR mensen het pad verlaten en WAAROM hun pad zo afwijkt.
export default function SankeyFlow({ sessions }) {
  // Default OFF: persona-splits 4-vouden de nodes en maken het diagram
  // bij <100 sessies onleesbaar. Persona-breakdown staat al apart in de
  // PersonaBreakdown-sectie; gebruiker kan hier opt-in als 'ie het patroon
  // wil zien.
  const [branchOnPersona, setBranchOnPersona] = useState(false)
  const data = useMemo(
    () => buildSankey(sessions, { branchOnPersona }),
    [sessions, branchOnPersona],
  )

  const hasData = data.links.length > 0

  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5 col-span-full">
      <header className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">Gebruikersroute</div>
          <h2 className="text-[15px] font-semibold text-ink">Sankey-stroom door de chat</h2>
          <p className="text-[13px] text-ink-soft leading-relaxed mt-1">
            Bredere banden = meer mensen die dit pad volgden. Hover voor exacte aantallen.
          </p>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink-soft cursor-pointer select-none">
          <input
            type="checkbox"
            checked={branchOnPersona}
            onChange={(e) => setBranchOnPersona(e.target.checked)}
            className="accent-midnite"
          />
          Splits op persona
        </label>
      </header>
      {hasData ? (
        <div style={{ height: 460 }}>
          <ResponsiveSankey
            data={data}
            margin={{ top: 12, right: 240, bottom: 12, left: 12 }}
            align="justify"
            colors={(node) => node.nodeColor || '#1b1b8a'}
            nodeOpacity={0.95}
            nodeHoverOpacity={1}
            nodeThickness={14}
            nodeSpacing={32}
            nodeBorderWidth={0}
            nodeInnerPadding={2}
            linkOpacity={0.45}
            linkHoverOpacity={0.75}
            linkContract={2}
            enableLinkGradient
            labelPosition="outside"
            labelOrientation="horizontal"
            labelPadding={10}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1.5]] }}
            theme={{
              fontFamily: 'Montserrat, system-ui, -apple-system, sans-serif',
              fontSize: 11,
              text: { fontSize: 11, fill: '#1d1d1f' },
              tooltip: {
                container: {
                  background: '#ffffff',
                  color: '#1d1d1f',
                  fontSize: 12,
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(15,15,112,0.12)',
                  padding: '8px 12px',
                },
              },
            }}
          />
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-mist-light bg-canvas px-6 py-10 text-center">
      <div className="text-[15px] font-semibold text-ink">Nog te weinig data om paden te tekenen</div>
      <div className="text-[13px] text-ink-soft mt-1.5 leading-relaxed max-w-md mx-auto">
        Zodra een paar bezoekers de flow doorlopen verschijnen hier de werkelijke routes met breedtes per pad.
      </div>
    </div>
  )
}
