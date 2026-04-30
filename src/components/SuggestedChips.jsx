// chips als suggested replies onderaan het scherm
// klikken op een chip stuurt een user message en triggert next step
export default function SuggestedChips({ options, onPick, hint }) {
  if (!options || options.length === 0) return null
  return (
    <div className="border-t border-mist-light bg-canvas/95 backdrop-blur-md px-4 pt-3 pb-4 sticky bottom-0">
      {hint && (
        <div className="text-[11px] tracking-wider text-ink-mute uppercase mb-2">{hint}</div>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onPick(opt)}
            className="rounded-full bg-paper border border-mist hover:border-midnite hover:bg-canvas-2 active:scale-[0.98] text-ink text-[14px] px-4 py-2.5 transition leading-snug"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
