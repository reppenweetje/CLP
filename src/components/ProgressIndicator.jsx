// subtiele dots midnite voor actief mist voor inactief
export default function ProgressIndicator({ current, total }) {
  if (!total) return null
  return (
    <div className="flex items-center gap-1.5" aria-label={`stap ${current} van ${total}`}>
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
