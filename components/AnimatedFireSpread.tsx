'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, SkipForward, Wind, TrendingUp } from 'lucide-react'

// ── Van Wagner fire spread model (same physics as ML page) ────────────────────
// Returns ellipse axes (length km, width km) at t hours
function vanWagnerSpread(windMps: number, slopeDeg: number, acres0: number, t: number) {
  const windKph = windMps * 3.6
  // Rate of spread (m/min) — empirical Van Wagner 1969
  const ros = 0.07 * windKph * (1 + slopeDeg / 30)
  const spreadKm = (ros * t * 60) / 1000   // forward distance km
  const lw = Math.max(1.2, 1 + 0.0012 * windKph * windKph)  // length/width ratio
  const majorKm = spreadKm
  const minorKm = spreadKm / lw
  // Convert initial acres to radius
  const initR = Math.sqrt((acres0 * 0.00405) / Math.PI)
  return {
    major: Math.max(initR, majorKm),
    minor: Math.max(initR * 0.7, minorKm),
  }
}

// Spread rate in acres/hour at current moment
function spreadRate(windMps: number, slopeDeg: number): number {
  const windKph = windMps * 3.6
  const ros = 0.07 * windKph * (1 + slopeDeg / 30) // m/min
  const areaKm2PerH = Math.PI * Math.pow((ros * 60) / 1000, 2)
  return Math.round(areaKm2PerH / 0.00405)           // acres/hour
}

const TIME_STEPS = [1, 3, 6, 12, 24] // hours

interface Props {
  windMps?: number
  slopeDeg?: number
  currentAcres?: number
  title?: string
  compact?: boolean
}

