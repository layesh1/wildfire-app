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
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [messages, open])

  function handleOpen() {
    setOpen(v => !v)
    setHasOpened(true)
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
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-2xl bg-forest-50 hover:bg-forest-100 border border-forest-200 shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 select-none"
        title="Chat with Flameo"
        aria-label="Open Flameo chat"
      >
        <span className={`transition-all duration-200 ${open ? 'scale-75 opacity-0 absolute' : 'scale-100 opacity-100'}`}><FlameoIcon size={36} /></span>
        <X className={`w-5 h-5 text-forest-600 absolute transition-all duration-200 ${open ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
      </button>

      {/* Notification dot + tooltip on first load */}
      {!hasOpened && (
        <>
          <div className="fixed bottom-[62px] right-3 z-50 w-4 h-4 rounded-full bg-red-500 border-2 border-white animate-pulse pointer-events-none" />
          <div className="fixed bottom-20 right-20 z-50 pointer-events-none animate-fade-up">
            <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg max-w-[180px]">
              <p className="text-gray-700 text-xs font-medium leading-snug">Ask Flameo about fire safety &amp; evacuation</p>
            </div>
          </div>
        </>
      )}
    </>
  )
}
