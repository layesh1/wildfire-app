'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Settings, User, Bell, Globe, LogOut, Monitor, ChevronRight, Shield, Package, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function MobileSettingsPage() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    try {
      const card = JSON.parse(localStorage.getItem('wfa_emergency_card') || '{}')
      if (card.full_name) setUserName(card.full_name)
    } catch {}
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setEmail(data.user.email)
    }).catch(() => {})

    if ('Notification' in window) setNotifEnabled(Notification.permission === 'granted')
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  async function requestNotifications() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifEnabled(perm === 'granted')
  }

  function clearHistory() {
    setClearing(true)
    try {
      localStorage.removeItem('wfa_flameo_history')
    } catch {}
    setTimeout(() => setClearing(false), 800)
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="px-4 pt-10 pb-5 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 text-green-700 text-xs font-semibold uppercase tracking-widest mb-1">
          <Settings className="w-3.5 h-3.5" /> Settings
        </div>
        <h1 className="font-display font-bold text-2xl text-gray-900">My Settings</h1>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Profile */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Account</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 truncate">{userName || 'My Account'}</div>
                <div className="text-xs text-gray-400 truncate">{email || 'Loading…'}</div>
              </div>
            </div>
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors">
              <Monitor className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="flex-1 text-sm text-gray-700">Full Settings (Desktop)</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </Link>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Notifications</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Bell className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-gray-700">Push Alerts</div>
                <div className="text-xs text-gray-400">{notifEnabled ? 'Enabled — you will receive alerts' : 'Disabled'}</div>
              </div>
              {!notifEnabled && (
                <button
                  onClick={requestNotifications}
                  className="text-xs font-semibold text-green-700 border border-green-200 rounded-xl px-3 py-1.5"
                >
                  Enable
                </button>
              )}
              {notifEnabled && <div className="w-2 h-2 rounded-full bg-green-500" />}
            </div>
          </div>
        </section>

        {/* Go-Bag */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Preparedness</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
            <Link href="/dashboard/settings#gobag" className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors">
              <Package className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="flex-1 text-sm text-gray-700">Go-Bag Checklist</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </Link>
            <Link href="/dashboard/settings#emergency-card" className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors">
              <Shield className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="flex-1 text-sm text-gray-700">Emergency Card</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </Link>
          </div>
        </section>

        {/* Data & Privacy */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Data</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={clearHistory}
              disabled={clearing}
              className="flex items-center gap-3 px-4 py-3.5 w-full active:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="flex-1 text-left text-sm text-gray-700">
                {clearing ? 'Cleared!' : 'Clear Flameo Chat History'}
              </span>
            </button>
          </div>
        </section>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200 text-red-600 text-sm font-semibold bg-white active:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        <p className="text-center text-xs text-gray-400 pb-2">WildfireAlert · Mobile</p>
      </div>
    </div>
  )
}
