import { useEffect, useMemo, useRef, useState } from 'react'
import { sankey, sankeyJustify, sankeyLinkHorizontal } from 'd3-sankey'
import { buildSankey, formatDuration, humanizePersona } from '../../lib/analytics.js'

// Sankey flow diagram — toont de werkelijke gebruikersroute door de chat.
// Bredere banden = meer mensen die die overgang maakten. We renderen het
// diagram zelf (SVG + d3-sankey) ipv via nivo zodat we volledige controle
// hebben over label-plaatsing: in elke kolom doen we collision-avoidance
// zodat labels nooit over elkaar vallen, met dunne leiders als een label
// is verplaatst tov het knooppunt.

const NODE_WIDTH = 12
const NODE_PADDING = 22
const LABEL_FONT_SIZE = 11
const LABEL_LINE_HEIGHT = 14
const MIN_LABEL_GAP = 16
const HEIGHT_MIN = 360
const HEIGHT_MAX = 760
const CHAR_PX = 5.6                // gemeten gem. voor 11px Montserrat 500
const CHAR_PX_COUNT = 5.4          // count-tspan is iets smaller (lighter)
const SIDE_MARGIN = 14
const TOP_MARGIN = 14
const BOTTOM_MARGIN = 14

export default function SankeyFlow({ sessions, onOpenSession }) {
  // Persona-split staat default UIT — bij <100 sessies vermenigvuldigt
  // het de nodes onnodig en blijft het diagram onleesbaar.
  const [branchOnPersona, setBranchOnPersona] = useState(false)
  const containerRef = useRef(null)
  const [width, setWidth] = useState(960)

  // Interactie-state: hover dimt onrelevante paden voor focus,
  // selectie opent detail-paneel onder het diagram. Klik op zelfde
  // node = deselecteren. Escape = reset alles.
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  // Reset selectie bij data-shift (toggle persona-split, andere sessies).
  useEffect(() => {
    setSelectedNodeId(null)
    setHoveredNodeId(null)
  }, [branchOnPersona, sessions])

  // Esc om te resetten.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setSelectedNodeId(null)
        setHoveredNodeId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width)
      if (w >= 320) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const data = useMemo(
    () => buildSankey(sessions, { branchOnPersona }),
    [sessions, branchOnPersona],
  )
  const hasData = data.links.length > 0
  // In persona-split-mode hebben we 4x zoveel nodes per kolom; middel-
  // kolommen worden visueel onleesbaar als elke step-node ook label krijgt.
  // We labelen dan alleen de eerste/laatste kolom én sleutel-momenten
  // (persona-keuze, ja/nee, voltooid, afhaak). De rest blijft zichtbaar
  // via tooltip op hover.
  const labelStrategy = branchOnPersona ? 'key-nodes-only' : 'all'

  // Bepaal focus-set: selectie heeft voorrang op hover.
  const focusNodeId = selectedNodeId || hoveredNodeId
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null
    return data.nodes.find((n) => n.id === selectedNodeId) || null
  }, [selectedNodeId, data.nodes])

  return (
    <section className="rounded-2xl border border-mist-light bg-paper p-5 col-span-full">
      <header className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] tracking-[0.18em] text-midnite uppercase font-medium mb-1">
            Gebruikersroute
          </div>
          <h2 className="text-[15px] font-semibold text-ink">Sankey-stroom door de chat</h2>
          <p className="text-[13px] text-ink-soft leading-relaxed mt-1">
            Bredere banden = meer mensen die dit pad volgden. Hover voor exacte aantallen.
          </p>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink-soft cursor-pointer select-none">
          <input
            type="checkbox"
            checked={branchOnPersona}
            onChange={(e) => setBranchOnPersona(e.target.checked)}
            className="accent-midnite"
          />
          Splits op persona
        </label>
      </header>
      <div ref={containerRef} className="w-full">
        {hasData ? (
          <Chart
            data={data}
            width={width}
            labelStrategy={labelStrategy}
            focusNodeId={focusNodeId}
            selectedNodeId={selectedNodeId}
            onHoverNode={setHoveredNodeId}
            onSelectNode={(id) =>
              setSelectedNodeId((cur) => (cur === id ? null : id))
            }
          />
        ) : (
          <EmptyState />
        )}
      </div>
      {hasData && selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          data={data}
          sessions={sessions}
          totalSessions={sessions.length}
          onClose={() => setSelectedNodeId(null)}
          onOpenSession={onOpenSession}
        />
      )}
      {hasData && <Legend />}
      {hasData && !selectedNodeId && (
        <p className="mt-3 text-[11px] text-ink-mute italic">
          Hover om paden te dimmen, klik op een knoop voor details en bijbehorende sessies.
        </p>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Chart — pure render gegeven een breedte en {nodes, links}
// ---------------------------------------------------------------------------

function Chart({
  data,
  width,
  labelStrategy = 'all',
  focusNodeId = null,
  selectedNodeId = null,
  onHoverNode,
  onSelectNode,
}) {
  const layout = useMemo(
    () => computeLayout(data, width, { labelStrategy }),
    [data, width, labelStrategy],
  )
  if (!layout) return <EmptyState />
  const { nodes, links, labels, height } = layout

  // Pre-bereken welke nodes/links "in focus" zijn op basis van focusNodeId.
  // Connected = source of target van focus.
  const isFocused = (id) => focusNodeId == null || id === focusNodeId || connectedNodeIds(focusNodeId, links).has(id)
  const isLinkFocused = (link) =>
    focusNodeId == null ||
    link.source.id === focusNodeId ||
    link.target.id === focusNodeId

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Sankey-diagram van gebruikersroute door de chat. Klik op een knoop voor details."
      className="block select-none"
    >
      <g>
        {links.map((link, i) => {
          const focused = isLinkFocused(link)
          return (
            <path
              key={i}
              d={sankeyLinkHorizontal()(link)}
              fill="none"
              stroke={linkStrokeFor(link)}
              strokeOpacity={focusNodeId == null ? 0.32 : focused ? 0.6 : 0.05}
              strokeWidth={Math.max(1, link.width)}
              className="transition-[stroke-opacity] duration-150"
              style={{ pointerEvents: 'stroke' }}
            >
              <title>{`${link.source.label} → ${link.target.label}: ${link.value}`}</title>
            </path>
          )
        })}
      </g>
      <g>
        {nodes.map((n, i) => {
          const focused = isFocused(n.id)
          const selected = n.id === selectedNodeId
          return (
            <g key={i}>
              {selected && (
                <rect
                  x={n.x0 - 3}
                  y={n.y0 - 3}
                  width={n.x1 - n.x0 + 6}
                  height={Math.max(1, n.y1 - n.y0) + 6}
                  fill="none"
                  stroke={n.nodeColor}
                  strokeWidth={2}
                  strokeOpacity={0.8}
                  rx={4}
                  className="pointer-events-none"
                />
              )}
              <rect
                x={n.x0}
                y={n.y0}
                width={n.x1 - n.x0}
                height={Math.max(1, n.y1 - n.y0)}
                fill={n.nodeColor}
                opacity={focusNodeId == null ? 0.95 : focused ? 1 : 0.2}
                rx={2}
                className="transition-opacity duration-150 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onSelectNode?.(n.id) }}
                onMouseEnter={() => onHoverNode?.(n.id)}
                onMouseLeave={() => onHoverNode?.(null)}
              >
                <title>
                  {n.persona
                    ? `[${n.persona}] ${n.label} — ${n.value} (klik voor details)`
                    : `${n.label} — ${n.value} (klik voor details)`}
                </title>
              </rect>
            </g>
          )
        })}
      </g>
      <g aria-hidden="true">
        {labels.map((l, i) => {
          const focused = isFocused(l.nodeId)
          return (
            <g key={i} opacity={focused ? 1 : 0.25} className="transition-opacity duration-150">
              {l.shifted && (
                <line
                  x1={l.connectorX1}
                  y1={l.connectorY1}
                  x2={l.connectorX2}
                  y2={l.connectorY2}
                  stroke="#a8a8c8"
                  strokeWidth={0.75}
                />
              )}
              <text
                x={l.x}
                y={l.y}
                fontSize={LABEL_FONT_SIZE}
                fontFamily="Montserrat, system-ui, -apple-system, sans-serif"
                fontWeight={500}
                textAnchor={l.anchor}
                dominantBaseline="middle"
                fill="#1d1d1f"
              >
                {l.persona && (
                  <tspan
                    fill="#5a5a8a"
                    fontWeight={600}
                    fontSize={LABEL_FONT_SIZE - 1}
                  >
                    {`[${l.persona}] `}
                  </tspan>
                )}
                <tspan>{l.text}</tspan>
                <tspan fill="#7a7a8a" fontWeight={400}>{`  ${l.count}`}</tspan>
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

// Memoization-light helper — computes incident node-ids voor een focus.
// Niet super hot path, en de set is klein, dus elke render opnieuw bouwen
// is goedkoper dan extra useMemo-overhead.
function connectedNodeIds(focusId, links) {
  const set = new Set()
  if (!focusId) return set
  set.add(focusId)
  for (const link of links) {
    if (link.source.id === focusId) set.add(link.target.id)
    if (link.target.id === focusId) set.add(link.source.id)
  }
  return set
}

function linkStrokeFor(link) {
  if (link.target?.kind === 'exit') return '#b91c1c'
  if (link.target?.kind === 'done') return '#1a8c4a'
  return '#7a7ace'
}

// ---------------------------------------------------------------------------
// Layout — d3-sankey + per-kolom label-plaatsing met collision avoidance
// ---------------------------------------------------------------------------

function computeLayout(data, width, { labelStrategy = 'all' } = {}) {
  if (!data.nodes.length || !data.links.length) return null

  // Hoogte schaalt met aantal links, zodat we genoeg verticale ruimte
  // hebben om nodes uit elkaar te zetten zonder de labels te laten clashen.
  const height = clamp(
    HEIGHT_MIN,
    HEIGHT_MAX,
    Math.round(140 + data.links.length * 18 + data.nodes.length * 4),
  )

  // Reserveer ruimte voor labels aan beide zijden. We meten labels op basis
  // van de geschatte tekst-breedte zodat smalle viewports niet alles
  // wegtrekken; eerst rough estimate, daarna kun je iteren.
  const labelTexts = data.nodes.map((n) => labelTextFor(n))
  const longestLeft = maxStringWidth(labelTexts.slice(0, Math.ceil(labelTexts.length / 4)))
  const longestRight = maxStringWidth(labelTexts.slice(-Math.ceil(labelTexts.length / 4)))
  const padLeft = clamp(80, 220, longestLeft + 24)
  const padRight = clamp(120, 280, longestRight + 28)
  if (width <= padLeft + padRight + 60) {
    // viewport te smal — terugvallen op kleinere padding
    return computeLayoutCompact(data, width, height)
  }

  const gen = sankey()
    .nodeId((d) => d.id)
    .nodeWidth(NODE_WIDTH)
    .nodePadding(NODE_PADDING)
    .nodeAlign(sankeyJustify)
    .extent([
      [padLeft, TOP_MARGIN],
      [width - padRight, height - BOTTOM_MARGIN],
    ])

  const graph = gen({
    nodes: data.nodes.map((n) => ({ ...n })),
    links: data.links.map((l) => ({ ...l })),
  })

  const labels = placeLabels(graph.nodes, width, height, { labelStrategy })
  return { nodes: graph.nodes, links: graph.links, labels, height }
}

function computeLayoutCompact(data, width, height, { labelStrategy = 'all' } = {}) {
  // Mobiele / smalle viewport: korter padding, labels rechts inkortbaar.
  const padLeft = 60
  const padRight = 80
  const gen = sankey()
    .nodeId((d) => d.id)
    .nodeWidth(NODE_WIDTH)
    .nodePadding(NODE_PADDING)
    .nodeAlign(sankeyJustify)
    .extent([
      [padLeft, TOP_MARGIN],
      [Math.max(padLeft + 80, width - padRight), height - BOTTOM_MARGIN],
    ])
  const graph = gen({
    nodes: data.nodes.map((n) => ({ ...n })),
    links: data.links.map((l) => ({ ...l })),
  })
  const labels = placeLabels(graph.nodes, width, height, { compact: true, labelStrategy })
  return { nodes: graph.nodes, links: graph.links, labels, height }
}

// Plaats labels per kolom met collision-avoidance. Ideaal: y = midden van
// node. Bij overlap schuiven we de label omlaag, met een dunne lijntje
// terug naar de node-rand zodat duidelijk blijft welke node bij welk
// label hoort.
function placeLabels(nodes, width, height, { compact = false, labelStrategy = 'all' } = {}) {
  if (!nodes.length) return []
  // Groepeer op kolom (afgerond op x0).
  const colsMap = new Map()
  for (const n of nodes) {
    const k = Math.round(n.x0)
    if (!colsMap.has(k)) colsMap.set(k, [])
    colsMap.get(k).push(n)
  }
  const cols = [...colsMap.entries()].sort((a, b) => a[0] - b[0])
  const minX = cols[0][0]
  const maxX = cols[cols.length - 1][0]
  // KEY_KINDS: in persona-split-mode tonen we alleen labels op deze
  // node-types in middelste kolommen. Voor de eerste/laatste kolom altijd.
  const KEY_KINDS = new Set(['persona', 'choice', 'exit', 'done'])
  const isKey = (n, isEdge) =>
    labelStrategy === 'all' || isEdge || KEY_KINDS.has(n.kind)
  // Hoeveel ruimte per kolom-gap is er voor labels? We trekken 6px lucht
  // af zodat label van kolom N niet tegen label van kolom N+1 aanloopt.
  const colGap = cols.length > 1
    ? (cols[1][0] - cols[0][0]) - NODE_WIDTH - 6
    : 120
  // Count-tspan eet ~4 chars extra; reserveer die ruimte zodat de label
  // zelf niet eindigt in een ellipsis terwijl er nog plek is voor "  30".
  const countBudget = 4
  // 14 als bodem werkt voor "Eigen bedrijf" (13) + "Brochure nee" (12)
  // zonder ellipsis op standaard col-gaps (74-85px). Klein risico op
  // doortrekken in extreem smal viewport, maar dan slaat compact-layout in.
  const middleMaxChars = Math.max(14, Math.floor(colGap / CHAR_PX) - countBudget)
  const sideMaxChars = compact ? 20 : 32

  const placed = []
  for (const [col, list] of cols) {
    const isFirst = col === minX
    const isLast = col === maxX
    // Eerste kolom: labels naar LINKS van node. Andere: naar RECHTS.
    const side = isFirst ? 'left' : 'right'
    const maxChars = (isFirst || isLast) ? sideMaxChars : middleMaxChars

    // Filter eerst op label-strategie zodat we niet voor genegeerde nodes
    // ruimte reserveren in de collision-avoidance.
    const visible = list.filter((n) => isKey(n, isFirst || isLast))
    if (visible.length === 0) continue
    const sorted = [...visible].sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1))
    const slots = []
    // Pass 1: top-down met min-gap. Eerste y = midden eerste node, daarna
    // max(midden, vorige + gap).
    let lastY = -Infinity
    for (const n of sorted) {
      const mid = (n.y0 + n.y1) / 2
      const y = Math.max(mid, lastY + MIN_LABEL_GAP)
      slots.push(y)
      lastY = y
    }
    // Als de stack onderaan over de chart-hoogte gaat, schuif alles up.
    const overflow = lastY - (height - BOTTOM_MARGIN)
    if (overflow > 0) {
      for (let i = slots.length - 1; i >= 0; i--) {
        const ceiling = i > 0 ? slots[i - 1] + MIN_LABEL_GAP : TOP_MARGIN
        slots[i] = Math.max(ceiling, slots[i] - overflow)
      }
    }
    // Als top boven de chart uitkomt, schuif alles down.
    const underflow = TOP_MARGIN - slots[0]
    if (underflow > 0) {
      for (let i = 0; i < slots.length; i++) {
        slots[i] = slots[i] + underflow
      }
    }

    sorted.forEach((n, i) => {
      const y = slots[i]
      const idealY = (n.y0 + n.y1) / 2
      const shifted = Math.abs(y - idealY) > 2
      const x = side === 'left' ? n.x0 - 8 : n.x1 + 8
      const anchor = side === 'left' ? 'end' : 'start'
      // Persona-prefix tonen we alleen daar waar 'ie écht uniek bijdraagt:
      // op de allereerste kolom (laat zien dat elke persona z'n eigen start
      // heeft). Op persona-knooppunten zelf is de prefix redundant met de
      // label ("Belegger" zegt al genoeg). Op alle andere knooppunten zou
      // de prefix ~25px per label kosten en kolom-buurmannen laten botsen
      // — de tooltip geeft persona-info bij hover.
      const showPersona = !!n.persona && isFirst && n.kind !== 'persona'
      const text = truncate(labelTextFor(n), maxChars)
      placed.push({
        text,
        x,
        y,
        anchor,
        side,
        nodeId: n.id,
        persona: showPersona ? n.persona : null,
        count: n.value || 0,
        shifted,
        // Bewaar node-rand-coordinates voor connector-redraw na
        // cross-column collision resolution.
        nodeLeft: n.x0,
        nodeRight: n.x1,
        idealY,
        priority: nodePriority(n, isFirst, isLast),
      })
    })
  }
  // Cross-column post-pass: schuif overlappende labels uit elkaar.
  return resolveCrossColumnCollisions(placed, height)
}

// Hogere prioriteit = belangrijker label dat in conflict liever
// op z'n ideale plek mag blijven. De andere wordt verschoven.
function nodePriority(n, isFirst, isLast) {
  if (isFirst || isLast) return 100
  if (n.kind === 'persona') return 90
  if (n.kind === 'done') return 80
  if (n.kind === 'exit') return 75
  if (n.kind === 'choice') return 60
  return 40
}

// Bekijkt labels paarsgewijs; bij overlap wordt de lage-prio label
// verticaal opgeschoven (min 1 line-height) en de connector-lijn
// hertekend zodat duidelijk blijft welke node de label hoort.
function resolveCrossColumnCollisions(placed, height) {
  const labels = placed.map((l) => ({ ...l }))
  function rect(l) {
    const labelWidth =
      (l.text.length + (l.persona ? l.persona.length + 3 : 0) + (l.count > 0 ? String(l.count).length + 2 : 0)) * CHAR_PX
    const x0 = l.anchor === 'end' ? l.x - labelWidth : l.x
    const x1 = l.anchor === 'end' ? l.x : l.x + labelWidth
    return { x0, x1, y0: l.y - LABEL_LINE_HEIGHT / 2, y1: l.y + LABEL_LINE_HEIGHT / 2 }
  }
  function overlap(a, b) {
    const A = rect(a), B = rect(b)
    const ox = Math.max(0, Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0))
    const oy = Math.max(0, Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0))
    return ox > 2 && oy > 2
  }
  // Meerdere passes: bij elk overlap-paar verschuiven we de lagere prio.
  // Limiet zodat we niet eindeloos itereren.
  for (let pass = 0; pass < 4; pass++) {
    let changed = false
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        if (!overlap(labels[i], labels[j])) continue
        // Selecteer de movable: lagere priority. Bij gelijk: degene met
        // hoogste y (verschuiven naar onder is veiliger want we hebben
        // chart-hoogte als margin).
        const a = labels[i], b = labels[j]
        const movable = a.priority < b.priority ? a : b.priority < a.priority ? b : (a.y >= b.y ? a : b)
        const other = movable === a ? b : a
        // Bepaal richting: naar buiten van other's y.
        const direction = movable.y >= other.y ? 1 : -1
        const newY = clamp(
          TOP_MARGIN,
          height - BOTTOM_MARGIN,
          other.y + direction * (LABEL_LINE_HEIGHT + 4),
        )
        if (Math.abs(newY - movable.y) > 0.5) {
          movable.y = newY
          movable.shifted = true
          changed = true
        }
      }
    }
    if (!changed) break
  }
  // Hercompute connector-coords zodat de lijn van node-rand naar de
  // (mogelijk verschoven) label loopt.
  for (const l of labels) {
    l.connectorX1 = l.side === 'left' ? l.nodeLeft : l.nodeRight
    l.connectorY1 = l.idealY
    l.connectorX2 = l.side === 'left' ? l.nodeLeft - 4 : l.nodeRight + 4
    l.connectorY2 = l.y
  }
  return labels
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function labelTextFor(n) {
  return n.label || n.id
}

function truncate(s, max) {
  if (!s) return ''
  if (s.length <= max) return s
  return s.slice(0, Math.max(1, max - 1)) + '…'
}

function clamp(min, max, v) {
  return Math.max(min, Math.min(max, v))
}

function maxStringWidth(arr) {
  let m = 0
  for (const s of arr || []) {
    if (!s) continue
    const w = s.length * CHAR_PX
    if (w > m) m = w
  }
  return m
}

// ---------------------------------------------------------------------------
// Node detail panel — verschijnt onder de Sankey zodra je een knoop klikt
// ---------------------------------------------------------------------------
//
// Toont voor de geselecteerde knoop:
//  - totaal aantal sessies door deze stap (+ % t.o.v. alle sessies)
//  - persona-mix
//  - top-3 voorgaande stappen (waar kwamen ze vandaan)
//  - top-3 volgende stappen (waar gingen ze heen)
//  - sessies-lijst, klikbaar om de SessionReplay-modal te openen
//
// Samen geven die de "waarom" achter een dunne of brede band.

function NodeDetailPanel({ node, data, sessions, totalSessions, onClose, onOpenSession }) {
  const nodeSessionIds = data.nodeSessions?.get(node.id) || new Set()
  const matchingSessions = useMemo(
    () => sessions.filter((s) => nodeSessionIds.has(s.sessionId)),
    [sessions, nodeSessionIds],
  )
  const sharePct = totalSessions > 0 ? (nodeSessionIds.size / totalSessions) * 100 : 0

  // Persona-mix vanuit de daadwerkelijk gematchte sessies (niet uit de
  // sankey-meta — die kan persona-prefix bevatten in split-mode).
  const personaMix = useMemo(() => {
    const m = new Map()
    for (const s of matchingSessions) {
      const k = s.persona || 'onbekend'
      m.set(k, (m.get(k) || 0) + 1)
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, label: humanizePersona(key), count }))
  }, [matchingSessions])

  // In-/uitgaande edges uit de sankey-data, geaggregeerd per buur-knoop.
  const incoming = useMemo(() => {
    return data.links
      .filter((l) => (l.target.id || l.target) === node.id)
      .map((l) => ({ id: l.source.id || l.source, label: l.source.label || (data.nodes.find(n => n.id === l.source)?.label), count: l.value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [data, node.id])

  const outgoing = useMemo(() => {
    return data.links
      .filter((l) => (l.source.id || l.source) === node.id)
      .map((l) => ({ id: l.target.id || l.target, label: l.target.label || (data.nodes.find(n => n.id === l.target)?.label), count: l.value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [data, node.id])

  const incomingTotal = incoming.reduce((a, b) => a + b.count, 0)
  const outgoingTotal = outgoing.reduce((a, b) => a + b.count, 0)

  return (
    <div className="mt-4 rounded-xl border border-mist-light bg-canvas-2/50 p-4">
      <header className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-baseline gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: node.nodeColor }}
            aria-hidden
          />
          <h3 className="text-[14px] font-semibold text-ink">
            {node.persona && (
              <span className="text-ink-mute font-normal mr-1">[{node.persona}]</span>
            )}
            {node.label}
          </h3>
          <span className="text-[12px] text-ink-mute tabular-nums">
            {nodeSessionIds.size} sessies · {sharePct.toFixed(0)}% van totaal
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluit details"
          className="text-ink-mute hover:text-ink text-[16px] leading-none"
        >
          ✕
        </button>
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        {/* Persona-mix */}
        <div>
          <div className="text-[10px] tracking-[0.18em] text-ink-mute uppercase font-medium mb-2">
            Persona-mix
          </div>
          {personaMix.length === 0 ? (
            <div className="text-[12px] text-ink-mute italic">geen data</div>
          ) : (
            <ul className="space-y-1.5">
              {personaMix.map((p) => (
                <li key={p.key} className="flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="text-ink-soft truncate">{p.label}</span>
                  <span className="font-medium tabular-nums text-ink">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Kwam van */}
        <div>
          <div className="text-[10px] tracking-[0.18em] text-ink-mute uppercase font-medium mb-2">
            Kwam van
          </div>
          {incoming.length === 0 ? (
            <div className="text-[12px] text-ink-mute italic">eerste stap</div>
          ) : (
            <ul className="space-y-1.5">
              {incoming.map((e) => {
                const pct = incomingTotal > 0 ? (e.count / incomingTotal) * 100 : 0
                return (
                  <li key={e.id} className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="text-ink-soft truncate">{e.label || e.id}</span>
                    <span className="tabular-nums text-ink-mute">
                      <span className="font-medium text-ink">{e.count}</span>
                      <span className="ml-1 text-[10.5px]">({pct.toFixed(0)}%)</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Ging naar */}
        <div>
          <div className="text-[10px] tracking-[0.18em] text-ink-mute uppercase font-medium mb-2">
            Ging naar
          </div>
          {outgoing.length === 0 ? (
            <div className="text-[12px] text-ink-mute italic">eindpunt</div>
          ) : (
            <ul className="space-y-1.5">
              {outgoing.map((e) => {
                const pct = outgoingTotal > 0 ? (e.count / outgoingTotal) * 100 : 0
                return (
                  <li key={e.id} className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="text-ink-soft truncate">{e.label || e.id}</span>
                    <span className="tabular-nums text-ink-mute">
                      <span className="font-medium text-ink">{e.count}</span>
                      <span className="ml-1 text-[10.5px]">({pct.toFixed(0)}%)</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Sessies-lijst — klikbaar om SessionReplay te openen */}
      {matchingSessions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-mist-light/70">
          <div className="text-[10px] tracking-[0.18em] text-ink-mute uppercase font-medium mb-2">
            Sessies door deze knoop ({matchingSessions.length})
          </div>
          <ul className="grid sm:grid-cols-2 gap-1">
            {matchingSessions.slice(0, 12).map((s) => (
              <li key={s.sessionId}>
                <button
                  type="button"
                  onClick={() => onOpenSession?.(s.sessionId)}
                  disabled={!onOpenSession}
                  className={
                    'w-full text-left rounded-lg px-2.5 py-1.5 text-[12px] border border-transparent transition ' +
                    (onOpenSession
                      ? 'hover:bg-paper hover:border-mist-light cursor-pointer text-ink'
                      : 'text-ink-soft cursor-default')
                  }
                  title={onOpenSession ? 'Open sessie-replay' : undefined}
                >
                  <span className="font-medium">
                    {s.lead?.firstName || s.lead?.email || s.sessionId.slice(0, 8)}
                  </span>
                  <span className="text-ink-mute ml-1.5">
                    {s.persona ? humanizePersona(s.persona) : ''}
                    {s.duration ? ` · ${formatDuration(s.duration)}` : ''}
                    {s.completed ? ' · ✓ voltooid' : ' · afgehaakt'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {matchingSessions.length > 12 && (
            <div className="mt-2 text-[11px] text-ink-mute italic">
              +{matchingSessions.length - 12} verborgen. Filter via persona-split of date-range om in te zoomen.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Legend + empty state
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-ink-mute">
      <LegendDot color="#1b1b8a" label="Stap" />
      <LegendDot color="#0f0f70" label="Persona-keuze" />
      <LegendDot color="#3a3aa8" label="Vertakking (ja/nee)" />
      <LegendDot color="#1a8c4a" label="Voltooid" />
      <LegendDot color="#b91c1c" label="Verlaten / afhaak" />
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-2.5 h-2.5 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-mist-light bg-canvas px-6 py-10 text-center">
      <div className="text-[15px] font-semibold text-ink">Nog te weinig data om paden te tekenen</div>
      <div className="text-[13px] text-ink-soft mt-1.5 leading-relaxed max-w-md mx-auto">
        Zodra een paar bezoekers de flow doorlopen verschijnen hier de werkelijke routes met breedtes per pad.
      </div>
    </div>
  )
}
