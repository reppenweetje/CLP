// Bot-avatar voor de chat. REPP merkmark op een midnite cirkel.
// Op klein formaat (28px) gebruiken we de centrale ruit; voor grotere
// formaten waar de breedte het toelaat kan de volledige drie-ruiten
// SVG worden ingezet.
export default function Avatar() {
  return (
    <div className="shrink-0 w-7 h-7 mt-0.5 rounded-full bg-midnite text-paper flex items-center justify-center">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" />
      </svg>
    </div>
  )
}
