import { DATE_RANGES } from '../../lib/analytics.js'

// Segmented-control voor het filteren van het admin dashboard
// op een tijdvenster. Reactief: bij wijziging muteert de parent
// state en alle visualisaties refilteren.
export default function DateRangePicker({ value, onChange }) {
  return (
    <div className="inline-flex items-center rounded-full border border-mist-light bg-paper p-0.5 text-[12px]">
      {DATE_RANGES.map((r) => {
        const active = value === r.id
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={
              'px-3 py-1.5 rounded-full transition whitespace-nowrap ' +
              (active
                ? 'bg-midnite text-paper shadow-sm'
                : 'text-ink-soft hover:text-ink')
            }
            aria-pressed={active}
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}
