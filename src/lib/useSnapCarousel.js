import { useRef, useState, useCallback, useEffect } from 'react'

// Shared hook voor horizontale snap-carousels (UspCardsBubble, GalleryBubble).
//
// Wat het toevoegt bovenop pure CSS snap-x:
//   1. activeIndex bijhouden zodat de paging-dots de juiste kaart highlighten
//   2. scrollToIndex zodat klik op een dot naar die kaart scrollt
//   3. click-and-drag voor muis-gebruikers — CSS snap werkt namelijk niet
//      met click-drag van een muis, alleen met touch en trackpad-swipe.
//      We disablen snap tijdens de drag (anders fighten browser snap +
//      handmatige scroll om de controle) en zetten 'm weer aan op mouseup.
//
// Touch en trackpad-swipe blijven gewoon werken via de bestaande
// CSS-snap-mechanismen — die laten we ongemoeid.
//
// Usage:
//   const { ref, activeIndex, scrollToIndex, dragHandlers } = useSnapCarousel()
//   <div ref={ref} {...dragHandlers}>...</div>
//   <button onClick={() => scrollToIndex(i)} />
export function useSnapCarousel() {
  const ref = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  // dragState in ref ipv state zodat mousemove-handler geen re-renders triggert.
  const dragState = useRef({ down: false, startX: 0, startScroll: 0, moved: false })

  // Bepaal welke kaart het meest in zicht is door de child-offset met de
  // huidige scrollLeft te vergelijken. Wint de kaart met kleinste afstand
  // tot scrollLeft. Werkt voor variabele kaart-breedtes en gaps.
  const updateActive = useCallback(() => {
    const el = ref.current
    if (!el) return
    const children = el.children
    if (!children.length) return
    const sl = el.scrollLeft
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < children.length; i++) {
      const childLeft = children[i].offsetLeft - el.offsetLeft
      const dist = Math.abs(childLeft - sl)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    }
    setActiveIndex(bestIdx)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Initieel: detecteer welke kaart in beeld is (kan niet altijd 0 zijn
    // door scroll-restoration of programmatic scroll).
    updateActive()
    el.addEventListener('scroll', updateActive, { passive: true })
    return () => el.removeEventListener('scroll', updateActive)
  }, [updateActive])

  const scrollToIndex = useCallback((idx) => {
    const el = ref.current
    if (!el || !el.children[idx]) return
    el.children[idx].scrollIntoView({
      behavior: 'smooth',
      inline: 'start',
      block: 'nearest',
    })
  }, [])

  // Skip drag-start op interactieve children (button/anchor/video) zodat
  // clicks daarop blijven werken. Anders zou je niet meer op een knop in
  // een kaart kunnen klikken zonder per ongeluk te slepen.
  const onMouseDown = useCallback((e) => {
    if (e.target.closest('button, a, video')) return
    const el = ref.current
    if (!el) return
    dragState.current = {
      down: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    }
    el.style.cursor = 'grabbing'
    // Disable snap tijdens de drag — anders fighten browser-snap + manual
    // scrollLeft tegen elkaar en haakt de drag.
    el.style.scrollSnapType = 'none'
  }, [])

  const onMouseMove = useCallback((e) => {
    if (!dragState.current.down) return
    const el = ref.current
    if (!el) return
    const dx = e.clientX - dragState.current.startX
    // Pas vanaf 4px beweging markeren we als "echt sleepen" — kleine
    // tremor tijdens een gewone klik moet niet als drag tellen.
    if (Math.abs(dx) > 4) dragState.current.moved = true
    el.scrollLeft = dragState.current.startScroll - dx
  }, [])

  const endDrag = useCallback(() => {
    if (!dragState.current.down) return
    const el = ref.current
    dragState.current.down = false
    if (el) {
      el.style.cursor = ''
      // Re-enable snap; browser snapt naar dichtstbijzijnde kaart-rand.
      el.style.scrollSnapType = ''
      updateActive()
    }
  }, [updateActive])

  // Voorkomt dat een drag-eind een click-event firet op een kaart (anders
  // zou je per ongeluk een card-CTA aanroepen aan het einde van je drag).
  const onClickCapture = useCallback((e) => {
    if (dragState.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      dragState.current.moved = false
    }
  }, [])

  return {
    ref,
    activeIndex,
    scrollToIndex,
    dragHandlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp: endDrag,
      onMouseLeave: endDrag,
      onClickCapture,
    },
  }
}
