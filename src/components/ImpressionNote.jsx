// Subtiele standaard-disclaimer onder afbeeldingen. Sfeerimpressies in
// vastgoedmarketing kunnen afwijken van de werkelijke uitvoering, dus we
// zetten dit consistent in het footer-formaat van bubbles.
export default function ImpressionNote({ variant = 'default', className = '' }) {
  const text =
    variant === 'aerial'
      ? 'Luchtfoto ter indicatie. Geen rechten te ontlenen.'
      : variant === 'short'
      ? 'Impressie. Geen rechten te ontlenen.'
      : 'Sfeerimpressie. Inrichting, beplanting en materialen kunnen afwijken. Geen rechten te ontlenen.'

  return (
    <p className={`text-[11px] text-ink-mute italic leading-snug ${className}`}>{text}</p>
  )
}
