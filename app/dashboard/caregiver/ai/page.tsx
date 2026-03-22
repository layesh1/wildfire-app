'use client'
import { useState, useRef, useEffect } from 'react'
import { Brain, Send, AlertTriangle, User, Loader } from 'lucide-react'

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

interface Message {
  role: 'user' | 'assistant'
  content: string
}

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
      content:
        "Hello, I'm SAFE-PATH — your evacuation guide. I'm here to help you prepare, evacuate safely, and find resources. Ask me anything about wildfire safety, evacuation steps, or finding shelter.\n\nStay safe. What can I help you with?",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text?: string) {
    const userText = (text ?? input).trim()
    if (!userText || loading) return

    const next: Message[] = [...messages, { role: 'user', content: userText }]
    setMessages(next)
    setInput('')
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
      const reply: Message = {
        role: 'assistant',
        content: data.content || 'Sorry, I encountered an error. Please try again.',
      }
      setMessages(prev => [...prev, reply])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please check your connection and try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-5 shrink-0">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-3">
          <Brain className="w-4 h-4" />
          CAREGIVER · SAFE-PATH AI
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">SAFE-PATH</h1>
        <p className="text-ash-400 text-sm">
          AI-powered evacuation guidance for caregivers, evacuees, and people with access and functional needs.
        </p>
      </div>

      {/* Research banner */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-5 shrink-0">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-ash-400 text-xs leading-relaxed">
            SAFE-PATH is trained on WiDS wildfire research: 99.3% of true wildfires with signals received no formal order.
            High-SVI communities are less likely to receive any order at all. It advises on all signal types — not only official orders.
          </p>
        </div>
      </div>

      {/* Starter prompts */}
      {messages.length === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5 shrink-0">
          {STARTER_PROMPTS.map(prompt => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-left text-xs p-3 rounded-lg bg-ash-900 border border-ash-800 text-ash-400 hover:text-white hover:border-ash-600 transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Brain className="w-3.5 h-3.5 text-amber-400" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-ash-800 text-white rounded-tr-none'
                  : 'bg-ash-900 border border-ash-800 text-ash-200 rounded-tl-none'
              }`}
            >
              {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-ash-800 border border-ash-700 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-ash-400" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Brain className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="bg-ash-900 border border-ash-800 rounded-2xl rounded-tl-none px-4 py-3">
              <Loader className="w-4 h-4 text-ash-500 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0">
        <div className="flex gap-3 items-end bg-ash-900 border border-ash-700 rounded-2xl p-3 focus-within:border-ash-500 transition-colors">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask SAFE-PATH a question…"
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-ash-600 text-sm resize-none focus:outline-none"
            style={{ minHeight: 24, maxHeight: 120, overflowY: 'auto' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-xl bg-ember-500 hover:bg-ember-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="mt-2 text-center text-ash-600 text-xs">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
