'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, User, Loader, Sparkles } from 'lucide-react'
import { AIChatInput } from '@/components/ui/ai-chat-input'
import { motion } from 'framer-motion'
import { FlameoActionChips, type Chip } from '@/components/flameo/FlameoActionChips'
import { flameoActionsToChips, partitionAiActions } from '@/lib/flameo-phase-c-client'
import type { FlameoNavConsumer } from '@/lib/flameo-phase-c-tools'

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('### ')) {
      elements.push(<p key={i} className="font-semibold text-gray-800 mt-2 mb-1">{inlineMarkdown(line.slice(4))}</p>)
    } else if (line.startsWith('## ')) {
      elements.push(<p key={i} className="font-bold text-gray-800 mt-2 mb-1">{inlineMarkdown(line.slice(3))}</p>)
    } else if (line.match(/^[-*] /)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1 pl-1">
          {items.map((item, j) => <li key={j} className="text-gray-600">{inlineMarkdown(item)}</li>)}
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
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-gray-800">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  chips?: Chip[]
}

const FLAMEO_PLACEHOLDERS = [
  "Hi, I'm Flameo! Ask me anything about wildfire safety...",
  'What should I pack in my go-bag?',
  'How early should I evacuate before an order?',
  'What signals should I watch for before an alert?',
  'Where can I find accessible evacuation shelters?',
  'How do I create an emergency plan for my family?',
  'What do I do if I have mobility needs during evacuation?',
]

const STARTER_PROMPTS = [
  'What should I do if I need to evacuate with mobility needs?',
  'How do I build an emergency kit for my family?',
  'What signals should I watch for before an official order?',
  'Where can I find accessible evacuation shelters near me?',
  'Open the evacuation map for me',
  'Show me nearby shelters',
]

export function FlameoAskPage({ variant }: { variant: FlameoNavConsumer }) {
  const pathname = usePathname()
  const navBase = pathname?.startsWith('/m/') ? 'mobile' : 'desktop'
  const isMobileEvacHubAi =
    pathname === '/m/dashboard/home/ai' || pathname === '/m/dashboard/evacuee/ai'
  const mobileBackHref =
    pathname === '/m/dashboard/evacuee/ai' ? '/m/dashboard/evacuee' : '/m/dashboard/home'

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello, I'm Flameo — your wildfire evacuation guide. I monitor all signal channels so you don't have to wait for an official order that may never come.\n\nAsk me anything about wildfire safety, evacuation steps, go-bag packing, or finding shelter. I can **open the map**, **show shelters**, or **start check-in** when you ask.",
    },
  ])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const hasMessages = messages.length > 1

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    const userText = text.trim()
    if (!userText || loading) return

    const next: Message[] = [...messages, { role: 'user', content: userText }]
    setMessages(next)
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: 'FLAMEO',
          flameoRole: variant,
          messages: next.map(m => ({ role: m.role, content: m.content })),
          flameoNavContext: { consumer: variant, navBase },
        }),
      })
      const data = await res.json()
      let chips: Chip[] | undefined
      if (Array.isArray(data.actions) && data.actions.length > 0) {
        const { flameo } = partitionAiActions(data.actions)
        chips = flameoActionsToChips(flameo, variant, navBase)
        if (chips.length === 0) chips = undefined
      }
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.content || 'Sorry, I encountered an error. Please try again.',
          chips,
        },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please check your connection and try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const roleLabel = variant === 'evacuee' ? 'EVACUEE · FLAMEO AI' : 'CAREGIVER · FLAMEO AI'

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      {isMobileEvacHubAi && (
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
          <Link
            href={mobileBackHref}
            className="inline-flex items-center gap-0.5 text-sm font-semibold text-forest-700"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" />
            Hub
          </Link>
        </div>
      )}
      <div className="shrink-0 px-4 sm:px-8 pt-4 sm:pt-6 pb-4 sm:pb-5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 text-forest-600 text-xs sm:text-sm font-medium mb-2">
          <img src="/flameo1.png" alt="Flameo" className="w-4 h-4 object-contain" />
          {roleLabel}
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Ask FlameoAI</h1>
        <p className="text-gray-500 text-xs sm:text-sm">
          AI-powered evacuation guidance. Monitors all signal channels — not just official orders.
        </p>
      </div>

      {!hasMessages && (
        <div className="flex flex-col items-center justify-center flex-1 min-h-0 px-4 sm:px-6 pb-8 text-center overflow-y-auto">
          <div className="relative mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-forest-50 border-2 border-forest-200 flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/flameo1.png" alt="Flameo" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>

          <p className="text-[11px] sm:text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 sm:px-4 py-1.5 mb-6 max-w-md">
            Supplements — does not replace — official emergency directives. Always follow local authorities.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl mb-8">
            {STARTER_PROMPTS.map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="text-left text-[11px] sm:text-xs p-3 sm:p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:border-forest-300 hover:bg-forest-50 hover:text-forest-700 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="w-full max-w-2xl">
            <AIChatInput placeholders={FLAMEO_PLACEHOLDERS} onSubmit={sendMessage} disabled={loading} />
          </div>
        </div>
      )}

      {hasMessages && (
        <>
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 min-h-0">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-forest-50 border border-forest-200 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                    <img src="/flameo1.png" alt="Flameo" className="w-5 h-5 object-contain" />
                  </div>
                )}
                <div className="max-w-[min(100%,28rem)]">
                  <div
                    className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-forest-600 text-white rounded-tr-none'
                        : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                  </div>
                  {msg.role === 'assistant' && msg.chips && msg.chips.length > 0 && (
                    <FlameoActionChips chips={msg.chips} variant="light" />
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                )}
              </motion.div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-forest-50 border border-forest-200 flex items-center justify-center shrink-0 overflow-hidden">
                  <img src="/flameo1.png" alt="Flameo" className="w-5 h-5 object-contain" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <Loader className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 px-3 sm:px-6 pb-4 sm:pb-6 pt-3 border-t border-gray-100 bg-white">
            <AIChatInput placeholders={FLAMEO_PLACEHOLDERS} onSubmit={sendMessage} disabled={loading} />
            <p className="mt-2 text-center text-gray-400 text-[10px] sm:text-xs">
              Flameo supplements — does not replace — official emergency directives. Call 911 in emergencies.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
