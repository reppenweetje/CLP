// Chips als suggested replies onderaan het scherm.
// Horizontale scroll bij veel opties zodat de chip-bar maar één rij hoog is en
// niet over het hele scherm uitsmeert. WhatsApp QuickReply patroon: belangrijke
// chips eerst, swipe voor meer.
export default function SuggestedChips({ options, onPick, hint }) {
  if (!options || options.length === 0) return null
  return (
    <div className="border-t border-mist-light bg-canvas/95 backdrop-blur-md pt-3 pb-3 shrink-0">
      {hint && (
        <div className="text-[11px] tracking-wider text-ink-mute uppercase mb-2 px-4">{hint}</div>
      )}
      <div
        className="flex gap-2 overflow-x-auto px-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onPick(opt)}
            className="shrink-0 rounded-full bg-paper border border-mist hover:border-midnite hover:bg-canvas-2 active:scale-[0.98] text-ink text-[13.5px] px-3.5 py-2 transition leading-snug whitespace-nowrap"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
