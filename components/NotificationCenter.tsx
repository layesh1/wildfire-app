'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export type WfaNotification = {
  id: string
  title: string
  body: string
  time: string
  read: boolean
}

const STORAGE_KEY = 'wfa_notifications'

export function addNotification(n: Omit<WfaNotification, 'id' | 'read' | 'time'>) {
  try {
    const stored: WfaNotification[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const newN: WfaNotification = {
      id: crypto.randomUUID(),
      read: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...n,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newN, ...stored].slice(0, 50)))
    window.dispatchEvent(new Event('wfa:notifications'))
  } catch {}
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<WfaNotification[]>([])
  const ref = useRef<HTMLDivElement>(null)

  function load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setNotifications(JSON.parse(stored))
    } catch {}
  }

  useEffect(() => {
    load()
    window.addEventListener('wfa:notifications', load)
    return () => window.removeEventListener('wfa:notifications', load)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const unread = notifications.filter(n => !n.read).length

  function toggleOpen() {
    if (!open && unread > 0) {
      const updated = notifications.map(n => ({ ...n, read: true }))
      setNotifications(updated)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
    }
    setOpen(o => !o)
  }

  function dismiss(id: string) {
    const updated = notifications.filter(n => n.id !== id)
    setNotifications(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
  }

  function clearAll() {
    setNotifications([])
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    setOpen(false)
  }

  return (
    <div ref={ref} className="fixed top-3 right-4 z-[2000]" data-tour="notification-center">
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-gray-600" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-900 text-sm">Notifications</span>
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  Clear all
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No notifications yet</p>
                <p className="text-gray-300 text-xs mt-1">Fire alerts will appear here</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.map(n => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{n.time}</p>
                    </div>
                    <button onClick={() => dismiss(n.id)} className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
