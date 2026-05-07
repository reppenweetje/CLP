import Avatar from './Avatar.jsx'

// 6 stappen aankoopproces verticaal compact met cijfers
export default function ProcessBubble({ steps }) {
  return (
    <div className="flex gap-2.5 items-start fade-up">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="rounded-3xl rounded-tl-md bg-paper border border-mist-light overflow-hidden">
          <div className="p-4">
            <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium">aankoopproces</div>
            <div className="text-[16px] font-semibold text-ink mt-1.5">van oriëntatie tot sleutel</div>
            <div className="mt-3 space-y-2">
              {steps.map((s, i) => (
                <div key={s.step} className="flex gap-3">
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-midnite text-paper flex items-center justify-center text-[13px] font-semibold">
                      {s.step}
                    </div>
                    {i < steps.length - 1 && <div className="w-px flex-1 bg-mist mt-1" />}
                  </div>
                  <div className="pb-2 -mt-0.5">
                    <div className="text-[14px] font-semibold text-ink leading-tight">{s.title}</div>
                    <div className="text-[13px] text-ink-soft leading-snug mt-0.5">{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
