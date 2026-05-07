// Progress segments. Twee varianten:
//  - 'compact' (default, oude gedrag): kleine dots met active in midnite
//  - 'bar': full-width segmented bar, gebruikt onder de header zodat de
//    titel-rij ademruimte krijgt en progress een visueel doorlopende
//    journey-marker wordt
export default function ProgressIndicator({ current, total, variant = 'compact' }) {
  if (!total) return null
  const label = `stap ${current} van ${total}`

  if (variant === 'bar') {
    return (
      <div className="flex items-center gap-1" aria-label={label} role="progressbar" aria-valuenow={current} aria-valuemax={total}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${
              i < current ? 'bg-midnite' : 'bg-mist-light'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5" aria-label={label}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i < current
        return (
          <span
            key={i}
            className={`h-1 rounded-full transition-all ${
              active ? 'w-4 bg-midnite' : 'w-1.5 bg-mist'
            }`}
          />
        )
      })}
    </div>
  )
}
