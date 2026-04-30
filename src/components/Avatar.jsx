// kleine repp avatar voor bot messages drie ruiten icoon op midnite achtergrond
export default function Avatar() {
  return (
    <div className="shrink-0 w-7 h-7 mt-0.5 rounded-full bg-midnite text-paper flex items-center justify-center">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="9" width="6" height="6" transform="rotate(45 5 12)" stroke="currentColor" strokeWidth="1.7" />
        <rect x="9" y="9" width="6" height="6" transform="rotate(45 12 12)" fill="currentColor" />
        <rect x="16" y="9" width="6" height="6" transform="rotate(45 19 12)" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    </div>
  )
}
