import { useMemo } from 'react'
import { buildReferrerBreakdown } from '../../lib/analytics.js'

// Bron-effectiviteit per kanaal. Welke ads / referrers leveren niet alleen
// bezoeken maar ook leads op?
//
// Bron-classificatie: utm_source heeft voorrang (door advertiser ingesteld),
// referrer-host als fallback, "Direct" als geen referrer, "Geen tracking"
// voor sessies van vóór intro:viewed bestond.
//
// Per bron: bezoeken (absoluut + bar), CTA-rate, voltooid-rate, lead-rate,
// bounce. Met kleur-codering zodat hot/cold-bronnen direct opvallen.
export default function ReferrerBreakdown({ sessions }) {
  const rows = useMemo(() => buildReferrerBreakdown(sessions), [sessions])
  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-mist-light bg-paper p-5">
        <Header />
        <EmptyState />
      </section>
    )
  }

  const maxVisits = Math.max(...rows.map((r) => r.visits))
  const totals = rows.reduce(
    (acc, r) => ({
      visits: acc.visits + r.visits,
      ctaClicks: acc.ctaClicks + r.ctaClicks,
      bounces: acc.bounces + r.bounces,
      completions: acc.completions + r.completions,
      leads: acc.leads + r.leads,
    }),
    { visits: 0, ctaClicks: 0, bounces: 0, completions: 0, leads: 0 },
  )
  const totalCtaRate = totals.visits > 0 ? (totals.ctaClicks / totals.visits) * 100 : 0
  const totalLeadRate = totals.visits > 0 ? (totals.leads / totals.visits) * 100 : 0
  const totalBounceRate = totals.visits > 0 ? (totals.bounces / totals.visits) * 100 : 0
  const totalCompletionRate = totals.visits > 0 ? (totals.completions / totals.visits) * 100 : 0

  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5">
      <Header totals={totals} />

      <div className="-mx-2 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[10.5px] uppercase tracking-[0.14em] text-ink-soft font-semibold">
              <th className="px-2 py-2.5 font-semibold">Bron</th>
              <th className="px-2 py-2.5 font-semibold text-right">Bezoek</th>
              <th className="px-2 py-2.5 font-semibold text-right">CTA-rate</th>
              <th className="px-2 py-2.5 font-semibold text-right">Voltooi-rate</th>
              <th className="px-2 py-2.5 font-semibold text-right">Lead-rate</th>
              <th className="px-2 py-2.5 font-semibold text-right">Bounce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-light">
            {rows.map((r) => (
              <SourceRow key={r.source} row={r} maxVisits={maxVisits} />
            ))}
          </tbody>
          <tfoot className="border-t border-mist">
            <tr className="font-semibold text-ink">
              <td className="px-2 py-2.5">Totaal</td>
              <td className="px-2 py-2.5 text-right tabular-nums">{totals.visits}</td>
              <td className="px-2 py-2.5 text-right tabular-nums">
                {totalCtaRate.toFixed(0)}%
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">
                {totalCompletionRate.toFixed(0)}%
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">
                {totalLeadRate.toFixed(0)}%
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">
                {totalBounceRate.toFixed(0)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-[12px] text-ink-soft italic">
        Bron komt uit <code className="bg-canvas-2 px-1 rounded text-[11px]">utm_source</code> (advertiser) of
        de HTTP-referrer. "Geen tracking" = sessies van vóór deze meting live ging.
      </p>
    </section>
  )
}

function Header({ totals }) {
  return (
    <header className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
      <div>
        <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">
          Top of funnel
        </div>
        <h2 className="text-[15px] font-semibold text-ink">Bronnen — wat werkt per kanaal</h2>
        <p className="text-[13px] text-ink-soft leading-relaxed mt-1">
          Bezoeken per bron met klik-, voltooi-, lead- en bounce-rate. Klik-rate = % bezoekers dat
          de chat startte. Lead-rate = % dat z'n contact achterliet.
        </p>
      </div>
      {totals && totals.visits > 0 && (
        <div className="text-[12px] text-ink-soft tabular-nums whitespace-nowrap">
          {totals.visits} bezoek{totals.visits === 1 ? '' : 'en'}
        </div>
      )}
    </header>
  )
}

function SourceRow({ row, maxVisits }) {
  const visitsPct = maxVisits > 0 ? (row.visits / maxVisits) * 100 : 0
  return (
    <tr className="hover:bg-canvas-2/40 transition">
      <td className="px-2 py-2.5">
        <div className="font-medium text-ink">{row.source}</div>
        {(row.mediums.length > 0 || row.campaigns.length > 0) && (
          <div className="text-[11px] text-ink-soft mt-0.5 truncate max-w-[280px]">
            {row.mediums.slice(0, 2).join(' · ')}
            {row.mediums.length > 0 && row.campaigns.length > 0 && ' · '}
            {row.campaigns.slice(0, 2).join(' · ')}
          </div>
        )}
      </td>
      <td className="px-2 py-2.5 text-right">
        <div className="inline-flex items-baseline gap-2 justify-end">
          <span className="font-semibold tabular-nums text-ink">{row.visits}</span>
          <span
            className="inline-block h-1.5 bg-midnite/30 rounded-full"
            style={{ width: `${Math.max(8, visitsPct)}px` }}
            aria-hidden
          />
        </div>
      </td>
      <td className="px-2 py-2.5 text-right tabular-nums">
        <RateCell rate={row.ctaRate} count={row.ctaClicks} flavor="positive" />
      </td>
      <td className="px-2 py-2.5 text-right tabular-nums">
        <RateCell rate={row.completionRate} count={row.completions} flavor="positive" />
      </td>
      <td className="px-2 py-2.5 text-right tabular-nums">
        <RateCell rate={row.leadRate} count={row.leads} flavor="positive" highBar={5} medBar={2} />
      </td>
      <td className="px-2 py-2.5 text-right tabular-nums">
        <RateCell rate={row.bounceRate} count={row.bounces} flavor="negative" />
      </td>
    </tr>
  )
}

// Kleur-coding voor metric-cellen. Voor positive (cta/lead/voltooi) is hoog
// goed; voor negative (bounce) is hoog slecht.
function RateCell({ rate, count, flavor = 'positive', highBar = 40, medBar = 20 }) {
  let tone = 'text-ink-soft'
  if (flavor === 'positive') {
    if (rate >= highBar) tone = 'text-emerald-700 font-semibold'
    else if (rate >= medBar) tone = 'text-amber-700 font-medium'
    else if (rate > 0) tone = 'text-ink'
  } else {
    if (rate >= 60) tone = 'text-rose-700 font-semibold'
    else if (rate >= 40) tone = 'text-amber-700 font-medium'
    else tone = 'text-ink'
  }
  return (
    <span className={tone}>
      {rate.toFixed(0)}%
      <span className="ml-1 text-[11px] text-ink-soft font-normal">({count})</span>
    </span>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-mist-light bg-canvas px-6 py-8 text-center">
      <div className="text-[14px] font-semibold text-ink">Nog geen bron-data</div>
      <div className="text-[13px] text-ink-soft mt-1 leading-relaxed max-w-md mx-auto">
        Zodra er bezoeken binnen komen op de landing verschijnt hier de verdeling per kanaal.
        Gebruik <code className="bg-canvas-2 px-1 rounded">?utm_source=facebook</code> in je ad-links
        voor de meest nauwkeurige attributie.
      </div>
    </div>
  )
}
