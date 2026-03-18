'use client'
import { useState, useRef, useEffect } from 'react'
import { Flame, User, Loader, Sparkles } from 'lucide-react'
import { PlaceholdersAndVanishInput } from '@/components/ui/placeholders-and-vanish-input'
import { motion } from 'framer-motion'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const FLAMEO_PLACEHOLDERS = [
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
]

export default function SafePathAIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello, I'm Flameo — your wildfire evacuation guide. I monitor all signal channels so you don't have to wait for an official order that may never come.\n\nAsk me anything about wildfire safety, evacuation steps, go-bag packing, or finding shelter.",
    },
  ])
  const [pendingInput, setPendingInput] = useState('')
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
    setPendingInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: 'SAFE-PATH',
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content || 'Sorry, I encountered an error. Please try again.',
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please check your connection and try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleVanishSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pendingInput.trim()) sendMessage(pendingInput)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="shrink-0 px-6 sm:px-8 pt-8 pb-5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 text-forest-600 text-sm font-medium mb-3">
          <Flame className="w-4 h-4" />
          CAREGIVER · FLAMEO AI
        </div>
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-1">Ask Flameo</h1>
        <p className="text-gray-500 text-sm">
          AI-powered evacuation guidance. Monitors all signal channels — not just official orders.
        </p>
      </div>

      {/* Empty state */}
      {!hasMessages && (
        <div className="flex flex-col items-center justify-center flex-1 px-6 pb-8 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-forest-50 border-2 border-forest-200 flex items-center justify-center shadow-lg">
              <Flame className="w-9 h-9 text-forest-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>

          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 mb-8">
            Supplements — does not replace — official emergency directives. Always follow local authorities.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl mb-10">
            {STARTER_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-left text-xs p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:border-forest-300 hover:bg-forest-50 hover:text-forest-700 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="w-full max-w-2xl">
            <PlaceholdersAndVanishInput
              placeholders={FLAMEO_PLACEHOLDERS}
              onChange={e => setPendingInput(e.target.value)}
              onSubmit={handleVanishSubmit}
            />
          </div>
        </div>
      )}

      {/* Messages */}
      {hasMessages && (
        <>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 min-h-0">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-forest-100 border border-forest-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Flame className="w-3.5 h-3.5 text-forest-600" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-forest-600 text-white rounded-tr-none'
                    : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none shadow-sm'
                }`}>
                  {msg.content}
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
                <div className="w-7 h-7 rounded-full bg-forest-100 border border-forest-200 flex items-center justify-center shrink-0">
                  <Flame className="w-3.5 h-3.5 text-forest-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <Loader className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 px-4 sm:px-6 pb-6 pt-2 border-t border-gray-100 bg-white">
            <PlaceholdersAndVanishInput
              placeholders={FLAMEO_PLACEHOLDERS}
              onChange={e => setPendingInput(e.target.value)}
              onSubmit={handleVanishSubmit}
            />
            <p className="mt-2 text-center text-gray-400 text-xs">
              Flameo supplements — does not replace — official emergency directives. Call 911 in emergencies.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
