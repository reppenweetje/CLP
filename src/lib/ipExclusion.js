// IP-exclusion: REPP-team-traffic mag de analytics niet vervuilen.
// We slaan een lijstje uit te sluiten IPs op in localStorage en
// detecteren bij elke pageload het huidige IP via api.ipify.org
// (privacy-vriendelijk: alleen IP, geen tracking, geen cookies).
// Resultaat zet een flag in localStorage die trackEvent() leest om
// alle events lokaal én richting Plausible te onderdrukken.

const EXCLUDED_IPS_KEY = 'clp-excluded-ips-v1'
const CURRENT_IP_KEY   = 'clp-current-ip-v1'
const SUPPRESS_FLAG    = 'clp-tracking-suppressed-v1'

export function loadExcludedIps() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(EXCLUDED_IPS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveExcludedIps(ips) {
  if (typeof window === 'undefined') return
  try {
    const norm = [...new Set(ips.map(s => String(s).trim()).filter(Boolean))]
    window.localStorage.setItem(EXCLUDED_IPS_KEY, JSON.stringify(norm))
    refreshSuppressFlag()
  } catch {}
}

export function getCurrentIp() {
  if (typeof window === 'undefined') return null
  try { return window.localStorage.getItem(CURRENT_IP_KEY) } catch { return null }
}

export function setCurrentIp(ip) {
  if (typeof window === 'undefined') return
  try {
    if (ip) window.localStorage.setItem(CURRENT_IP_KEY, ip)
    refreshSuppressFlag()
  } catch {}
}

// Computeert of tracking onderdrukt moet worden en cachet de uitkomst
// in localStorage zodat trackEvent() het zonder API-call kan lezen.
// Zet ook Plausible's officiële opt-out flag (`plausible_ignore`) zodat
// zelfs de automatische pageview-events geblokkeerd worden.
function refreshSuppressFlag() {
  if (typeof window === 'undefined') return
  try {
    const ip = window.localStorage.getItem(CURRENT_IP_KEY)
    const list = JSON.parse(window.localStorage.getItem(EXCLUDED_IPS_KEY) || '[]')
    const suppress = ip && list.includes(ip)
    window.localStorage.setItem(SUPPRESS_FLAG, suppress ? '1' : '0')
    // Plausible respecteert deze key voor full-traffic-opt-out.
    if (suppress) {
      window.localStorage.setItem('plausible_ignore', 'true')
    } else {
      window.localStorage.removeItem('plausible_ignore')
    }
  } catch {}
}

export function isTrackingSuppressed() {
  if (typeof window === 'undefined') return false
  try { return window.localStorage.getItem(SUPPRESS_FLAG) === '1' } catch { return false }
}

// Eenmalige IP-fetch bij app-mount. Cached in localStorage zodat
// herhaalde aanroepen geen extra API-calls maken. Gebruikt
// api.ipify.org — een populaire publieke IPv4-only endpoint zonder
// tracking. Faalt-soft bij netwerk-problemen.
export async function detectCurrentIp({ force = false } = {}) {
  if (typeof window === 'undefined') return null
  if (!force) {
    const cached = getCurrentIp()
    if (cached) return cached
  }
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      cache: 'no-store',
      mode: 'cors',
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.ip) {
      setCurrentIp(data.ip)
      return data.ip
    }
  } catch {
    // netwerk/CORS-fout — niets aan te doen, gewoon doorgaan zonder IP
  }
  return null
}

export function addExcludedIp(ip) {
  const list = loadExcludedIps()
  if (!list.includes(ip)) list.push(ip)
  saveExcludedIps(list)
}

export function removeExcludedIp(ip) {
  saveExcludedIps(loadExcludedIps().filter(x => x !== ip))
}
