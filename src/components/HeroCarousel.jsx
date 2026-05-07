import { useEffect, useState } from 'react'

// Subtiele rouleerende hero-carousel voor IntroScreen.
// Elke 4.5 seconden faden we naar de volgende afbeelding met een
// lichte Ken-Burns-zoom op de actieve. Eerste image is direct zichtbaar;
// reduced-motion respecteren we door de rotatie te bevriezen.
//
// Random start-index: elke bezoeker landt op een ander beeld, zodat
// terugkomers en bezoekers die meerdere CLPs zien niet steeds dezelfde
// hero-foto krijgen. Combinatie met de carousel die toch elke 4.5s
// roteert geeft natuurlijke variatie zonder de eerste indruk vast te
// pinnen.
export default function HeroCarousel({ images, interval = 4500 }) {
  const [active, setActive] = useState(() => {
    if (!images || images.length <= 1) return 0
    return Math.floor(Math.random() * images.length)
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (images.length <= 1) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const t = setInterval(() => {
      setActive((i) => (i + 1) % images.length)
    }, interval)
    return () => clearInterval(t)
  }, [images.length, interval])

  return (
    <div className="absolute inset-0">
      {images.map((img, i) => (
        <img
          key={i}
          src={img.src}
          alt={img.alt || ''}
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 w-full h-full object-cover transition-all ease-in-out ${
            i === active ? 'opacity-100 scale-[1.06]' : 'opacity-0 scale-100'
          }`}
          style={{ transitionDuration: '2200ms' }}
        />
      ))}
    </div>
  )
}
