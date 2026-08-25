import { useEffect, useRef } from 'react'
import { trackEvent } from '../lib/analytics.js'
import BotMessage from './BotMessage.jsx'
import UserMessage from './UserMessage.jsx'
import TypingIndicator from './TypingIndicator.jsx'
import ContentBubble from './ContentBubble.jsx'
import UnitBubble from './UnitBubble.jsx'
import CtaBubble from './CtaBubble.jsx'
import GalleryBubble from './GalleryBubble.jsx'
import UspCardsBubble from './UspCardsBubble.jsx'
import LocationBubble from './LocationBubble.jsx'
import SitePlanBubble from './SitePlanBubble.jsx'
import SitePlanPolygonBubble from './SitePlanPolygonBubble.jsx'
import HighlightsBubble from './HighlightsBubble.jsx'
import ProcessBubble from './ProcessBubble.jsx'
import PlanningBubble from './PlanningBubble.jsx'
import InvestorBubble from './InvestorBubble.jsx'
import PriceBubble from './PriceBubble.jsx'
import PriceCompareBubble from './PriceCompareBubble.jsx'
import BrochureBubble from './BrochureBubble.jsx'
import WarmHandoffBubble from './WarmHandoffBubble.jsx'
import ServiceCardBubble from './ServiceCardBubble.jsx'
import LeadFormBubble from './LeadFormBubble.jsx'
import M2MeterBubble from './M2MeterBubble.jsx'
import LocationSelectBubble from './LocationSelectBubble.jsx'
import RegionSelectBubble from './RegionSelectBubble.jsx'
import ConfigMultiSelectBubble from './ConfigMultiSelectBubble.jsx'

// Bubble-kinds die we tracken voor exposure-analyse. Komt overeen met
// de switch-cases in renderMessage(). Bot-text/user-text/typing tellen
// niet als "bubble" want dat zijn loutere chat-tekens, geen content-units.
const TRACKABLE_BUBBLE_KINDS = new Set([
  'content-card', 'unit-card', 'gallery', 'usp-cards', 'location',
  'site-plan', 'site-plan-svg', 'highlights', 'process', 'planning', 'investor',
  'price', 'price-compare', 'brochure', 'cta-card', 'warm-handoff',
  'service-card', 'lead-form', 'm2-meter', 'location-select', 'region-select',
  'config-multi',
])

// Scrollable chat thread. Bij nieuwe messages scrollen we zo dat
// het laatste user-bubble bovenaan komt te staan; de bot-replies daaronder
// blijven leesbaar zonder dat de bezoeker handmatig terug moet scrollen.
export default function ChatThread({ messages, showTyping = false, onBrochure, onReset, onUnitView, onCalcInteract, onCredionRequest, onHandoffAction, onServiceCardAction, onServiceCardSubmitPhone, onWaRequest, onTopicJump, onPortalClick, onLeadFormSubmit, onM2Submit, onLocationSubmit, onRegionSubmit, onConfigMultiSubmit }) {
  const containerRef = useRef(null)
  const prevLengthRef = useRef(0)
  const trackedIdsRef = useRef(new Set())

  // Track elke nieuwe bubble auto-magisch via bubble:rendered events.
  // Dedupe op message-id zodat re-renders geen duplicate events genereren.
  useEffect(() => {
    for (const m of messages) {
      if (!m.kind || !TRACKABLE_BUBBLE_KINDS.has(m.kind)) continue
      if (trackedIdsRef.current.has(m.id)) continue
      trackedIdsRef.current.add(m.id)
      trackEvent('bubble:rendered', {
        kind: m.kind,
        messageId: m.id,
        // Lichtgewicht payload-summary — geen volledige content om
        // localStorage niet te bombarderen.
        summary: bubbleSummary(m),
      })
    }
  }, [messages])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const grew = messages.length > prevLengthRef.current
    prevLengthRef.current = messages.length
    if (!grew && !showTyping) return

    // Auto-scroll naar onderkant zodat de meest recente bot-bubble
    // (of typing-indicator als de queue nog releaset) in beeld blijft.
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }, [messages.length, showTyping])

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3">
      {messages.map((m, i) => (
        <div key={m.id} data-msg-idx={i} data-msg-id={m.id} data-msg-kind={m.kind}>
          {renderMessage(m, { onBrochure, onReset, onUnitView, onCalcInteract, onCredionRequest, onHandoffAction, onServiceCardAction, onServiceCardSubmitPhone, onWaRequest, onTopicJump, onPortalClick, onLeadFormSubmit, onM2Submit, onLocationSubmit, onRegionSubmit, onConfigMultiSubmit })}
        </div>
      ))}
      {showTyping && (
        <div data-msg-idx="typing">
          <TypingIndicator />
        </div>
      )}
    </div>
  )
}

