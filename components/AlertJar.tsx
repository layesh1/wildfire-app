'use client'

import { CheckCircle2, Zap, MapPin } from 'lucide-react'

// Keyframes defined in app/globals.css (avoids React 19 style-tag hydration crash)

export type AlertLevel = 'safe' | 'caution' | 'warning' | 'act_now'

const CONFIG: Record<AlertLevel, {
  label: string; sub: string; bg: string; animation: string; border: string
  Icon: any; iconClass: string; iconFill?: string
  rings: { inset: string; border: string; color: string; duration: string; reverse?: boolean }[]
  glow: boolean
}> = {
  safe: {
    label: 'Safe', sub: 'All Clear',
    bg: 'radial-gradient(circle at 50% 120%, #2e7d32 0%, #4caf50 50%, #66bb6a 100%)',
    animation: 'alertJarGentleWave 3s ease-in-out infinite',
    border: '4px solid rgba(255,255,255,0.3)',
    Icon: CheckCircle2, iconClass: 'w-16 h-16 text-white',
    rings: [], glow: false,
  },
  caution: {
    label: 'Caution', sub: 'Stay Alert',
    bg: 'radial-gradient(circle at 50% 120%, #f57c00 0%, #ffa726 50%, #ffb74d 100%)',
    animation: 'alertJarMediumPulse 2s ease-in-out infinite',
    border: '4px solid rgba(255,255,255,0.3)',
    Icon: Zap, iconClass: 'w-14 h-14 text-white', iconFill: 'rgba(255,255,255,0.3)',
    rings: [{ inset: '1.5rem', border: '2px', color: 'rgba(255,255,255,0.2)', duration: '20s' }],
    glow: false,
  },
  warning: {
    label: 'Warning', sub: 'Prepare Now',
    bg: 'radial-gradient(circle at 50% 120%, #e65100 0%, #ff6f00 50%, #ff8f00 100%)',
    animation: 'alertJarUrgentShake 1.5s ease-in-out infinite',
    border: '4px solid rgba(255,255,255,0.3)',
    Icon: MapPin, iconClass: 'w-16 h-16 text-white', iconFill: 'rgba(255,255,255,0.4)',
    rings: [
      { inset: '1rem', border: '2px', color: 'rgba(255,255,255,0.25)', duration: '15s' },
      { inset: '2rem', border: '1px', color: 'rgba(255,255,255,0.2)', duration: '15s', reverse: true },
    ],
    glow: false,
  },
  act_now: {
    label: 'Act Now', sub: 'Evacuate!',
    bg: 'radial-gradient(circle at 50% 120%, #b71c1c 0%, #d32f2f 50%, #e53935 100%)',
    animation: 'alertJarCriticalPulse 1s ease-in-out infinite',
    border: '4px solid rgba(239,68,68,0.5)',
    Icon: Zap, iconClass: 'w-20 h-20 text-white animate-pulse', iconFill: 'rgba(255,255,255,0.5)',
    rings: [
      { inset: '0.75rem', border: '2px', color: 'rgba(255,255,255,0.3)', duration: '10s' },
      { inset: '1.5rem', border: '2px', color: 'rgba(253,224,71,0.4)', duration: '8s', reverse: true },
      { inset: '2.25rem', border: '1px', color: 'rgba(255,255,255,0.25)', duration: '12s' },
    ],
    glow: true,
  },
}

export default function AlertJar({ level = 'safe', size = 160 }: { level?: AlertLevel; size?: number }) {
  const cfg = CONFIG[level]
  const { Icon } = cfg

  return (
    <>
      <div className="flex flex-col items-center">
        <div
          className="relative flex items-center justify-center"
          style={{ width: size, height: size, borderRadius: '50%', border: cfg.border, animation: cfg.animation }}
        >
          {cfg.glow && (
            <div
              className="absolute rounded-full blur-2xl"
              style={{ inset: '-0.5rem', background: 'rgba(239,68,68,0.3)', animation: 'alertJarGlowPulse 1s ease-in-out infinite' }}
            />
          )}
          <div className="absolute inset-0 rounded-full" style={{ background: cfg.bg, opacity: level === 'act_now' ? 1 : 0.9 }} />
          {cfg.rings.map((r, i) => (
            <div
              key={i}
              className="absolute rounded-full border-dashed"
              style={{
                inset: r.inset, borderWidth: r.border, borderColor: r.color,
                animation: `alertJarRotate ${r.duration} linear infinite${r.reverse ? ' reverse' : ''}`,
              }}
            />
          ))}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 drop-shadow-2xl">
            <Icon className={cfg.iconClass} strokeWidth={2.5} style={cfg.iconFill ? { fill: cfg.iconFill } : undefined} />
          </div>
        </div>
        <p className="mt-3 text-base font-bold text-white">{cfg.label}</p>
        <p className="text-sm text-white/60">{cfg.sub}</p>
      </div>
    </>
  )
}
