import Avatar from './Avatar.jsx'

export default function BotMessage({ children, wide = false }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className={wide ? 'flex-1 min-w-0' : 'max-w-[84%] min-w-0'}>
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light px-4 py-3 text-[15px] leading-relaxed text-ink shadow-[0_1px_0_rgba(15,15,112,0.04)]">
          {children}
        </div>
      </div>
    </div>
  )
}
