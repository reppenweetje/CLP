// Bot-avatar voor de chat. Toont de REPP-mark op een midnite cirkel,
// hetzelfde patroon als het logo in de header zodat de chat consistent
// gebrand blijft. Naam van de bot-persona zit in de begroetings-bubble
// ("Hoi, ik ben Jesse van REPP."), de avatar zelf hoeft 'em niet te
// herhalen.
export default function Avatar() {
  return (
    <div
      className="shrink-0 w-7 h-7 mt-0.5 rounded-full bg-midnite flex items-center justify-center"
      aria-hidden="true"
    >
      <img src="/images/repp-mark.svg" alt="" aria-hidden="true" className="w-[18px]" />
    </div>
  )
}
