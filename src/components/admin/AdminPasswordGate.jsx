import { useEffect, useState } from 'react'

// Eenvoudige client-side password-gate op /admin. NIET voor harde
// security — dit is "URL-secret + woord" zodat collega's de admin met
// één wachtwoord kunnen openen, maar zoekmachines en toevallige bezoekers
// er niet bij kunnen. Voor echt afgeschermde toegang zou een server-side
// auth-laag nodig zijn.
//
// Wachtwoord is opzettelijk hardcoded — dit is hetzelfde REPP-team-
// password dat voor andere interne tools wordt gebruikt en geen
// externe-actor-secret. Wie de bundle leest kan 'm zien; dat is binnen
// het dreigingsmodel acceptabel.

const STORAGE_KEY = 'clp-admin-auth-v1'
const PASSWORD = 'repperdeklep'

function isUnlocked() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'ok'
  } catch {
    return false
  }
}

function unlock() {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(STORAGE_KEY, 'ok') } catch {}
}

export default function AdminPasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (isUnlocked()) setUnlocked(true)
  }, [])

  if (unlocked) return children

  const onSubmit = (e) => {
    e.preventDefault()
    if (input === PASSWORD) {
      unlock()
      setUnlocked(true)
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 400)
      setInput('')
    }
  }

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink flex items-center justify-center px-5">
      <form
        onSubmit={onSubmit}
        className={`w-full max-w-sm rounded-2xl border border-mist-light bg-paper px-6 py-8 shadow-sm ${shake ? 'animate-[shake_0.3s_linear]' : ''}`}
      >
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-midnite">REPP intern</div>
        <h1 className="mb-4 text-xl font-bold">Admin</h1>
        <label className="block text-sm text-ink-soft mb-2" htmlFor="admin-pwd">
          Wachtwoord
        </label>
        <input
          id="admin-pwd"
          type="password"
          autoComplete="off"
          autoFocus
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false) }}
          className={`w-full rounded-lg border px-3 py-2 text-base outline-none focus:border-midnite ${error ? 'border-red-400' : 'border-mist'}`}
        />
        {error ? (
          <p className="mt-2 text-sm text-red-600">Onjuist wachtwoord.</p>
        ) : (
          <p className="mt-2 text-sm text-ink-mute">Vraag bij Jann.</p>
        )}
        <button
          type="submit"
          disabled={!input}
          className="mt-5 w-full rounded-lg bg-midnite py-2 text-sm font-semibold text-paper disabled:opacity-50"
        >
          Open admin
        </button>
      </form>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
