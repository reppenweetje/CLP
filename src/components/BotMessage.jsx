import Avatar from './Avatar.jsx'

// Detecteert markdown-style links zoals [tekst](url) in een bot-zin en
// rendert ze als echte anchors. Andere markdown wordt bewust niet
// ondersteund: dit is een chat-stem, geen markdown-editor.
function renderInlineLinks(text) {
  if (typeof text !== 'string') return text
  const re = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts = []
  let lastIdx = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index))
    const isExternal = /^https?:\/\//i.test(m[2])
    parts.push(
      <a
        key={m.index}
        href={m[2]}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-midnite underline underline-offset-2 decoration-midnite/40 hover:decoration-midnite"
      >
        {m[1]}
      </a>
    )
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx))
  return parts.length > 0 ? parts : text
}

export default function BotMessage({ children, wide = false }) {
  const rendered = typeof children === 'string' ? renderInlineLinks(children) : children
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className={wide ? 'flex-1 min-w-0' : 'max-w-[84%] min-w-0'}>
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light px-4 py-3 text-[16px] leading-relaxed text-ink shadow-[0_1px_0_rgba(15,15,112,0.04)]">
          {rendered}
        </div>
      </div>
    </div>
  )
}
