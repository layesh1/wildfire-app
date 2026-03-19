'use client'

import { CheckCircle2, Zap, MapPin } from 'lucide-react'

const KEYFRAMES = `
  @keyframes gentleWave {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.02) rotate(2deg); }
  }
  @keyframes mediumPulse {
    0%, 100% { transform: scale(1); opacity: 0.9; }
    50% { transform: scale(1.05); opacity: 1; }
  }
  @keyframes urgentShake {
    0%, 100% { transform: scale(1) rotate(0deg); }
    25% { transform: scale(1.03) rotate(-3deg); }
    75% { transform: scale(1.03) rotate(3deg); }
  }
  @keyframes criticalPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(211,47,47,0.5); }
    50% { transform: scale(1.08); box-shadow: 0 0 40px rgba(211,47,47,0.8); }
  }
  @keyframes glowPulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.7; }
  }
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

function Ring({
  inset,
  border,
  color,
  duration,
  reverse = false,
}: {
  inset: string
  border: string
  color: string
  duration: string
  reverse?: boolean
}) {
  return (
    <div
      className="absolute rounded-full border-dashed"
      style={{
        inset,
        borderWidth: border,
        borderColor: color,
        animation: `rotate ${duration} linear infinite${reverse ? ' reverse' : ''}`,
      }}
    />
  )
}

function Badge({ label, bg }: { label: string; bg: string }) {
  return (
    <span
      className="mt-3 rounded-full px-3 py-1 text-xs font-bold tracking-wider text-white"
      style={{ background: bg }}
    >
      {label}
    </span>
  )
}

export default function JarDemo() {
  return (
    <>
      <style>{KEYFRAMES}</style>

      <div
        className="min-h-screen w-full flex flex-col items-center justify-center px-8 py-12"
        style={{ background: 'linear-gradient(135deg, #f5f1e8 0%, #e8dfc8 100%)' }}
      >
        {/* Title */}
        <h1
          className="mb-14 text-center text-4xl font-bold"
          style={{ fontFamily: "'Poppins', sans-serif", color: '#3e2723' }}
        >
          Fire Alert Jar Animation - 4 Levels
        </h1>

        {/* Jars row */}
        <div className="flex flex-wrap justify-center gap-12">

          {/* ── 1. SAFE ── */}
          <div className="flex flex-col items-center">
            <div
              className="relative flex items-center justify-center shadow-2xl"
              style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                border: '4px solid rgba(255,255,255,0.3)',
                animation: 'gentleWave 3s ease-in-out infinite',
              }}
            >
              {/* Gradient bg */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 50% 120%, #2e7d32 0%, #4caf50 50%, #66bb6a 100%)',
                  opacity: 0.9,
                }}
              />
              {/* Icon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 drop-shadow-2xl">
                <CheckCircle2
                  className="w-24 h-24 text-white"
                  strokeWidth={2.5}
                />
              </div>
            </div>
            <p className="mt-4 text-xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", color: '#3e2723' }}>
              SAFE
            </p>
            <p className="text-sm" style={{ color: 'rgba(62,39,35,0.6)', fontFamily: "'Poppins', sans-serif" }}>
              All Clear
            </p>
            <Badge label="SAFE" bg="#4caf50" />
          </div>

          {/* ── 2. CAUTION ── */}
          <div className="flex flex-col items-center">
            <div
              className="relative flex items-center justify-center shadow-2xl"
              style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                border: '4px solid rgba(255,255,255,0.3)',
                animation: 'mediumPulse 2s ease-in-out infinite',
              }}
            >
              {/* Gradient bg */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 50% 120%, #f57c00 0%, #ffa726 50%, #ffb74d 100%)',
                  opacity: 0.9,
                }}
              />
              {/* Rotating ring */}
              <Ring inset="2rem" border="2px" color="rgba(255,255,255,0.2)" duration="20s" />
              {/* Icon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 drop-shadow-2xl">
                <Zap
                  className="w-20 h-20 text-white"
                  strokeWidth={2.5}
                  style={{ fill: 'rgba(255,255,255,0.3)' }}
                />
              </div>
            </div>
            <p className="mt-4 text-xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", color: '#3e2723' }}>
              CAUTION
            </p>
            <p className="text-sm" style={{ color: 'rgba(62,39,35,0.6)', fontFamily: "'Poppins', sans-serif" }}>
              Stay Alert
            </p>
            <Badge label="CAUTION" bg="#ffa726" />
          </div>

          {/* ── 3. WARNING ── */}
          <div className="flex flex-col items-center">
            <div
              className="relative flex items-center justify-center shadow-2xl"
              style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                border: '4px solid rgba(255,255,255,0.3)',
                animation: 'urgentShake 1.5s ease-in-out infinite',
              }}
            >
              {/* Gradient bg */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 50% 120%, #e65100 0%, #ff6f00 50%, #ff8f00 100%)',
                  opacity: 0.95,
                }}
              />
              {/* Ring 1 */}
              <Ring inset="1.5rem" border="2px" color="rgba(255,255,255,0.25)" duration="15s" />
              {/* Ring 2 */}
              <Ring inset="2.5rem" border="1px" color="rgba(255,255,255,0.2)" duration="15s" reverse />
              {/* Icon — MapPin for location-relative warning */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 drop-shadow-2xl">
                <MapPin
                  className="w-24 h-24 text-white"
                  strokeWidth={2.5}
                  style={{ fill: 'rgba(255,255,255,0.4)' }}
                />
              </div>
            </div>
            <p className="mt-4 text-xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", color: '#3e2723' }}>
              WARNING
            </p>
            <p className="text-sm" style={{ color: 'rgba(62,39,35,0.6)', fontFamily: "'Poppins', sans-serif" }}>
              Prepare Now
            </p>
            <Badge label="WARNING" bg="#ff6f00" />
          </div>

          {/* ── 4. ACT NOW ── */}
          <div className="flex flex-col items-center">
            <div
              className="relative flex items-center justify-center"
              style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                border: '4px solid rgba(239,68,68,0.5)',
                animation: 'criticalPulse 1s ease-in-out infinite',
              }}
            >
              {/* Outer glow */}
              <div
                className="absolute rounded-full blur-2xl"
                style={{
                  inset: '-0.5rem',
                  background: 'rgba(239,68,68,0.3)',
                  animation: 'glowPulse 1s ease-in-out infinite',
                }}
              />
              {/* Gradient bg */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 50% 120%, #b71c1c 0%, #d32f2f 50%, #e53935 100%)',
                  opacity: 1,
                }}
              />
              {/* Ring 1 */}
              <Ring inset="1rem" border="2px" color="rgba(255,255,255,0.3)" duration="10s" />
              {/* Ring 2 */}
              <Ring inset="2rem" border="2px" color="rgba(253,224,71,0.4)" duration="8s" reverse />
              {/* Ring 3 */}
              <Ring inset="3rem" border="1px" color="rgba(255,255,255,0.25)" duration="12s" />
              {/* Icon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 drop-shadow-2xl animate-pulse">
                <Zap
                  className="w-28 h-28 text-white"
                  strokeWidth={2.5}
                  style={{ fill: 'rgba(255,255,255,0.5)' }}
                />
              </div>
            </div>
            <p className="mt-4 text-xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", color: '#3e2723' }}>
              ACT NOW
            </p>
            <p className="text-sm" style={{ color: 'rgba(62,39,35,0.6)', fontFamily: "'Poppins', sans-serif" }}>
              Evacuate!
            </p>
            <Badge label="ACT NOW" bg="#d32f2f" />
          </div>

        </div>

        {/* Footer */}
        <div className="mt-16 text-center space-y-1">
          <p style={{ color: 'rgba(62,39,35,0.7)', fontFamily: "'Poppins', sans-serif", fontSize: 14 }}>
            The jar fills from bottom → top like liquid rising
          </p>
          <p style={{ color: 'rgba(62,39,35,0.7)', fontFamily: "'Poppins', sans-serif", fontSize: 13 }}>
            Colors: Bright Green (safe) → Golden Yellow (caution) → Bright Orange (warning) → Deep Red (extreme)
          </p>
        </div>
      </div>
    </>
  )
}
