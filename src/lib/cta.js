// CTA-rotatie voor de IntroScreen.
// Volgorde: ?cta=A|B|C|D in URL > localStorage > random.
// Random keuze wordt persistent zodat dezelfde bezoeker bij refresh dezelfde CTA ziet.
export const CTA_VARIANTS = {
  A: 'Bekijk de Hofman',
  B: 'Bekijk brochure en prijzen',
  C: 'Ontdek wat past',
  D: 'Bekijk actuele informatie',
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
