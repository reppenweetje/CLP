import { useEffect, useRef } from 'react'
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
import HighlightsBubble from './HighlightsBubble.jsx'
import ProcessBubble from './ProcessBubble.jsx'
import PlanningBubble from './PlanningBubble.jsx'
import InvestorBubble from './InvestorBubble.jsx'
import PriceBubble from './PriceBubble.jsx'
import PriceCompareBubble from './PriceCompareBubble.jsx'
import BrochureBubble from './BrochureBubble.jsx'
import WarmHandoffBubble from './WarmHandoffBubble.jsx'
import ServiceCardBubble from './ServiceCardBubble.jsx'

// Scrollable chat thread. Bij nieuwe messages scrollen we zo dat
// het laatste user-bubble bovenaan komt te staan; de bot-replies daaronder
// blijven leesbaar zonder dat de bezoeker handmatig terug moet scrollen.
export default function ChatThread({ messages, showTyping = false, onBrochure, onReset, onUnitView, onCalcInteract, onHandoffAction, onServiceCardAction, onServiceCardSubmitPhone, onWaRequest }) {
  const containerRef = useRef(null)
  const prevLengthRef = useRef(0)

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
        <div key={m.id} data-msg-idx={i}>
          {renderMessage(m, { onBrochure, onReset, onUnitView, onCalcInteract, onHandoffAction, onServiceCardAction, onServiceCardSubmitPhone, onWaRequest })}
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

function renderMessage(m, { onBrochure, onReset, onUnitView, onCalcInteract, onHandoffAction, onServiceCardAction, onServiceCardSubmitPhone, onWaRequest }) {
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
        />
      )
    case 'warm-handoff':
      return (
        <WarmHandoffBubble
          persona={m.payload.persona}
          signals={m.payload.signals}
          unitFocus={m.payload.unitFocus}
          name={m.payload.name}
          hasPhone={m.payload.hasPhone}
          phoneDeclined={m.payload.phoneDeclined}
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
          persona={m.payload.persona}
          signals={m.payload.signals}
          name={m.payload.name}
          hasPhone={m.payload.hasPhone}
          phoneDisplay={m.payload.phoneDisplay}
          phoneDeclined={m.payload.phoneDeclined}
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
      return <PriceBubble units={m.payload.units} />
    case 'price-compare':
      return <PriceCompareBubble priceComparison={m.payload.priceComparison} />
    case 'brochure':
      return <BrochureBubble url={m.payload.url} hero={m.payload.hero} projectName={m.payload.projectName} />
    case 'cta-card':
      return (
        <CtaBubble
          waLink={m.payload.waLink}
          phoneLink={m.payload.phoneLink}
          phoneDisplay={m.payload.phoneDisplay}
          intro={m.payload.intro}
          summary={m.payload.summary}
          onWhatsapp={(e) => onWaRequest && onWaRequest(e, m.payload.waSummary || m.payload.summary || '', 'cta-card')}
          onBrochure={m.payload.hideBrochure ? null : onBrochure}
          onReset={onReset}
        />
      )
    default:
      return null
  }
}