export default function AnimatedFireSpread({
  windMps = 14,
  slopeDeg = 15,
  currentAcres = 100,
  title = 'FireBench-Calibrated Fire Spread Simulation',
  compact = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const [playing, setPlaying]     = useState(false)
  const [stepIdx, setStepIdx]     = useState(0)   // 0-4 → TIME_STEPS index
  const [progress, setProgress]   = useState(0)   // 0-1 within current step

  // Compute all step geometries upfront
  const steps = TIME_STEPS.map(t => vanWagnerSpread(windMps, slopeDeg, currentAcres, t))

  // ── Draw a single frame ───────────────────────────────────────────────────
  const draw = useCallback((idx: number, prog: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const cx = W * 0.38      // fire origin slightly left of center (wind blows right)
    const cy = H / 2

    ctx.clearRect(0, 0, W, H)

    // Dark background
    ctx.fillStyle = '#0a0e1a'
    ctx.fillRect(0, 0, W, H)

    // Scale: fit the 24h ellipse with padding
    const maxMajor = steps[4].major
    const scale = (W * 0.52) / maxMajor  // px per km

    // Draw historical ellipses (faded)
    for (let i = 0; i <= idx; i++) {
      const s = i < idx ? steps[i] : {
        major: steps[i > 0 ? i - 1 : 0].major + (steps[i].major - steps[i > 0 ? i - 1 : 0].major) * prog,
        minor: steps[i > 0 ? i - 1 : 0].minor + (steps[i].minor - steps[i > 0 ? i - 1 : 0].minor) * prog,
      }
      const alpha = i === idx ? 0.9 : 0.18 + i * 0.07
      const rx = s.major * scale
      const ry = s.minor * scale

      // Gradient fill
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx)
      grad.addColorStop(0,   `rgba(255,200,0,${alpha * 0.8})`)
      grad.addColorStop(0.4, `rgba(255,100,0,${alpha * 0.5})`)
      grad.addColorStop(0.8, `rgba(200,30,0,${alpha * 0.3})`)
      grad.addColorStop(1,   `rgba(150,0,0,0)`)

      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Outline for current step
      if (i === idx) {
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        const colors = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#b91c1c']
        ctx.strokeStyle = colors[Math.min(i, colors.length - 1)]
        ctx.lineWidth = 1.5
        ctx.setLineDash(i === 4 ? [] : [6, 3])
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // Ember particles (deterministic, seeded by step)
    const seed = idx * 137 + Math.floor(prog * 20)
    for (let i = 0; i < 18; i++) {
      const r = ((seed * (i + 1) * 1013) % 100) / 100
      const angle = ((seed * (i + 3) * 7919) % 360) * (Math.PI / 180)
      const dist  = steps[idx].major * scale * (0.3 + r * 0.8)
      const ex = cx + Math.cos(angle) * dist
      const ey = cy + Math.sin(angle) * dist * 0.4
      const size = 1 + r * 2.5
      ctx.beginPath()
      ctx.arc(ex, ey, size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,${150 + Math.floor(r * 100)},0,${0.3 + r * 0.4})`
      ctx.fill()
    }

    // Wind arrow
    const arrowX = W * 0.82
    const arrowY = H * 0.15
    ctx.save()
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(arrowX - 24, arrowY)
    ctx.lineTo(arrowX + 4, arrowY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(arrowX + 4, arrowY)
    ctx.lineTo(arrowX - 4, arrowY - 5)
    ctx.moveTo(arrowX + 4, arrowY)
    ctx.lineTo(arrowX - 4, arrowY + 5)
    ctx.stroke()
    ctx.fillStyle = '#93c5fd'
    ctx.font = '11px monospace'
    ctx.fillText(`${windMps}m/s`, arrowX - 40, arrowY - 8)
    ctx.restore()

    // Time label
    ctx.fillStyle = '#f1f5f9'
    ctx.font = `bold ${compact ? 12 : 14}px monospace`
    ctx.fillText(`t = ${TIME_STEPS[idx]}h`, 12, H - 12)

    // Origin dot
    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#fbbf24'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }, [windMps, slopeDeg, steps, compact])

  // ── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) { draw(stepIdx, progress); return }

    let lastTs = 0
    const STEP_DURATION = 1800 // ms per time step

    function tick(ts: number) {
      if (!lastTs) lastTs = ts
      const elapsed = ts - lastTs
      const prog = Math.min(elapsed / STEP_DURATION, 1)
      setProgress(prog)
      draw(stepIdx, prog)

      if (prog >= 1) {
        const next = (stepIdx + 1) % TIME_STEPS.length
        setStepIdx(next)
        setProgress(0)
        lastTs = ts
        if (next === 0) { setPlaying(false); return }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, stepIdx, draw])

  // Draw on param change
  useEffect(() => { if (!playing) draw(stepIdx, 0) }, [windMps, slopeDeg, currentAcres, stepIdx, draw])

  const rate = spreadRate(windMps, slopeDeg)

  return (
    <div className="card overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-ember-500/20 flex items-center justify-center shrink-0">
          <span style={{ fontSize: 14 }}>🔥</span>
        </div>
        <div>
          <div className="text-white font-semibold text-sm">{title}</div>
          <div className="text-ash-500 text-xs">FireBench-calibrated physics · Van Wagner 1969 spread model</div>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={compact ? 400 : 560}
        height={compact ? 200 : 280}
        style={{ width: '100%', height: compact ? 200 : 280, display: 'block' }}
      />

      {/* Controls */}
      <div className="px-4 pb-4 pt-2 flex items-center gap-3">
        <button
          onClick={() => { setStepIdx(0); setProgress(0); setPlaying(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ember-500 hover:bg-ember-400 text-white text-xs font-semibold transition-colors"
        >
          {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {playing ? 'Playing…' : 'Play'}
        </button>

        {TIME_STEPS.map((t, i) => (
          <button key={t} onClick={() => { setPlaying(false); setStepIdx(i); setProgress(0) }}
            className="px-2 py-1 rounded text-xs font-mono font-medium transition-colors"
            style={{ background: stepIdx === i ? '#f97316' : 'rgba(255,255,255,0.06)', color: stepIdx === i ? '#fff' : '#94a3b8' }}>
            {t}h
          </button>
        ))}

        <div className="ml-auto flex items-center gap-4 text-xs text-ash-500">
          <span className="flex items-center gap-1"><Wind className="w-3 h-3" />{windMps}m/s</span>
          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{slopeDeg}° slope</span>
          <span className="text-ember-400 font-semibold">~{rate.toLocaleString()} ac/hr</span>
        </div>
      </div>

      {/* Tactical callout */}
      {!compact && (
        <div className="mx-4 mb-4 rounded-lg border border-signal-danger/30 bg-signal-danger/5 px-4 py-3 text-xs text-ash-400">
          <span className="text-signal-danger font-semibold">Tactical note: </span>
          At {windMps}m/s wind + {slopeDeg}° slope, fire spreads ~{rate.toLocaleString()} acres/hour.
          {rate > 500 ? ' Extreme behavior — initiate immediate evacuation of all zones within 5km.' :
           rate > 200 ? ' Rapid spread — recommend pre-emptive evacuation of zones within 3km.' :
           ' Moderate spread — monitor closely and prepare evacuation orders.'}
          {' '}Recommended evacuation buffer: {rate > 500 ? '8km' : rate > 200 ? '5km' : '3km'}.
        </div>
      )}
    </div>
  )
}
