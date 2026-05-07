import { useMemo } from 'react'
import {
  buildBubbleExposure,
  buildDropoffMatrix,
  buildHotLeads,
  buildTimeToConversion,
  computeLeadScore,
  formatDuration,
  humanizePersona,
} from '../../lib/analytics.js'

// "AI"-style weekly summary , geen LLM-call (privacy + kosten),
// maar een rule-based narrative die de meest opvallende patronen
// herkent en in nette zinnen samenvat. Schaalt mee met je data:
// hoe meer events, hoe rijker de narrative.
//
// Doel: in 30s lezen wat afgelopen week kenmerkt en welke 2-3
// optimalisatie-acties prioriteit hebben.
export default function AIWeeklySummary({ sessions }) {
  const insights = useMemo(() => generateInsights(sessions), [sessions])

  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5 col-span-full">
      <header className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">Auto-insights</div>
          <h2 className="text-[15px] font-semibold text-ink">Wat zegt deze data?</h2>
          <p className="text-[13px] text-ink-soft leading-relaxed mt-1">
            Rule-based samenvatting van conversie, drop-off en bubble-effectiviteit. Geen LLM, alle data blijft lokaal.
          </p>
        </div>
        <div className="text-[12px] text-ink-mute tabular-nums">{sessions.length} sessies</div>
      </header>
      {insights.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2.5">
          {insights.map((ins, i) => (
            <Insight key={i} ins={ins} />
          ))}
        </ul>
      )}
    </section>
  )
}

function Insight({ ins }) {
  const tone = {
    win:  'border-emerald-200 bg-emerald-50/50',
    risk: 'border-rose-200 bg-rose-50/50',
    info: 'border-mist-light bg-canvas',
    action: 'border-amber-200 bg-amber-50/50',
  }[ins.tone]
  const icon = {
    win:  '↗',
    risk: '↘',
    info: 'i',
    action: '→',
  }[ins.tone]
  const iconColor = {
    win:  'bg-emerald-600 text-paper',
    risk: 'bg-rose-600    text-paper',
    info: 'bg-midnite     text-paper',
    action: 'bg-amber-500  text-paper',
  }[ins.tone]
  return (
    <li className={'rounded-xl border px-4 py-3 flex gap-3 items-start ' + tone}>
      <span className={'shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-semibold ' + iconColor}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-ink">{ins.title}</div>
        <div className="text-[13px] text-ink-soft leading-relaxed mt-0.5">{ins.body}</div>
        {ins.action && (
          <div className="text-[12.5px] text-midnite font-medium mt-1.5">→ {ins.action}</div>
        )}
      </div>
    </li>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-mist-light bg-canvas px-6 py-8 text-center text-[14px] text-ink-soft">
      Te weinig data voor automatische insights. Vanaf ~10 sessies vullen ze hier.
    </div>
  )
}

// ---- rule-based insights ----------------------------------------------------

