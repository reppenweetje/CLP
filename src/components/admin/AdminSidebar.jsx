import { useEffect, useState } from 'react'

// Sticky sidebar met snel-navigatie naar elke dashboard-sectie. Gebruikt
// IntersectionObserver om de actieve sectie te detecteren bij scrollen
// zodat het highlight altijd matcht met wat de bezoeker ziet.
//
// Sections-prop is een array van { id, label, icon } objecten waarbij `id`
// matcht met een DOM-element-id ergens in de main-area.
//
// Op mobiel collapsed naar een horizontale chip-bar bovenaan.
export default function AdminSidebar({ sections, activeId, onNavigate }) {
  const [open, setOpen] = useState(false)

  function handleClick(id) {
    setOpen(false)
    onNavigate?.(id)
    if (typeof window === 'undefined') return
    const el = document.getElementById(id)
    if (!el) return
    const headerOffset = 96  // sticky header hoogte
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset
    // Probeer smooth-scroll; als browser/preview-tool 't negeert,
    // valt de instant-fallback in (window.scrollTo is robuust).
    try {
      window.scrollTo({ top, behavior: 'smooth' })
    } catch {
      window.scrollTo(0, top)
    }
    // Backup: als smooth geen effect heeft binnen 200ms (preview-tool
    // gedrag), forceer dan een direct scroll. Voorkomt dood-knoppen.
    const startY = window.scrollY
    setTimeout(() => {
      if (Math.abs(window.scrollY - startY) < 5 && Math.abs(top - startY) > 50) {
        document.scrollingElement.scrollTop = top
      }
    }, 250)
  }

  // Esc sluit de mobile drawer.
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* Mobile drawer toggle */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed bottom-4 left-4 z-30 w-11 h-11 rounded-full bg-midnite text-paper shadow-lg flex items-center justify-center"
        aria-label="Open navigatie"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
          <line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
      </button>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={
          'lg:sticky lg:top-[88px] lg:self-start lg:h-[calc(100dvh-96px)] lg:overflow-y-auto ' +
          'fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto ' +
          'w-[260px] lg:w-[200px] ' +
          'bg-paper lg:bg-transparent border-r border-mist-light lg:border-0 ' +
          'transform transition-transform duration-200 ease-out ' +
          (open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
        }
      >
        <div className="px-4 py-4 lg:py-2 lg:pl-0 lg:pr-3">
          <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium mb-3 px-2">Navigatie</div>
          <nav className="space-y-0.5">
            {sections.map((s) => {
              const active = activeId === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleClick(s.id)}
                  className={
                    'w-full text-left px-2.5 py-2 rounded-lg text-[12.5px] flex items-center gap-2.5 transition relative ' +
                    (active
                      ? 'bg-midnite/8 text-midnite font-semibold'
                      : 'text-ink-soft hover:text-ink hover:bg-canvas-2')
                  }
                  aria-current={active ? 'true' : undefined}
                  title={s.label}
                >
                  {/* Active accent-bar links voor sterkere visuele scan-cue */}
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-midnite" aria-hidden />
                  )}
                  <SectionIcon id={s.id} active={active} />
                  <span className="truncate">{s.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}

// Sectie-iconen — minimal SVG voor snelle visuele scan in de sidebar.
// Klein (14px), inline-color via currentColor zodat ze auto matchen
// met active/inactive tekstkleur.
function SectionIcon({ id, active }) {
  const cls = 'shrink-0 ' + (active ? 'text-midnite' : 'text-ink-mute')
  const stroke = 1.7
  switch (id) {
    case 'overview':
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      )
    case 'insights':
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.66 18H8a6 6 0 1 1 8 0h-1.66"/>
          <path d="M9 22h6"/>
          <path d="M12 2v2"/>
        </svg>
      )
    case 'route':
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h6l3 6h7"/>
          <path d="M4 12h6"/>
          <path d="M4 18h11"/>
        </svg>
      )
    case 'bubbles':
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="9" r="3.5"/>
          <circle cx="16" cy="15" r="3.5"/>
        </svg>
      )
    case 'tempo':
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 7v5l3 2"/>
        </svg>
      )
    case 'dropoff':
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5l8 6 8-8"/>
          <path d="M4 13l8 6 8-8"/>
        </svg>
      )
    case 'funnel':
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4h18l-7 9v7l-4-2v-5z"/>
        </svg>
      )
    case 'handoff':
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h13"/>
          <path d="M12 6l6 6-6 6"/>
          <circle cx="20" cy="12" r="1.5"/>
        </svg>
      )
    case 'afhaak':
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l-5 6 5 6"/>
          <path d="M4 12h15"/>
        </svg>
      )
    case 'sessies':
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
          <line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
      )
    case 'settings':
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      )
    default:
      return <span className="w-3.5 h-3.5 shrink-0" />
  }
}

// Hook: bewaakt welke sectie momenteel zichtbaar is in de viewport.
// Hybride aanpak — scroll-listener met requestAnimationFrame throttling
// (betrouwbaarder dan IntersectionObserver in dev/HMR-context). De
// "actieve" sectie is de eerste waarvan de top-rand ≤ trigger-line ligt
// (sticky header + 100px buffer). Resultaat: actief switcht zodra de
// volgende sectie de bovenste rand van het content-gebied raakt.
export function useActiveSection(sectionIds) {
  const [activeId, setActiveId] = useState(sectionIds[0] || null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let rafId = null

    function compute() {
      rafId = null
      const triggerLine = 200  // header (88) + extra buffer
      let current = sectionIds[0]
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top <= triggerLine) current = id
        else break
      }
      setActiveId((prev) => (prev === current ? prev : current))
    }
    function onScroll() {
      if (rafId != null) return
      rafId = requestAnimationFrame(compute)
    }

    compute()  // initial
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [sectionIds.join(',')])

  return activeId
}
