import { useEffect, useState } from 'react'
import {
  isApiConfigured,
  pendingCount,
  inspectQueue,
  flushPending,
  clearQueue,
} from '../../lib/api.js'

// Diagnose-tile voor de Supabase lead-upsert pipeline. Geeft sales-ops
// zichtbaarheid op of pushes vlot landen of dat er een achterstand
// opbouwt door netwerk- of Edge-Function-issues.
//
// Toont:
//   1. Status van de master-switch (VITE_SUPABASE_ENABLED)
//   2. Aantal items in de localStorage-queue (clp-lead-queue-v1)
//   3. Sample van de oudste 3 items met leeftijd plus retry-count
//   4. Knoppen om handmatig te flushen of de queue te wissen
//
// Polling elke 8s zodat je zonder reload kunt zien of items verdwijnen
// na een flush. Email-adressen worden gemaskeerd zodat de tile in een
// schermdeling of screenshot geen PII lekt.
export default function SupabaseQueueTile() {
  const [tick, setTick] = useState(0)
  const [flushing, setFlushing] = useState(false)
  const [lastFlushResult, setLastFlushResult] = useState(null)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 8000)
    return () => clearInterval(id)
  }, [])

  const enabled = isApiConfigured()
  const count = pendingCount()
  const items = inspectQueue()

  async function onFlush() {
    setFlushing(true)
    try {
      const res = await flushPending()
      setLastFlushResult(res)
    } finally {
      setFlushing(false)
      setTick((t) => t + 1)
    }
  }

  function onClear() {
    if (!window.confirm(`Queue van ${count} ${count === 1 ? 'item' : 'items'} wissen? Dit is permanent.`)) return
    clearQueue()
    setLastFlushResult(null)
    setTick((t) => t + 1)
  }

  return (
    <section id="supabase" className="rounded-2xl border border-mist-light bg-paper p-5 scroll-mt-24">
      <header className="mb-4">
        <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">
          Supabase pipeline
        </div>
        <h2 className="text-[15px] font-semibold text-ink">Lead-upsert queue</h2>
        <p className="text-[12.5px] text-ink-mute leading-relaxed mt-1">
          Lokale localStorage-queue voor leads die de Edge Function niet direct konden bereiken. Wordt automatisch geflusht bij app-mount en bij online-event.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard
          label="Master-switch"
          value={enabled ? 'aan' : 'uit'}
          accent={enabled}
          subtext={enabled ? 'pushes lopen door' : 'pushes worden geskipt'}
        />
        <StatCard
          label="Wachtend"
          value={count}
          accent={count === 0 && enabled}
          warn={count > 10}
          subtext={count === 0 ? 'queue leeg' : count === 1 ? 'item' : 'items'}
        />
      </div>

      {items.length > 0 && (
        <div className="mb-4">
          <div className="text-[10.5px] tracking-[0.16em] text-ink-mute uppercase font-medium mb-2">
            Oudste items
          </div>
          <ul className="space-y-1.5">
            {items.slice(0, 3).map((item, i) => {
              const ageLabel = formatAge(item.queuedAt)
              const email = item.payload?.email
              const persona = item.payload?.persona || 'onbekend'
              const attempts = item.attempts || 0
              return (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 text-[12.5px] py-1.5 px-2.5 rounded-lg bg-canvas-2 border border-mist-light"
                >
                  <span className="truncate text-ink">
                    {maskEmail(email)}{' '}
                    <span className="text-ink-mute">({persona})</span>
                  </span>
                  <span className="shrink-0 text-ink-mute tabular-nums">
                    {ageLabel}, poging {attempts}
                  </span>
                </li>
              )
            })}
          </ul>
          {items.length > 3 && (
            <div className="text-[12px] text-ink-mute mt-1.5">
              plus {items.length - 3} verder in de queue
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-mist-light">
        <button
          type="button"
          onClick={onFlush}
          disabled={!enabled || count === 0 || flushing}
          className={
            'text-[13px] font-medium px-4 py-2 rounded-full transition flex-1 ' +
            (!enabled || count === 0 || flushing
              ? 'bg-canvas-2 text-ink-mute border border-mist-light cursor-not-allowed'
              : 'bg-midnite text-paper hover:bg-midnite-soft active:scale-[0.98]')
          }
        >
          {flushing ? 'Bezig met flushen...' : 'Flush nu'}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={count === 0}
          className={
            'text-[13px] px-4 py-2 rounded-full transition border ' +
            (count === 0
              ? 'text-ink-mute border-mist-light cursor-not-allowed'
              : 'text-ink-soft hover:text-rose-700 border-mist hover:border-rose-300')
          }
        >
          Wissen
        </button>
      </div>

      {lastFlushResult && (
        <div className="mt-3 text-[12px] text-ink-mute leading-relaxed">
          Laatste flush: {lastFlushResult.flushed ?? 0} verstuurd, {lastFlushResult.remaining ?? 0} resterend
          {lastFlushResult.skipped ? ' (geskipt, master-switch uit)' : ''}.
        </div>
      )}
    </section>
  )
}

function StatCard({ label, value, accent, warn, subtext }) {
  const tone = warn
    ? 'bg-amber-50 border-amber-200 text-amber-900'
    : accent
      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
      : 'bg-canvas-2 border-mist-light text-ink'
  const labelTone = warn ? 'text-amber-800' : accent ? 'text-emerald-700' : 'text-ink-mute'
  const subTone = warn ? 'text-amber-800' : 'text-ink-mute'
  return (
    <div className={'rounded-xl px-3 py-2.5 border ' + tone}>
      <div className={'text-[10.5px] tracking-[0.16em] uppercase font-medium ' + labelTone}>{label}</div>
      <div className="text-[18px] font-semibold mt-0.5 tabular-nums">{value}</div>
      <div className={'text-[11.5px] mt-0.5 ' + subTone}>{subtext}</div>
    </div>
  )
}

// Leeftijd-label op basis van de queuedAt timestamp van een queue-item.
// Onder een minuut tonen we seconden, daarboven minuten en daarboven uren
// zodat de tile altijd compact blijft maar wel realistisch leesbaar is.
function formatAge(ts) {
  if (!ts) return 'onbekend'
  const ms = Date.now() - ts
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)} u`
  return `${Math.round(ms / 86_400_000)} d`
}

// Maskeer email in de tile zodat de PII niet in een schermdeling of
// screenshot zichtbaar is. Het head plus domain blijven herkenbaar
// genoeg voor sales om de juiste rij in Supabase op te zoeken.
function maskEmail(email) {
  if (!email || typeof email !== 'string') return 'geen email'
  const [local, domain] = email.split('@')
  if (!domain) return email.slice(0, 3) + '...'
  const head = local.slice(0, 2)
  const tail = local.length > 4 ? local.slice(-1) : ''
  return `${head}...${tail}@${domain}`
}
