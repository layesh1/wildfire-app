'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Send } from 'lucide-react'

function FlameoIcon({ size = 32 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/flameo1.png" alt="Flameo" width={size} height={size} style={{ objectFit: 'contain' }} />
  )
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const INTRO: Message = {
  role: 'assistant',
  content: `Hi! I'm Flameo!\n\nI'm your personal wildfire safety assistant — here to help you understand evacuation alerts, plan your escape route, protect the people and pets in your care, and stay calm when things feel overwhelming.\n\nYou can ask me things like:\n• "Is my area at risk?"\n• "What should be in a go-bag?"\n• "How do I evacuate with someone in a wheelchair?"\n\nWhat can I help you with?`,
}

export default function FlameoChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([INTRO])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [messages, open])

  useEffect(() => {
    const seen = typeof window !== 'undefined' && localStorage.getItem('wfa_flameo_intro')
    if (!seen) {
      const t = setTimeout(() => setShowIntro(true), 1800)
      return () => clearTimeout(t)
    }
  }, [])

  function dismissIntro() {
    setShowIntro(false)
    if (typeof window !== 'undefined') localStorage.setItem('wfa_flameo_intro', '1')
  }

  function handleOpen() {
    setOpen(v => !v)
    setHasOpened(true)
    dismissIntro()
  }

  async function send() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], persona: 'SAFE-PATH' }),
      })
      const { content } = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: content || 'Sorry, something went wrong.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "I couldn't reach the server. Please try again in a moment." }])
    }
    setLoading(false)
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-4 z-50 flex flex-col bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
          style={{ width: 360, maxHeight: '72vh' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-100 shrink-0" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' }}>
            <div className="w-9 h-9 rounded-xl bg-white border border-forest-200 flex items-center justify-center select-none shadow-sm">
              <FlameoIcon size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 font-semibold text-sm">Flameo</div>
              <div className="text-gray-500 text-xs">Wildfire safety assistant · always here</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-white border border-forest-200 flex items-center justify-center mt-0.5 shrink-0 select-none shadow-sm">
                    <FlameoIcon size={18} />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'text-white rounded-tr-sm'
                      : 'bg-white text-gray-900 border border-gray-200 rounded-tl-sm'
                  }`}
                  style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : undefined}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-lg bg-white border border-forest-200 flex items-center justify-center shrink-0 select-none shadow-sm">
                  <FlameoIcon size={18} />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map(delay => (
                      <div
                        key={delay}
                        className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 shrink-0 bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask Flameo anything…"
                className="flex-1 bg-white text-gray-900 text-sm rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-forest-400 placeholder:text-gray-500"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="p-2 bg-forest-600 hover:bg-forest-700 border border-forest-600 rounded-xl text-white transition-colors disabled:opacity-40 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-4 right-4 z-50 w-16 h-16 rounded-2xl bg-forest-600 hover:bg-forest-700 shadow-xl shadow-forest-600/30 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 select-none"
        title="Chat with Flameo"
        aria-label="Open Flameo chat"
      >
        <span className={`transition-all duration-200 ${open ? 'scale-75 opacity-0 absolute' : 'scale-100 opacity-100'}`}><FlameoIcon size={40} /></span>
        <X className={`w-6 h-6 text-white absolute transition-all duration-200 ${open ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
      </button>

      {/* Meet Flameo intro popup */}
      {showIntro && !open && (
        <div className="fixed bottom-20 right-4 z-50 animate-fade-up">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-56 relative">
            <button onClick={dismissIntro} className="absolute top-2 right-2 text-gray-300 hover:text-gray-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2.5 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/flameo1.png" alt="Flameo" width={32} height={32} style={{ objectFit: 'contain' }} />
              <div className="font-semibold text-gray-900 text-sm">Meet Flameo!</div>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed mb-3">
              Your personal wildfire safety assistant. Ask about evacuation routes, go-bags, and alerts.
            </p>
            <button
              onClick={() => { setOpen(true); setHasOpened(true); dismissIntro() }}
              className="w-full bg-forest-600 hover:bg-forest-700 text-white text-xs font-semibold py-2 rounded-xl transition-colors"
            >
              Chat with Flameo
            </button>
            {/* Arrow pointing down to FAB */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r border-b border-gray-200 rotate-45" />
          </div>
        </div>
      )}

      {/* Notification dot on first load */}
      {!hasOpened && (
        <div className="fixed bottom-[68px] right-3 z-50 w-4 h-4 rounded-full bg-red-500 border-2 border-white animate-pulse pointer-events-none" />
      )}
    </>
  )
}
