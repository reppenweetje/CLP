import { useEffect, useState } from 'react'
import {
  loadExcludedIps,
  saveExcludedIps,
  detectCurrentIp,
  isTrackingSuppressed,
  addExcludedIp,
  removeExcludedIp,
  getCurrentIp,
} from '../../lib/ipExclusion.js'

// Admin-settings: nu enkel IP-uitsluiting voor team-verkeer. Toont jouw
// huidige IP, één-klik toevoegen, en een lijst van uitgesloten IPs met
// remove-knop. Status-banner bovenaan vertelt of jouw eigen tracking
// momenteel actief of onderdrukt is.
export default function AdminSettings() {
  const [excluded, setExcluded] = useState(() => loadExcludedIps())
  const [currentIp, setCurrentIp] = useState(() => getCurrentIp())
  const [suppressed, setSuppressed] = useState(() => isTrackingSuppressed())
  const [manualIp, setManualIp] = useState('')
  const [loading, setLoading] = useState(false)

  // IP detecteren bij mount + na elke wijziging om de status fresh te houden.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    detectCurrentIp().then((ip) => {
      if (cancelled) return
      setCurrentIp(ip)
      setSuppressed(isTrackingSuppressed())
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  function refresh() {
    setExcluded(loadExcludedIps())
    setSuppressed(isTrackingSuppressed())
  }

  function onExcludeMe() {
    if (!currentIp) return
    addExcludedIp(currentIp)
    refresh()
  }
  function onRemove(ip) {
    removeExcludedIp(ip)
    refresh()
  }
  function onAddManual() {
    const ip = manualIp.trim()
    if (!ip) return
    if (!isValidIp(ip)) {
      window.alert('Dit lijkt geen geldig IP-adres. Bv. 1.2.3.4 of 2001:db8::1')
      return
    }
    addExcludedIp(ip)
    setManualIp('')
    refresh()
  }
  async function onRedetect() {
    setLoading(true)
    const ip = await detectCurrentIp({ force: true })
    setCurrentIp(ip)
    setSuppressed(isTrackingSuppressed())
    setLoading(false)
  }
  function onClearAll() {
    if (!window.confirm('Alle uitgesloten IPs verwijderen?')) return
    saveExcludedIps([])
    refresh()
  }

  const myIpExcluded = !!currentIp && excluded.includes(currentIp)

  return (
    <section id="settings" className="rounded-2xl border border-mist-light bg-paper p-5 col-span-full scroll-mt-24">
      <header className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">Settings</div>
          <h2 className="text-[14px] font-semibold text-ink">IP-uitsluiting</h2>
          <p className="text-[12px] text-ink-soft leading-relaxed mt-1 max-w-prose">
            Sluit team-verkeer uit zodat onze eigen sessies de analytics niet vervuilen.
            Werkt zowel voor lokale events als richting Plausible — beide worden onderdrukt
            als jouw IP in de lijst staat.
          </p>
        </div>
      </header>

      {/* Status-banner */}
      <div
        className={
          'rounded-xl border px-4 py-3 mb-4 flex items-start gap-3 ' +
          (suppressed
            ? 'border-emerald-200 bg-emerald-50/50'
            : 'border-mist-light bg-canvas')
        }
      >
        <span
          className={
            'shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold mt-0.5 ' +
            (suppressed ? 'bg-emerald-600 text-paper' : 'bg-mist text-ink-soft')
          }
        >
          {suppressed ? '✓' : '·'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-ink">
            {suppressed
              ? 'Jouw verkeer wordt momenteel niet getrackt'
              : 'Jouw verkeer wordt op dit moment normaal getrackt'}
          </div>
          <div className="text-[11.5px] text-ink-soft mt-0.5 leading-relaxed flex items-center gap-2 flex-wrap">
            <span>Huidig IP:</span>
            <code className="bg-canvas-2 px-1.5 py-0.5 rounded text-[11px] tabular-nums">
              {loading ? 'detecteren…' : currentIp || 'niet bekend'}
            </code>
            <button
              type="button"
              onClick={onRedetect}
              disabled={loading}
              className="text-midnite hover:text-midnite-soft disabled:opacity-50 underline-offset-2 hover:underline transition"
              title="Detect IP opnieuw"
            >
              ↻ refresh
            </button>
            {currentIp && !myIpExcluded && (
              <button
                type="button"
                onClick={onExcludeMe}
                className="ml-auto text-[11.5px] text-paper bg-midnite hover:bg-midnite-soft px-3 py-1 rounded-full transition whitespace-nowrap"
              >
                Sluit mijn IP uit
              </button>
            )}
            {myIpExcluded && (
              <span className="ml-auto text-[11.5px] text-emerald-700 font-medium">
                ✓ jouw IP staat in de lijst
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Manual add */}
      <div className="grid grid-cols-[1fr_auto] gap-2 mb-4">
        <input
          type="text"
          value={manualIp}
          onChange={(e) => setManualIp(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onAddManual() }}
          placeholder="Andere IP toevoegen, bv. 1.2.3.4 of 2001:db8::1"
          className="rounded-lg border border-mist focus:border-midnite outline-none text-[13px] px-3 py-2"
        />
        <button
          type="button"
          onClick={onAddManual}
          disabled={!manualIp.trim()}
          className="text-[12px] text-paper bg-midnite hover:bg-midnite-soft disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition"
        >
          Toevoegen
        </button>
      </div>

      {/* Excluded list */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[10px] tracking-[0.18em] text-ink-mute uppercase font-medium">
            Uitgesloten IPs ({excluded.length})
          </div>
          {excluded.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] text-rose-700 hover:text-rose-900 transition"
            >
              Alle wissen
            </button>
          )}
        </div>
        {excluded.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist-light bg-canvas px-4 py-5 text-center text-[12px] text-ink-mute">
            Nog geen IPs uitgesloten. Klik "Sluit mijn IP uit" hierboven of voeg er één handmatig toe.
          </div>
        ) : (
          <ul className="rounded-xl border border-mist-light divide-y divide-mist-light">
            {excluded.map((ip) => {
              const isCurrent = ip === currentIp
              return (
                <li key={ip} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                  <code className="text-[12.5px] text-ink tabular-nums truncate">{ip}</code>
                  <div className="flex items-center gap-2 shrink-0">
                    {isCurrent && (
                      <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        jouw IP
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(ip)}
                      className="text-[11px] text-rose-700 hover:text-rose-900 hover:bg-rose-50 px-2 py-0.5 rounded transition"
                    >
                      Verwijderen
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div className="mt-3 text-[11px] text-ink-mute leading-relaxed">
          <strong className="text-ink-soft">Hoe het werkt:</strong> bij elke pageload haalt de admin het huidige IP op via
          {' '}<code className="bg-canvas-2 px-1 py-px rounded">api.ipify.org</code>. Als dat IP in de lijst staat,
          wordt <code className="bg-canvas-2 px-1 py-px rounded">trackEvent()</code> overgeslagen — dus geen lokale
          events én geen Plausible custom events. Plausible's eigen pageviews worden ook geblokkeerd doordat we het
          script suppressen wanneer suppress-flag actief is.
        </div>
      </div>
    </section>
  )
}

function isValidIp(ip) {
  // Lichte validatie — IPv4 of IPv6. Niet-strict, gewoon plausibele check.
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) || /^[0-9a-fA-F:]+$/.test(ip)
}
