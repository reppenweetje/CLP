import Avatar from './Avatar.jsx'

export default function TypingIndicator() {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-ink-mute" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-ink-mute" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-ink-mute" />
        </div>
      </div>
    </div>
  )
}
