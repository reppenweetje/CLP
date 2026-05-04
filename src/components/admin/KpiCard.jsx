// Stat tile voor de top van het admin dashboard.
export default function KpiCard({ label, value, subtext, accent }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-midnite/30 bg-midnite/[0.04]' : 'border-mist-light bg-paper'}`}>
      <div className="text-[10px] tracking-[0.18em] text-ink-mute uppercase font-medium">{label}</div>
      <div className="text-[28px] font-semibold text-ink mt-1.5 leading-none tabular-nums">{value}</div>
      {subtext && <div className="text-[11px] text-ink-soft mt-1.5 leading-snug">{subtext}</div>}
    </div>
  )
}