function generateInsights(sessions) {
  const out = []
  if (sessions.length < 5) return out

  const completed = sessions.filter((s) => s.completed)
  const completionRate = completed.length / sessions.length
  const ttc = buildTimeToConversion(sessions)
  const dropoff = buildDropoffMatrix(sessions)
  const bubbles = buildBubbleExposure(sessions)
  const hotLeads = buildHotLeads(sessions, 3)

  // 1. Overall conversion verdict
  if (completionRate >= 0.5) {
    out.push({
      tone: 'win',
      title: `Sterke conversie: ${(completionRate * 100).toFixed(0)}% voltooit de flow`,
      body: `${completed.length} van ${sessions.length} sessies bereikten 'flow:complete'. Mediaan tijd ${formatDuration(ttc.median)}.`,
    })
  } else if (completionRate >= 0.25) {
    out.push({
      tone: 'info',
      title: `Conversie ${(completionRate * 100).toFixed(0)}% , gezond maar te tunen`,
      body: `${completed.length} van ${sessions.length} bereikten voltooiing. Voor CLP's is 50%+ haalbaar.`,
      action: 'Identificeer onderstaande drop-off-knelpunten en test daar copy of UX.',
    })
  } else {
    out.push({
      tone: 'risk',
      title: `Lage conversie: slechts ${(completionRate * 100).toFixed(0)}%`,
      body: `${sessions.length - completed.length} van ${sessions.length} sessies haakten af. Daar zit je grootste hefboom.`,
      action: 'Open de drop-off matrix en focus op de cel met hoogste relatieve afhaak.',
    })
  }

  // 2. Bottleneck step (waar haakt het meest af)
  const stepCounts = new Map()
  for (const cell of dropoff.cells) {
    stepCounts.set(cell.step, (stepCounts.get(cell.step) || 0) + cell.count)
  }
  const totalDropoffs = [...stepCounts.values()].reduce((a, b) => a + b, 0)
  if (totalDropoffs > 5) {
    const topStep = [...stepCounts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (topStep && topStep[1] / totalDropoffs > 0.3) {
      const stepLabel = dropoff.steps.find((s) => s.id === topStep[0])?.label || topStep[0]
      out.push({
        tone: 'risk',
        title: `Grootste drop-off bij '${stepLabel}'`,
        body: `${topStep[1]} van ${totalDropoffs} afhakers (${Math.round((topStep[1] / totalDropoffs) * 100)}%) verlieten op deze stap.`,
        action: 'A/B test de copy of UX van deze specifieke stap.',
      })
    }
  }

  // 3. Persona-skew analyse
  const completedByPersona = new Map()
  const totalByPersona = new Map()
  for (const s of sessions) {
    const p = s.persona || 'onbekend'
    totalByPersona.set(p, (totalByPersona.get(p) || 0) + 1)
    if (s.completed) completedByPersona.set(p, (completedByPersona.get(p) || 0) + 1)
  }
  let bestP = null, worstP = null
  for (const [p, total] of totalByPersona) {
    if (total < 3) continue
    const rate = (completedByPersona.get(p) || 0) / total
    if (!bestP || rate > bestP.rate) bestP = { p, rate, total }
    if (!worstP || rate < worstP.rate) worstP = { p, rate, total }
  }
  if (bestP && worstP && bestP.p !== worstP.p && bestP.rate - worstP.rate > 0.2) {
    out.push({
      tone: 'info',
      title: `Persona-gat: ${humanizePersona(bestP.p)} converteert beter dan ${humanizePersona(worstP.p)}`,
      body: `${(bestP.rate * 100).toFixed(0)}% vs ${(worstP.rate * 100).toFixed(0)}% , ${Math.round((bestP.rate - worstP.rate) * 100)}pp verschil.`,
      action: `Test of de flow voor ${humanizePersona(worstP.p)} aanpassing nodig heeft.`,
    })
  }

  // 4. Best-converting bubble
  const bestBubble = bubbles.filter((b) => b.uniqueSessions >= 3).sort((a, b) => b.lift - a.lift)[0]
  if (bestBubble && bestBubble.lift > 0.05) {
    out.push({
      tone: 'win',
      title: `'${bestBubble.label}' boost conversie met +${(bestBubble.lift * 100).toFixed(0)}pp`,
      body: `Sessies die deze bubble zagen converteerden ${(bestBubble.lift * 100).toFixed(0)} percentpunt vaker. Vertoond aan ${bestBubble.uniqueSessions} bezoekers.`,
      action: 'Toon deze bubble eerder in de flow of vaker.',
    })
  }

  // 5. Worst-performing bubble
  const worstBubble = bubbles.filter((b) => b.uniqueSessions >= 3).sort((a, b) => a.lift - b.lift)[0]
  if (worstBubble && worstBubble.lift < -0.05) {
    out.push({
      tone: 'risk',
      title: `'${worstBubble.label}' correleert met afhaak`,
      body: `Sessies die deze bubble zagen voltooiden ${Math.abs(worstBubble.lift * 100).toFixed(0)}pp minder vaak. Mogelijk is de inhoud verwarrend of komt te vroeg.`,
      action: 'Inspecteer of timing/copy van deze bubble klopt.',
    })
  }

  // 6. Hot lead alert
  const hottest = hotLeads[0]
  if (hottest && hottest.score >= 60) {
    out.push({
      tone: 'action',
      title: `Hete lead wacht op contact: ${hottest.session.lead?.firstName || humanizePersona(hottest.session.persona)}`,
      body: `Score ${hottest.score}/100 , laatste activiteit ${formatDuration(Date.now() - hottest.session.lastEventAt)} geleden.`,
      action: 'Open hot leads-blok en bel/mail vandaag.',
    })
  }

  // 7. Tempo-insight
  if (ttc.completedCount >= 5) {
    if (ttc.median < 30000) {
      out.push({
        tone: 'info',
        title: 'Mediaan voltooid in <30s , controleer of dit echt is',
        body: 'Korte voltooitijd kan duiden op test-traffic of een te-lichte funnel waarin mensen klikken zonder te lezen.',
        action: 'Filter op 30d range en check of de duur realistisch is.',
      })
    } else if (ttc.median > 360000) {
      out.push({
        tone: 'info',
        title: `Mediaan voltooitijd ${formatDuration(ttc.median)} , wellicht te lang`,
        body: 'Bezoekers die >6min doen kunnen verdwalen. Overweeg de flow korter te maken voor zekere persona\'s.',
      })
    }
  }

  return out
}
