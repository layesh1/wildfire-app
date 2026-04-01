'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { X, CornerRightUp, Trash2 } from 'lucide-react'
import { useAutoResizeTextarea } from '@/components/hooks/use-auto-resize-textarea'
import { LiquidMetalFab } from '@/components/ui/liquid-metal-button'
import { ResponseStream } from '@/components/ui/response-stream'
import { FlameoActionChips, type Chip } from '@/components/flameo/FlameoActionChips'
import { useFlameoNavContext } from '@/hooks/useFlameoNavContext'
import { commandIntelActionsToChips, flameoActionsToChips, partitionAiActions } from '@/lib/flameo-phase-c-client'
import type { FlameoContext, FlameoContextStatus, FlameoAiRole } from '@/lib/flameo-context-types'
import { flameoGroundingBadgeText } from '@/lib/flameo-grounding-ui'
import { useFlameoHubAgentBridge } from '@/components/FlameoHubAgentBridge'
import { isFlameoDashboardAiFullScreenPath } from '@/lib/flameo-ai-fullscreen-routes'

// ── Smoke particle ────────────────────────────────────────────────────────────
const FIRE_COLORS = [
  [180, 180, 180], // grey smoke
  [180, 180, 180], // grey smoke
  [180, 180, 180], // grey smoke
  [180, 180, 180], // grey smoke (4:1 grey to fire)
  [255, 100,  15], // bright ember orange
]

class SmokeParticle {
  x: number; y: number; size: number; speedX: number; speedY: number
  life: number; initialSize: number; color: number[]
  constructor(x: number, y: number) {
    this.x = x; this.y = y
    this.size = Math.random() * 5 + 2
    this.speedX = Math.random() * 2 - 1
    this.speedY = -Math.random() * 2.5 - 0.8
    this.life = 100; this.initialSize = this.size
    this.color = FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)]
  }
  update() {
    this.x += this.speedX; this.y += this.speedY
    this.life -= 1.0
    this.size = Math.max(0, this.initialSize * (this.life / 100))
  }
}

