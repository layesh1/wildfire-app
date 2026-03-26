'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, CornerRightUp } from 'lucide-react'
import { useAutoResizeTextarea } from '@/components/hooks/use-auto-resize-textarea'
import { ResponseStream } from '@/components/ui/response-stream'

interface Message { role: 'user' | 'assistant'; content: string }

const INTRO: Message = {
  role: 'assistant',
  content: `Hi! I'm Flameo!\n\nI'm your personal wildfire safety assistant. Ask me about evacuation routes, go-bags, shelter locations, or what to do right now.\n\nWhat can I help you with?`,
}

export default function MobileFlameo() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([INTRO])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [latestIdx, setLatestIdx] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 40, maxHeight: 100 })

  useEffect(() => { setMounted(true) }, [])

  // Load/save chat history
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wfa_flameo_history') || 'null')
      if (Array.isArray(saved) && saved.length > 0) setMessages(saved)
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('wfa_flameo_history', JSON.stringify(messages)) } catch {}
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [messages, open])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    setMessages(m => [...m, userMsg])
    setInput('')
    adjustHeight(true)
    setLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], persona: 'FLAMEO' }),
      })
      const data = await res.json()
      const reply = res.ok ? (data.content || 'No response — try again.') : "I'm having trouble right now. Try again in a moment."
      setMessages(m => { const next = [...m, { role: 'assistant' as const, content: reply }]; setLatestIdx(next.length - 1); return next })
    } catch {
      setMessages(m => { const next = [...m, { role: 'assistant' as const, content: "Can't reach server. Check connection." }]; setLatestIdx(next.length - 1); return next })
    }
    setLoading(false)
  }

  if (!mounted) return null

  return createPortal(
    <>
      {/* Flameo FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed z-[1100] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px)', right: 16, background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
        aria-label="Open Flameo chat"
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <img src="/flameo1.png" alt="Flameo" width={36} height={36} style={{ objectFit: 'contain' }} />
        }
      </button>

      {/* Chat sheet — slides up from bottom */}
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-[1050] flex flex-col bg-white rounded-t-3xl shadow-2xl"
          style={{ height: '70dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Handle + header */}
          <div className="flex flex-col items-center pt-2.5 pb-3 border-b border-gray-100 shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200 mb-3" />
            <div className="flex items-center gap-2">
              <img src="/flameo1.png" alt="Flameo" width={24} height={24} style={{ objectFit: 'contain' }} />
              <span className="font-semibold text-gray-900 text-sm">Flameo · Wildfire Assistant</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-white border border-green-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <img src="/flameo1.png" alt="Flameo" width={16} height={16} style={{ objectFit: 'contain' }} />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user' ? 'text-white rounded-tr-sm' : 'bg-white text-gray-900 border border-gray-200 rounded-tl-sm'
                  }`}
                  style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : undefined}
                >
                  {msg.role === 'assistant' && i === latestIdx
                    ? <ResponseStream textStream={msg.content} mode="typewriter" speed={75} as="span" />
                    : msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-lg bg-white border border-green-200 flex items-center justify-center shrink-0 shadow-sm">
                  <img src="/flameo1.png" alt="Flameo" width={16} height={16} style={{ objectFit: 'contain' }} />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 bg-white shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); adjustHeight() }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask Flameo anything…"
                disabled={loading}
                rows={1}
                className="flex-1 bg-gray-50 text-gray-900 text-sm rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-green-400 placeholder:text-gray-400 resize-none overflow-hidden"
                style={{ minHeight: 40, maxHeight: 100 }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="p-2 bg-green-600 hover:bg-green-700 rounded-xl text-white transition-colors disabled:opacity-40 mb-0.5 shrink-0"
              >
                <CornerRightUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