function renderMessage(m, { onBrochure, onReset, onUnitView, onCalcInteract, onCredionRequest, onHandoffAction, onServiceCardAction, onServiceCardSubmitPhone, onWaRequest, onTopicJump, onPortalClick, onLeadFormSubmit, onM2Submit, onLocationSubmit, onRegionSubmit, onConfigMultiSubmit }) {
  switch (m.kind) {
    case 'bot-text':
      return <BotMessage>{m.text}</BotMessage>
    case 'user-text':
      return <UserMessage>{m.text}</UserMessage>
    case 'typing':
      return <TypingIndicator />
    case 'content-card':
      return (
        <ContentBubble
          tag={m.payload.tag}
          title={m.payload.title}
          body={m.payload.body}
          image={m.payload.image}
          imagePosition={m.payload.imagePosition}
        />
      )
    case 'unit-card':
      return <UnitBubble unit={m.payload} />
    case 'gallery':
      return <GalleryBubble images={m.payload.images} intro={m.payload.intro} />
    case 'usp-cards':
      return <UspCardsBubble cards={m.payload.cards} intro={m.payload.intro} />
    case 'location':
      return <LocationBubble location={m.payload.location} projectName={m.payload.projectName} />
    case 'site-plan':
      return (
        <SitePlanBubble
          sitePlan={m.payload.sitePlan}
          units={m.payload.units}
          persona={m.payload.persona}
          onUnitView={onUnitView}
          onCalcInteract={onCalcInteract}
          onCredionRequest={onCredionRequest}
        />
      )
    case 'site-plan-svg':
      return (
        <SitePlanPolygonBubble
          sitePlan={m.payload.sitePlan}
          units={m.payload.units}
          persona={m.payload.persona}
          onUnitView={onUnitView}
          onCalcInteract={onCalcInteract}
          onCredionRequest={onCredionRequest}
        />
      )
    case 'warm-handoff':
      return (
        <WarmHandoffBubble
          copy={m.payload.copy}
          salesTeam={m.payload.salesTeam}
          hasPhone={m.payload.hasPhone}
          waLink={m.payload.waLink}
          phoneLink={m.payload.phoneLink}
          phoneDisplay={m.payload.phoneDisplay}
          outcome={m.payload.outcome}
          onCallback={() => onHandoffAction && onHandoffAction(m.id, 'callback')}
          onWhatsapp={(e) => {
            if (onWaRequest) onWaRequest(e, m.payload.waSummary || '', 'warm-handoff')
            if (onHandoffAction) onHandoffAction(m.id, 'whatsapp')
          }}
          onPhone={() => onHandoffAction && onHandoffAction(m.id, 'phone')}
          onDismiss={() => onHandoffAction && onHandoffAction(m.id, 'dismissed')}
        />
      )
    case 'service-card':
      return (
        <ServiceCardBubble
          unit={m.payload.unit}
          copy={m.payload.copy}
          salesTeam={m.payload.salesTeam}
          hasPhone={m.payload.hasPhone}
          phoneDisplay={m.payload.phoneDisplay}
          waLink={m.payload.waLink}
          phoneLink={m.payload.phoneLink}
          phoneTextDisplay={m.payload.phoneTextDisplay}
          outcome={m.payload.outcome}
          onCallback={() => onServiceCardAction && onServiceCardAction(m.id, 'callback')}
          onWhatsapp={(e) => {
            if (onWaRequest) onWaRequest(e, m.payload.waSummary || '', 'service-card')
            if (onServiceCardAction) onServiceCardAction(m.id, 'whatsapp')
          }}
          onPhone={() => onServiceCardAction && onServiceCardAction(m.id, 'phone')}
          onMoreInfo={() => onServiceCardAction && onServiceCardAction(m.id, 'moreinfo')}
          onSubmitPhone={(text) => onServiceCardSubmitPhone && onServiceCardSubmitPhone(m.id, text)}
        />
      )
    case 'highlights':
      return <HighlightsBubble highlights={m.payload.highlights} intro={m.payload.intro} />
    case 'process':
      return <ProcessBubble steps={m.payload.steps} />
    case 'planning':
      return <PlanningBubble planning={m.payload.planning} />
    case 'investor':
      return <InvestorBubble benefits={m.payload.benefits} investor={m.payload.investor} intro={m.payload.intro} />
    case 'price':
      return <PriceBubble units={m.payload.units} note={m.payload.note} />
    case 'price-compare':
      return <PriceCompareBubble priceComparison={m.payload.priceComparison} />
    case 'brochure':
      return <BrochureBubble url={m.payload.url} hero={m.payload.hero} projectName={m.payload.projectName} />
    case 'lead-form':
      return <LeadFormBubble onSubmit={onLeadFormSubmit} variant={m.payload?.variant} />
    case 'm2-meter':
      return <M2MeterBubble onSubmit={onM2Submit} />
    case 'location-select':
      return <LocationSelectBubble onSubmit={onLocationSubmit} />
    case 'region-select':
      return <RegionSelectBubble onSubmit={onRegionSubmit} />
    case 'config-multi':
      return (
        <ConfigMultiSelectBubble
          options={m.payload?.options}
          label={m.payload?.label}
          onSubmit={(ids, labels) => onConfigMultiSubmit && onConfigMultiSubmit(m.payload?.stepKey, ids, labels)}
        />
      )
    case 'cta-card':
      return (
        <CtaBubble
          waLink={m.payload.waLink}
          phoneLink={m.payload.phoneLink}
          phoneDisplay={m.payload.phoneDisplay}
          portalUrl={m.payload.portalUrl}
          portalLabel={m.payload.portalLabel}
          intro={m.payload.intro}
          summary={m.payload.summary}
          seenTopics={m.payload.seenTopics}
          onTopicJump={onTopicJump}
          onWhatsapp={(e) => onWaRequest && onWaRequest(e, m.payload.waSummary || m.payload.summary || '', 'cta-card')}
          onBrochure={m.payload.hideBrochure ? null : onBrochure}
          onPortalClick={onPortalClick}
          onReset={m.payload.hideReset ? null : onReset}
        />
      )
    default:
      return null
  }
}

// Lichtgewicht summary van een bubble voor analytics-payload.
// Houdt event-grootte klein (geen full content/images), wel genoeg
// signaal om in admin te kunnen sorteren/groeperen.
function bubbleSummary(m) {
  const p = m.payload || {}
  switch (m.kind) {
    case 'unit-card':     return { unitId: p?.id, unitType: p?.type }
    case 'gallery':       return { count: Array.isArray(p?.images) ? p.images.length : 0 }
    case 'usp-cards':     return { count: Array.isArray(p?.cards) ? p.cards.length : 0 }
    case 'site-plan':     return { persona: p?.persona }
    case 'site-plan-svg': return { persona: p?.persona }
    case 'price':         return { count: Array.isArray(p?.units) ? p.units.length : 0 }
    case 'warm-handoff':  return { hasPhone: !!p?.hasPhone }
    case 'service-card':  return { unitId: p?.unit?.id, hasPhone: !!p?.hasPhone }
    case 'content-card':  return { tag: p?.tag }
    default:              return {}
  }
}
