// CTA-rotatie voor de IntroScreen.
// Volgorde: ?cta=A|B|C|D in URL > localStorage > random.
// Random keuze wordt persistent zodat dezelfde bezoeker bij refresh dezelfde CTA ziet.
//
// Sinds mei 2026 staan alle vier varianten op dezelfde label per product-
// keuze. De rotatie-machinerie blijft bestaan zodat we later opnieuw kunnen
// A/B-testen door alleen deze waarden te wijzigen, zonder herzieningen aan
// IntroScreen of analytics-tracking.
export const CTA_VARIANTS = {
  A: 'START CHAT',
  B: 'START CHAT',
  C: 'START CHAT',
  D: 'START CHAT',
}

const CTA_STORAGE_KEY = 'clp-cta-variant'

export function pickCtaVariant() {
  if (typeof window === 'undefined') return 'A'
  try {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get('cta')?.toUpperCase()
    if (fromUrl && CTA_VARIANTS[fromUrl]) return fromUrl

    const stored = window.localStorage.getItem(CTA_STORAGE_KEY)
    if (stored && CTA_VARIANTS[stored]) return stored

    const keys = Object.keys(CTA_VARIANTS)
    const random = keys[Math.floor(Math.random() * keys.length)]
    window.localStorage.setItem(CTA_STORAGE_KEY, random)
    return random
  } catch {
    return 'A'
  }
}
