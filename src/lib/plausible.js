// Dunne wrapper rond `window.plausible()`. Wordt aangeroepen vanuit
// trackEvent() in analytics.js zodat alle in-app events ook in Plausible
// landen voor cross-session funnel-analyse.
//
// Het Plausible-script zelf staat in index.html. Hier alleen de
// safe-noop semantics + PII-filter zodat we per ongeluk geen e-mail,
// telefoon of naam naar Plausible sturen. Alleen veilige flow-attributen
// zoals persona, intent_id, size_id, timeline_id, stage, temperature,
// score, ctaVariant, label, choice, outcome.

// Whitelist van props die we wel mogen forwarden. Alles wat hier niet
// in staat wordt weggefilterd — defensief zodat een toekomstige
// trackEvent('foo', { email: '...' }) niet per ongeluk Plausible bereikt.
const SAFE_PROP_KEYS = new Set([
  'persona',
  'intent_id', 'intentId', 'intent',
  'size_id', 'sizeId', 'size',
  'timeline_id', 'timelineId', 'timeline',
  'stage',
  'temperature',
  'score',
  'ctaVariant', 'cta_variant', 'variant', 'copyVariant',
  'label',
  'choice',
  'outcome',
  'reason',
  'tab',
  'kind',
  'step',
])

// Limiteer string-lengtes zodat Plausible custom-props niet overflowen
// (Plausible heeft een limit van ~2000 chars per prop).
function sanitizeValue(v) {
  if (v == null) return undefined
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'string') return v.slice(0, 200)
  return undefined
}

export function safeProps(payload) {
  if (!payload || typeof payload !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(payload)) {
    if (!SAFE_PROP_KEYS.has(k)) continue
    const val = sanitizeValue(v)
    if (val !== undefined) out[k] = val
  }
  return out
}

// Wrapper: zwijgt als Plausible niet geladen is (dev/preview zonder
// netwerk, of script geblokkeerd door adblocker). Nooit throws naar
// de caller — analytics moet best-effort zijn.
export function plausibleEvent(name, props = {}) {
  if (typeof window === 'undefined') return
  if (typeof window.plausible !== 'function') return
  try {
    const safe = safeProps(props)
    if (Object.keys(safe).length > 0) {
      window.plausible(name, { props: safe })
    } else {
      window.plausible(name)
    }
  } catch {
    // swallow — analytics mag de chat-flow niet breken
  }
}

// Voor debug: laat zien of Plausible beschikbaar is.
export function isPlausibleReady() {
  return typeof window !== 'undefined' && typeof window.plausible === 'function'
}
