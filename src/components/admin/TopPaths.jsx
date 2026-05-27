import { Fragment, useMemo } from 'react'
import { buildTopPaths } from '../../lib/analytics.js'

// Top routes — sales-actionable aanvulling op de Sankey.
// Links: welke paden voltooien het vaakst (kopieer deze copy/CTA-keuzes).
// Rechts: welke paden eindigen het vaakst in afhaak (hier moet je optimaliseren).
// Per pad: count, share-%, persona-mix.
//
// Bij voldoende data (paden ≥2 sessies) tonen we patronen; bij weinig data
// vallen we automatisch terug op alles inclusief 1-sessie paden zodat
// er altijd iets te zien is.
export default function TopPaths({ sessions }) {
  const data = useMemo(
    () => buildTopPaths(sessions, { limit: 5, minVolume: 2 }),
    [sessions],
  )
  const hasData = data.completed.length > 0 || data.abandoned.length > 0

  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5 col-span-full">
      <header className="mb-4 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">
            Sales-actie
          </div>
          <h2 className="text-[15px] font-semibold text-ink">Top routes</h2>
          <p className="text-[13px] text-ink-soft leading-relaxed mt-1">
            Welke paden komen het vaakst voor. Links wat werkt, rechts waar leads afhaken.
          </p>
        </div>
        {data.total > 0 && (
          <div className="text-[11.5px] text-ink-mute whitespace-nowrap">
            uit {data.total} sessie{data.total === 1 ? '' : 's'}
          </div>
        )}
      </header>

      {!hasData ? (
        <EmptyState />
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          <PathColumn
            title="Wat werkt"
            subtitle="Voltooide paden"
            icon="✓"
            tone="emerald"
            paths={data.completed}
            emptyMessage="Nog geen pad met voltooiing."
          />
          <PathColumn
            title="Waar lekt het"
            subtitle="Afhaak-paden"
            icon="⊥"
            tone="rose"
            paths={data.abandoned}
            emptyMessage="Nog geen afhaak-patroon."
          />
        </div>
      )}
    </section>
  )
}

function PathColumn({ title, subtitle, icon, tone, paths, emptyMessage }) {
  const chipCls =
    tone === 'emerald'
      ? 'text-emerald-800 border-emerald-200 bg-emerald-50'
      : 'text-rose-800 border-rose-200 bg-rose-50'
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span
          className={
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold ' +
            chipCls
          }
        >
          <span aria-hidden>{icon}</span>
          {title}
        </span>
        <span className="text-[11.5px] text-ink-mute">{subtitle}</span>
      </div>
      {paths.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist-light bg-canvas px-4 py-6 text-center text-[12.5px] text-ink-mute italic">
          {emptyMessage}
        </div>
      ) : (
        <ol className="space-y-2">
          {paths.map((p, i) => (
            <PathCard key={p.signature} path={p} rank={i + 1} tone={tone} />
          ))}
        </ol>
      )}
    </div>
  )
}

function PathCard({ path, rank, tone }) {
  const accent =
    tone === 'emerald'
      ? 'border-l-emerald-400/70'
      : 'border-l-rose-400/70'
  return (
    <li className={'rounded-xl border border-mist-light border-l-4 bg-canvas px-3.5 py-3 ' + accent}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[10.5px] text-ink-mute font-semibold tabular-nums">#{rank}</span>
          <span className="text-[18px] font-semibold text-ink tabular-nums leading-none">
            {path.count}
          </span>
          <span className="text-[11.5px] text-ink-soft">
            sessie{path.count === 1 ? '' : 's'}
          </span>
        </div>
        <span className="text-[11.5px] text-ink-mute tabular-nums shrink-0">
          {path.sharePercent.toFixed(0)}% v/d totaal
        </span>
      </div>
      <PathSteps steps={path.steps} />
      {path.personas.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-ink-mute">
          <span className="font-medium uppercase tracking-wider text-[9.5px] text-ink-mute">
            Persona:
          </span>
          {path.personas.slice(0, 4).map((p) => (
            <span key={p.key}>
              {p.label} <span className="font-semibold text-ink-soft">{p.count}</span>
            </span>
          ))}
        </div>
      )}
    </li>
  )
}

// Vlak ingedeelde keten van step-badges met arrows. Lange paden worden
// gecondenseerd: eerste 6 stappen + "+N tussenstappen" + laatste 2.
function PathSteps({ steps, maxVisible = 9 }) {
  const visible = useMemo(() => {
    if (steps.length <= maxVisible) return steps
    const headLen = Math.max(4, maxVisible - 3)
    const head = steps.slice(0, headLen)
    const tail = steps.slice(-2)
    const skipped = steps.length - head.length - tail.length
    return [...head, { label: `+${skipped} stappen`, kind: 'more' }, ...tail]
  }, [steps, maxVisible])

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
      {visible.map((s, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span className="text-ink-mute/70 select-none" aria-hidden>
              →
            </span>
          )}
          <StepBadge step={s} />
        </Fragment>
      ))}
    </div>
  )
}

function StepBadge({ step }) {
  const cls = {
    persona: 'bg-midnite/8 text-midnite border-midnite/15',
    choice:  'bg-blue-50 text-blue-800 border-blue-200',
    exit:    'bg-rose-50 text-rose-800 border-rose-200',
    done:    'bg-emerald-50 text-emerald-800 border-emerald-200',
    step:    'bg-canvas-2 text-ink-soft border-mist',
    more:    'bg-canvas-2 text-ink-mute border-mist italic',
  }[step.kind] || 'bg-canvas-2 text-ink-soft border-mist'
  return (
    <span className={'inline-flex items-center rounded-md border px-2 py-0.5 font-medium whitespace-nowrap ' + cls}>
      {step.label}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-mist-light bg-canvas px-6 py-10 text-center">
      <div className="text-[15px] font-semibold text-ink">Nog te weinig data voor patroon-analyse</div>
      <div className="text-[13px] text-ink-soft mt-1.5 leading-relaxed max-w-md mx-auto">
        Zodra meer bezoekers de flow doorlopen verschijnen hier de meest voorkomende routes.
      </div>
    </div>
  )
}
