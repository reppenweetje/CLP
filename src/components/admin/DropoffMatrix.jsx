import { useMemo } from 'react'
import { buildDropoffMatrix } from '../../lib/analytics.js'

// Heatmap-style matrix: persona × laatste-stap-voor-vertrek.
// Color-intensiteit = aandeel van die persona's drop-offs op die stap.
// Insight: "beleggers haken 43% af bij brochure-trigger, eigen-gebruikers slechts 11%"
// → drives copy/UX iteratie precies daar waar het pijn doet.
export default function DropoffMatrix({ sessions }) {
  const data = useMemo(() => buildDropoffMatrix(sessions), [sessions])

  const hasData = data.cells.some((c) => c.count > 0)

  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5 col-span-full">
      <header className="mb-4">
        <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">Drop-off matrix</div>
        <h2 className="text-[15px] font-semibold text-ink">Waar haakt welke persona af?</h2>
        <p className="text-[13px] text-ink-soft leading-relaxed mt-1">
          Donkerder = grotere relatieve afhaak voor die persona. Identificeer welke stap voor welk segment de bottleneck is.
        </p>
      </header>
      {!hasData ? (
        <div className="rounded-xl border border-dashed border-mist-light bg-canvas px-6 py-8 text-center text-[14px] text-ink-soft">
          Nog geen drop-offs om te tonen — of iedereen voltooit netjes.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11px] tracking-[0.16em] uppercase text-ink-mute font-medium pb-2 pr-3">Persona</th>
                {data.steps.map((step) => (
                  <th key={step.id} className="text-center text-[11px] tracking-[0.16em] uppercase text-ink-mute font-medium pb-2 px-1.5 whitespace-nowrap min-w-[80px]">
                    {step.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.personas.map((persona) => (
                <tr key={persona.id}>
                  <td className="text-[13px] text-ink py-1.5 pr-3">
                    <div className="font-medium">{persona.label}</div>
                    <div className="text-[11px] text-ink-mute tabular-nums">{persona.total} verlaten</div>
                  </td>
                  {data.steps.map((step) => {
                    const cell = data.cells.find((c) => c.persona === persona.id && c.step === step.id)
                    return (
                      <td key={step.id} className="px-1 py-1">
                        <Cell count={cell?.count || 0} percentage={cell?.percentage || 0} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Cell({ count, percentage }) {
  // Kleur-schaal: midnite blauw met opacity 0.05 → 0.85 op basis van %
  const opacity = count === 0 ? 0 : Math.max(0.08, Math.min(0.85, percentage * 1.4))
  const textTone = opacity > 0.45 ? 'text-paper' : 'text-ink'
  return (
    <div
      className={'rounded-md text-center py-2 px-1.5 transition-colors ' + textTone}
      style={{ background: count === 0 ? 'transparent' : `rgba(15,15,112,${opacity})` }}
      title={`${count} sessies (${(percentage * 100).toFixed(0)}%)`}
    >
      <div className="text-[13.5px] font-semibold tabular-nums leading-none">{count || '·'}</div>
      {count > 0 && (
        <div className="text-[9.5px] tabular-nums opacity-80 mt-0.5">{(percentage * 100).toFixed(0)}%</div>
      )}
    </div>
  )
}
