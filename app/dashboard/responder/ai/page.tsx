'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, AlertTriangle, Flame } from 'lucide-react'
import { FlameoActionChips, type Chip } from '@/components/flameo/FlameoActionChips'
import { commandIntelActionsToChips, partitionAiActions } from '@/lib/flameo-phase-c-client'
import { useFlameoContext } from '@/hooks/useFlameoContext'
import { useFlameoHubAgentBridge } from '@/components/FlameoHubAgentBridge'
import { flameoGroundingBadgeText } from '@/lib/flameo-grounding-ui'

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('### ')) {
      elements.push(<p key={i} className="font-semibold text-white mt-2 mb-1">{inlineMarkdown(line.slice(4))}</p>)
    } else if (line.startsWith('## ')) {
      elements.push(<p key={i} className="font-bold text-white mt-2 mb-1">{inlineMarkdown(line.slice(3))}</p>)
    } else if (line.match(/^[-*] /)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1 pl-1">
          {items.map((item, j) => <li key={j} className="text-ash-200">{inlineMarkdown(item)}</li>)}
        </ul>
      )
      continue
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(<p key={i} className="leading-relaxed">{inlineMarkdown(line)}</p>)
    }
    i++
  }
  return <>{elements}</>
}

function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}

interface Message { role: 'user' | 'assistant'; content: string; chips?: Chip[] }

const STARTERS = [
  'What mutual aid resources are available near current high-risk incidents?',
  'Summarize evacuation coverage gaps for my jurisdiction based on verified perimeter data',
  'Which priority zones need engines based on active incidents in context?',
  'What resource categories should we pre-stage for rural high-SVI fires?',
  'Give a concise operational briefing from the current fire context',
]

export default function ResponderFlameoAiPage() {
  const flameo = useFlameoContext({ role: 'emergency_responder' })
  const { setPayload: setFlameoHubAgentPayload } = useFlameoHubAgentBridge()

  useEffect(() => {
    setFlameoHubAgentPayload({
      context: flameo.context,
      status: flameo.status,
      flameoRole: 'responder',
    })
  }, [flameo.context, flameo.status, setFlameoHubAgentPayload])

  const badgeLine = flameoGroundingBadgeText(flameo.context, flameo.status)

  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "**Flameo (field intel) online.** I use verified fire perimeter and incident data from your hub context. Ask for operational briefings, coverage gaps, or priority zones — I'll stay within confirmed data.\n\nHow can I assist?",
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(text?: string) {
    const content = text ?? input.trim()
    if (!content || loading) return
    setInput('')
    const next: Message[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          persona: 'FLAMEO',
          flameoRole: 'responder',
          ...(flameo.context ? { flameoContext: flameo.context } : {}),
        }),
      })
      const data = await res.json()
      let chips: Chip[] | undefined
      if (res.ok && Array.isArray(data.actions) && data.actions.length > 0) {
        const { intel } = partitionAiActions(data.actions)
        chips = commandIntelActionsToChips(intel)
        if (chips.length === 0) chips = undefined
      }
      setMessages(m => [
        ...m,
        { role: 'assistant', content: data.content ?? data.error ?? 'No response.', chips },
      ])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Connection error. Please try again.' }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full md:min-h-[calc(100dvh-5.5rem)]">
      <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-ash-800 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-ember-500/20 border border-ember-500/30 flex items-center justify-center">
          <Flame className="w-5 h-5 text-ember-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-bold text-white">Flameo · Field intelligence</div>
          <div className="text-ash-500 text-xs">Operational briefings for emergency responders</div>
          {badgeLine && (
            <div className="text-[11px] text-ash-500 mt-1 leading-tight">{badgeLine}</div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-signal-safe/10 border border-signal-safe/30 shrink-0">
          <div className="w-2 h-2 rounded-full bg-signal-safe animate-pulse" />
          <span className="text-signal-safe text-xs font-medium">Online</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-ember-500/20 border border-ember-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Flame className="w-4 h-4 text-ember-400" />
              </div>
            )}
            <div className="max-w-[min(100%,28rem)]">
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-ember-500/20 border border-ember-500/30 text-white rounded-tr-sm'
                    : 'bg-ash-800 border border-ash-700 text-ash-200 rounded-tl-sm'
                }`}
              >
                {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
              </div>
              {m.role === 'assistant' && m.chips && m.chips.length > 0 && (
                <FlameoActionChips chips={m.chips} variant="dark" />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-ember-500/20 border border-ember-500/30 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-ember-400" />
            </div>
            <div className="bg-ash-800 border border-ash-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-ash-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 sm:px-8 pb-4 flex flex-wrap gap-2">
          {STARTERS.map(s => (
            <button key={s} onClick={() => send(s)}
              className="px-3 py-2 rounded-lg text-xs border border-ash-700 text-ash-400 hover:text-white hover:border-ash-500 hover:bg-ash-800 transition-all text-left">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 sm:px-8 py-4 border-t border-ash-800 shrink-0">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <input
            className="flex-1 bg-ash-800 border border-ash-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-ember-500/60 placeholder:text-ash-500"
            placeholder="Ask for an operational briefing from verified incident data…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            translate="no"
            autoComplete="off"
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-ember-500/20 border border-ember-500/40 text-ember-300 hover:bg-ember-500/30 transition-colors disabled:opacity-40">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-2 max-w-3xl mx-auto">
          <AlertTriangle className="w-3 h-3 text-ash-600" />
          <p className="text-ash-600 text-xs">For situational awareness only. Always follow official ICS protocols.</p>
        </div>
      </div>
    </div>
  )
}