function FabSmoke({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<SmokeParticle[]>([])
  const rafRef = useRef<number>(0)
  const activeRef = useRef(active)
  const frameRef = useRef(0)
  useEffect(() => { activeRef.current = active }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = 160; canvas.height = 400
    const cx = 80, cy = 395 // canvas bottom = icon centre, cy near canvas bottom

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frameRef.current++
      if (activeRef.current && frameRef.current % 3 === 0) {
        particlesRef.current.push(new SmokeParticle(
          cx + (Math.random() * 20 - 10),
          cy + (Math.random() * 10 - 5)
        ))
      }
      particlesRef.current = particlesRef.current.filter(p => p.life > 0 && p.size > 0)
      for (const p of particlesRef.current) {
        p.update()
        if (p.size > 0) {
          const [r, g, b] = p.color
          ctx.fillStyle = `rgba(${r},${g},${b},${(p.life / 100) * 0.85})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // 160x400 canvas — bottom aligned with FAB bottom, smoke rises freely upward
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none"
      style={{
        position: 'absolute',
        width: 160, height: 400,
        bottom: 32, left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1,
      }}
    />
  )
}

function FlameoIcon({ size = 32, src = '/flameo1.png' }: { size?: number; src?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Flameo" width={size} height={size} style={{ objectFit: 'contain' }} />
  )
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  chips?: Chip[]
}

const INTRO: Message = {
  role: 'assistant',
  content: `Hi! I'm Flameo!\n\nI'm your personal wildfire safety assistant — here to help you understand evacuation alerts, plan your escape route, protect the people and pets in your care, and stay calm when things feel overwhelming.\n\nYou can ask me things like:\n• "Is my area at risk?"\n• "What should be in a go-bag?"\n• "How do I evacuate with someone in a wheelchair?"\n\nWhat can I help you with?`,
}

export type FlameoChatProps = {
  context?: FlameoContext | null
  status?: FlameoContextStatus | null
  flameoRole?: FlameoAiRole
}

export default function FlameoChat({
  context: contextProp,
  status: statusProp,
  flameoRole: flameoRoleProp,
}: FlameoChatProps = {}) {
  const pathname = usePathname()
  const isDispatcher =
    pathname?.startsWith('/dashboard/responder') || pathname?.startsWith('/m/dashboard/responder') || false
  const { payload: hubPayload } = useFlameoHubAgentBridge()
  const flameoContext = contextProp ?? hubPayload?.context ?? undefined
  const flameoStatus = statusProp ?? hubPayload?.status ?? undefined
  const flameoRole: FlameoAiRole =
    flameoRoleProp
    ?? hubPayload?.flameoRole
    ?? (isDispatcher ? 'responder' : pathname?.includes('/evacuee') ? 'evacuee' : 'caregiver')
  const badgeLine = flameoGroundingBadgeText(
    flameoContext ?? null,
    flameoStatus ?? null
  )
  const { flameoNavContext, consumer, navBase } = useFlameoNavContext()
  const flameoSrc = isDispatcher ? '/Image (8).png' : '/flameo1.png'
  const fabStyle = { bottom: 16, right: 16, left: 'auto' } as React.CSSProperties
  const popupStyle = { bottom: 96, right: 16, left: 'auto' } as React.CSSProperties

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([INTRO])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [latestAssistantIdx, setLatestAssistantIdx] = useState<number | null>(null)
  const [showIntro, setShowIntro] = useState(false)
  const [fabHovered, setFabHovered] = useState(false)
  const [mounted, setMounted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 40, maxHeight: 120 })

  // Load chat history from localStorage on mount (client-only, avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wfa_flameo_history') || 'null')
      if (Array.isArray(saved) && saved.length > 0) setMessages(saved)
    } catch {}
    setHistoryLoaded(true)
  }, [])

  // Persist chat history on every change (only after initial load to avoid overwriting with INTRO)
  useEffect(() => {
    if (!historyLoaded) return
    try { localStorage.setItem('wfa_flameo_history', JSON.stringify(messages)) } catch {}
  }, [messages, historyLoaded])

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [messages, open, textareaRef])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    function onOpenFromHub() {
      setOpen(true)
      setShowIntro(false)
    }
    window.addEventListener('wfa-flameo-open', onOpenFromHub)
    return () => window.removeEventListener('wfa-flameo-open', onOpenFromHub)
  }, [])

  // Briefing + chat entry live in My Hub / My alerts — skip floating "Meet Flameo" on consumer hubs
  useEffect(() => {
    setShowIntro(false)
  }, [pathname])

  function clearHistory() {
    setMessages([INTRO])
    setLatestAssistantIdx(null)
    try { localStorage.removeItem('wfa_flameo_history') } catch {}
  }

  function dismissIntro() {
    setShowIntro(false)
  }

  function handleOpen() {
    setOpen(v => !v)
    dismissIntro()
  }

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
        body: JSON.stringify({
          messages: [...messages, userMsg],
          persona: 'FLAMEO',
          flameoRole,
          flameoNavContext,
          ...(flameoContext ? { flameoContext } : {}),
        }),
      })
      const data = await res.json()
      let reply: string
      let chips: Chip[] | undefined
      if (!res.ok) {
        if (res.status === 429) {
          reply = data.error ?? "You've sent a lot of messages recently — please wait a minute and try again."
        } else if (res.status === 400) {
          reply = "I couldn't process that message. Please try rephrasing."
        } else {
          reply = "I'm having trouble right now. Please try again in a moment."
        }
      } else {
        reply = data.content || "I didn't get a response — please try again."
        if (Array.isArray(data.actions) && data.actions.length > 0) {
          const apiRole = (data.flameoRole as FlameoAiRole | undefined) ?? flameoRole
          if (apiRole === 'responder') {
            const { intel } = partitionAiActions(data.actions)
            chips = commandIntelActionsToChips(intel)
          } else {
            const { flameo } = partitionAiActions(data.actions)
            chips = flameoActionsToChips(flameo, consumer, navBase)
          }
          if (chips.length === 0) chips = undefined
        }
      }
      setMessages(m => {
        const next = [...m, { role: 'assistant' as const, content: reply, chips }]
        setLatestAssistantIdx(next.length - 1)
        return next
      })
    } catch {
      setMessages(m => {
        const next = [...m, { role: 'assistant' as const, content: "I couldn't reach the server. Check your connection and try again." }]
        setLatestAssistantIdx(next.length - 1)
        return next
      })
    }
    setLoading(false)
  }

  if (!mounted) return null

  if (isFlameoDashboardAiFullScreenPath(pathname)) return null

  return createPortal(
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-[9999] flex flex-col bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden w-[min(360px,calc(100vw-20px))]"
          style={{ maxHeight: '72vh', ...popupStyle }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-forest-100 shrink-0 bg-white">
            <div className="w-9 h-9 rounded-xl bg-white border border-orange-200 flex items-center justify-center select-none shadow-sm">
              <FlameoIcon size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 font-semibold text-sm">Flameo</div>
              <div className="text-gray-500 text-xs">Wildfire safety assistant · always here</div>
              {badgeLine && (
                <div className="text-[11px] text-gray-600 mt-0.5 leading-tight" data-testid="flameo-grounding-badge">
                  {badgeLine}
                </div>
              )}
            </div>
            <button
              onClick={clearHistory}
              title="Clear chat history"
              className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
                <div className="max-w-[82%]">
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      msg.role === 'user'
                        ? 'text-white rounded-tr-sm'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-tl-sm'
                    }`}
                    style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : undefined}
                  >
                    {msg.role === 'assistant' && i === latestAssistantIdx ? (
                      <ResponseStream
                        textStream={msg.content}
                        mode="typewriter"
                        speed={75}
                        as="span"
                      />
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === 'assistant' && msg.chips && msg.chips.length > 0 && (
                    <FlameoActionChips chips={msg.chips} variant="light" />
                  )}
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
            <div className="relative flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); adjustHeight() }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask Flameo anything…"
                disabled={loading}
                rows={1}
                className="flex-1 bg-white text-gray-900 text-sm rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-forest-400 placeholder:text-gray-500 resize-none overflow-hidden leading-relaxed"
                style={{ minHeight: 40, maxHeight: 120 }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="p-2 bg-forest-600 hover:bg-forest-700 border border-forest-600 rounded-xl text-white transition-colors disabled:opacity-40 shrink-0 mb-0.5"
              >
                {loading ? (
                  <div className="w-4 h-4 bg-white rounded-sm animate-spin" style={{ animationDuration: '3s' }} />
                ) : (
                  <CornerRightUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <div data-tour="flameo-fab" className="fixed z-[9999] w-16 h-16" style={fabStyle}>
        {!open && <FabSmoke active={fabHovered} />}
        <LiquidMetalFab
          onClick={handleOpen}
          onMouseEnter={() => setFabHovered(true)}
          onMouseLeave={() => setFabHovered(false)}
          title="Chat with Flameo"
          aria-label="Open Flameo chat"
          style={{ position: 'absolute', inset: 0, zIndex: 2 }}
        >
          <span className={`transition-all duration-200 ${open ? 'scale-75 opacity-0 absolute' : 'scale-100 opacity-100'}`}><FlameoIcon size={46} src={flameoSrc} /></span>
          <X className={`w-6 h-6 text-white absolute transition-all duration-200 ${open ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
        </LiquidMetalFab>
      </div>

      {/* Meet Flameo intro popup */}
      {showIntro && !open && (
        <div className="fixed z-[9999] animate-fade-up" style={popupStyle}>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-56 relative">
            <button onClick={dismissIntro} className="absolute top-2 right-2 text-gray-300 hover:text-gray-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2.5 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flameoSrc} alt="Flameo" width={32} height={32} style={{ objectFit: 'contain' }} />
              <div className="font-semibold text-gray-900 text-sm">Meet Flameo!</div>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed mb-3">
              Your personal wildfire safety assistant. Ask about evacuation routes, go-bags, and alerts.
            </p>
            <button
              onClick={() => { setOpen(true); dismissIntro() }}
              className="w-full bg-forest-600 hover:bg-forest-700 text-white text-xs font-semibold py-2 rounded-xl transition-colors"
            >
              Chat with Flameo
            </button>
            {/* Arrow pointing down to FAB */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r border-b border-gray-200 rotate-45" />
          </div>
        </div>
      )}

    </>,
    document.body
  )
}
