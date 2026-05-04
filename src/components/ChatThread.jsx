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
import BrochureBubble from './BrochureBubble.jsx'

// Scrollable chat thread. Bij nieuwe messages scrollen we zo dat
// het laatste user-bubble bovenaan komt te staan; de bot-replies daaronder
// blijven leesbaar zonder dat de bezoeker handmatig terug moet scrollen.
export default function ChatThread({ messages, onBrochure }) {
  const containerRef = useRef(null)
  const prevLengthRef = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const grew = messages.length > prevLengthRef.current
    prevLengthRef.current = messages.length
    if (!grew) return

    let lastUserIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].kind === 'user-text') {
        lastUserIdx = i
        break
      }
    }

    if (lastUserIdx === -1) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      return
    }

    const userEl = container.querySelector(`[data-msg-idx="${lastUserIdx}"]`)
    if (userEl) {
      const containerRect = container.getBoundingClientRect()
      const userRect = userEl.getBoundingClientRect()
      const offsetTop = userRect.top - containerRect.top + container.scrollTop
      container.scrollTo({ top: Math.max(0, offsetTop - 16), behavior: 'smooth' })
    } else {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
  }, [messages.length])

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3">
      {messages.map((m, i) => (
        <div key={m.id} data-msg-idx={i}>
          {renderMessage(m, { onBrochure })}
        </div>
      ))}
    </div>
  )
}

function renderMessage(m, { onBrochure }) {
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
      return <SitePlanBubble sitePlan={m.payload.sitePlan} units={m.payload.units} />
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
          onBrochure={m.payload.hideBrochure ? null : onBrochure}
        />
      )
    default:
      return null
  }
}
