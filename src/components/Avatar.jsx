// Bot-avatar voor de chat. Toont het officiele REPP merkmark
// (drie ruiten in wit) op een midnite cirkel. De SVG is wide-aspect
// dus we vullen de cirkel met flink padding bovenrand-onderrand.
export default function Avatar() {
  return (
    <div className="shrink-0 w-7 h-7 mt-0.5 rounded-full bg-midnite flex items-center justify-center">
      <img src="/images/repp-mark.svg" alt="" aria-hidden="true" className="w-[18px]" />
    </div>
  )
}
