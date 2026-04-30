import Avatar from './Avatar.jsx'

// belegger voordelen met fiscale waarschuwing zoals brief vraagt
export default function InvestorBubble({ benefits, intro }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium">belegger voordelen</div>
            {intro && <div className="text-[14px] text-ink leading-relaxed mt-1.5">{intro}</div>}
            <ul className="mt-3 space-y-2">
              {benefits.map((b, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="text-midnite mt-0.5 text-[14px] leading-none">+</span>
                  <span className="text-[13px] text-ink leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-mist-light text-[11px] text-ink-mute leading-snug">
              bij zakelijk gebruik of belaste verhuur kunnen fiscale aandachtspunten relevant zijn laat je hierover goed adviseren door je eigen fiscalist
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
