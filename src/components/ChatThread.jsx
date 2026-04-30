import { useEffect, useRef } from 'react'
import BotMessage from './BotMessage.jsx'
import UserMessage from './UserMessage.jsx'
import TypingIndicator from './TypingIndicator.jsx'
import ContentBubble from './ContentBubble.jsx'
import UnitBubble from './UnitBubble.jsx'
import InlineLeadForm from './InlineLeadForm.jsx'
import CtaBubble from './CtaBubble.jsx'
import GalleryBubble from './GalleryBubble.jsx'
import LocationBubble from './LocationBubble.jsx'
import SitePlanBubble from './SitePlanBubble.jsx'
import HighlightsBubble from './HighlightsBubble.jsx'
import ProcessBubble from './ProcessBubble.jsx'
import PlanningBubble from './PlanningBubble.jsx'
import InvestorBubble from './InvestorBubble.jsx'
import PriceBubble from './PriceBubble.jsx'

// scrollable chat thread auto scrollt naar laatste message
export default function ChatThread({ messages, onLeadSubmit, onBrochure, onReset }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3">
      {messages.map((m) => {
        switch (m.kind) {
          case 'bot-text':
            return <BotMessage key={m.id}>{m.text}</BotMessage>
          case 'user-text':
            return <UserMessage key={m.id}>{m.text}</UserMessage>
          case 'typing':
            return <TypingIndicator key={m.id} />
          case 'content-card':
            return (
              <ContentBubble
                key={m.id}
                tag={m.payload.tag}
                title={m.payload.title}
                body={m.payload.body}
                image={m.payload.image}
              />
            )
          case 'unit-card':
            return <UnitBubble key={m.id} unit={m.payload} />
          case 'gallery':
            return <GalleryBubble key={m.id} images={m.payload.images} intro={m.payload.intro} />
          case 'location':
            return <LocationBubble key={m.id} location={m.payload.location} projectName={m.payload.projectName} />
          case 'site-plan':
            return <SitePlanBubble key={m.id} sitePlan={m.payload.sitePlan} />
          case 'highlights':
            return <HighlightsBubble key={m.id} highlights={m.payload.highlights} intro={m.payload.intro} />
          case 'process':
            return <ProcessBubble key={m.id} steps={m.payload.steps} />
          case 'planning':
            return <PlanningBubble key={m.id} planning={m.payload.planning} />
          case 'investor':
            return <InvestorBubble key={m.id} benefits={m.payload.benefits} intro={m.payload.intro} />
          case 'price':
            return <PriceBubble key={m.id} units={m.payload.units} />
          case 'lead-form':
            return <InlineLeadForm key={m.id} onSubmit={onLeadSubmit} />
          case 'cta-card':
            return (
              <CtaBubble
                key={m.id}
                waLink={m.payload.waLink}
                summary={m.payload.summary}
                onBrochure={onBrochure}
                onReset={onReset}
              />
            )
          default:
            return null
        }
      })}
      <div ref={endRef} />
    </div>
  )
}
