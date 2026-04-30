import { useEffect, useRef } from 'react'
import BotMessage from './BotMessage.jsx'
import UserMessage from './UserMessage.jsx'
import TypingIndicator from './TypingIndicator.jsx'
import ContentBubble from './ContentBubble.jsx'
import UnitBubble from './UnitBubble.jsx'
import InlineLeadForm from './InlineLeadForm.jsx'
import CtaBubble from './CtaBubble.jsx'

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
            return (
              <BotMessage key={m.id}>
                {m.text}
              </BotMessage>
            )
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
