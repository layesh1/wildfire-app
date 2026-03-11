'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Send } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const INTRO: Message = {
  role: 'assistant',
  content: `Hi! I'm Flameo 🔥\n\nI'm your personal wildfire safety assistant — here to help you understand evacuation alerts, plan your escape route, protect the people and pets in your care, and stay calm when things feel overwhelming.\n\nYou can ask me things like:\n• "Is my area at risk?"\n• "What should be in a go-bag?"\n• "How do I evacuate with someone in a wheelchair?"\n\nWhat can I help you with?`,
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
      setMessages(m => [...m, { role: 'assistant', content: 'I couldn\'t reach the server. Please try again in a moment.' }])
    }
    setLoading(false)
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-4 z-50 flex flex-col bg-ash-900 border border-ash-700 rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: 360, maxHeight: '72vh' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 bg-ash-800 border-b border-ash-700 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-ember-500/20 border border-ember-500/40 flex items-center justify-center text-lg select-none">
              🔥
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm">Flameo</div>
              <div className="text-ash-400 text-xs">Wildfire safety assistant · always here</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-ash-400 hover:text-white p-1.5 rounded-lg hover:bg-ash-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-ember-500/20 border border-ember-500/30 flex items-center justify-center text-xs mt-0.5 shrink-0 select-none">
                    🔥
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-ember-500/20 text-white rounded-tr-sm'
                      : 'bg-ash-800 text-ash-200 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-lg bg-ember-500/20 border border-ember-500/30 flex items-center justify-center text-xs shrink-0 select-none">🔥</div>
                <div className="bg-ash-800 rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map(delay => (
                      <div
                        key={delay}
                        className="w-1.5 h-1.5 bg-ash-500 rounded-full animate-bounce"
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
          <div className="p-3 border-t border-ash-700 shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask Flameo anything…"
                className="flex-1 bg-ash-800 text-white text-sm rounded-xl px-3 py-2 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="p-2 bg-ember-500/20 border border-ember-500/40 rounded-xl text-ember-400 hover:bg-ember-500/30 transition-colors disabled:opacity-40 shrink-0"
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
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-2xl bg-ember-500 hover:bg-ember-400 shadow-lg shadow-ember-500/40 flex items-center justify-center text-2xl transition-all duration-200 hover:scale-105 active:scale-95 select-none"
        title="Chat with Flameo"
        aria-label="Open Flameo chat"
      >
        <span className={`transition-all duration-200 ${open ? 'scale-75 opacity-0 absolute' : 'scale-100 opacity-100'}`}>🔥</span>
        <X className={`w-5 h-5 text-white absolute transition-all duration-200 ${open ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
      </button>

      {/* Notification dot on first load */}
      {!hasOpened && (
        <div className="fixed bottom-[62px] right-3 z-50 w-4 h-4 rounded-full bg-signal-danger border-2 border-ash-950 animate-pulse pointer-events-none" />
      )}
    </>
  )
}
