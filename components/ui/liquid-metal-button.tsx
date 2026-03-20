'use client'
import { liquidMetalFragmentShader, ShaderMount } from '@paper-design/shaders'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'

interface LiquidMetalFabProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  children?: React.ReactNode
  title?: string
  'aria-label'?: string
  style?: React.CSSProperties
  className?: string
}

export function LiquidMetalFab({
  onClick,
  onMouseEnter,
  onMouseLeave,
  children,
  title,
  'aria-label': ariaLabel,
  style,
  className,
}: LiquidMetalFabProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])
  const shaderRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shaderMount = useRef<any>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const rippleId = useRef(0)

  useEffect(() => {
    const styleId = 'lmf-canvas-style'
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style')
      s.id = styleId
      s.textContent = `
        .lmf-shader canvas {
          width: 100% !important; height: 100% !important;
          display: block !important; position: absolute !important;
          top: 0 !important; left: 0 !important;
          border-radius: 1rem !important;
        }
        @keyframes lmf-ripple {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(4); opacity: 0; }
        }
      `
      document.head.appendChild(s)
    }

    if (shaderRef.current) {
      shaderMount.current = new ShaderMount(
        shaderRef.current,
        liquidMetalFragmentShader,
        {
          u_repetition: 4, u_softness: 0.5,
          u_shiftRed: 0.3, u_shiftBlue: 0.3,
          u_distortion: 0, u_contour: 0,
          u_angle: 45, u_scale: 8,
          u_shape: 1, u_offsetX: 0.1, u_offsetY: -0.1,
        },
        undefined,
        0.6,
      )
    }
    return () => { shaderMount.current?.destroy?.(); shaderMount.current = null }
  }, [])

  function handleMouseEnter() {
    setIsHovered(true)
    shaderMount.current?.setSpeed?.(1)
    onMouseEnter?.()
  }

  function handleMouseLeave() {
    setIsHovered(false)
    setIsPressed(false)
    shaderMount.current?.setSpeed?.(0.6)
    onMouseLeave?.()
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    shaderMount.current?.setSpeed?.(2.4)
    setTimeout(() => shaderMount.current?.setSpeed?.(isHovered ? 1 : 0.6), 300)

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId.current++ }
      setRipples(prev => [...prev, ripple])
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== ripple.id)), 600)
    }
    onClick?.(e)
  }

  const size = 64

  return (
    <div className={`relative inline-block ${className ?? ''}`} style={style}>
      <div style={{ perspective: '1000px', perspectiveOrigin: '50% 50%' }}>
        <div style={{ position: 'relative', width: size, height: size, transformStyle: 'preserve-3d' }}>

          {/* Flameo icon layer */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: size, height: size,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: 'translateZ(20px)', zIndex: 30, pointerEvents: 'none',
          }}>
            {children}
          </div>

          {/* Dark inner ring */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: size, height: size,
            transform: `translateZ(10px) ${isPressed ? 'translateY(1px) scale(0.98)' : 'scale(1)'}`,
            transition: 'transform 0.15s ease',
            zIndex: 20,
          }}>
            <div style={{
              width: size - 4, height: size - 4, margin: 2,
              borderRadius: '1rem',
              background: 'linear-gradient(180deg, #202020 0%, #000000 100%)',
              boxShadow: isPressed ? 'inset 0px 2px 4px rgba(0,0,0,0.4)' : 'none',
              transition: 'box-shadow 0.15s ease',
            }} />
          </div>

          {/* Shader / metal surface */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: size, height: size,
            transform: `translateZ(0px) ${isPressed ? 'translateY(1px) scale(0.98)' : 'scale(1)'}`,
            transition: 'transform 0.15s ease',
            zIndex: 10,
          }}>
            <div style={{
              width: size, height: size, borderRadius: '1rem',
              boxShadow: isPressed
                ? '0px 0px 0px 1px rgba(0,0,0,0.5), 0px 1px 2px rgba(0,0,0,0.3)'
                : isHovered
                ? '0px 0px 0px 1px rgba(0,0,0,0.4), 0px 12px 6px rgba(0,0,0,0.05), 0px 8px 5px rgba(0,0,0,0.1), 0px 4px 4px rgba(0,0,0,0.15), 0px 1px 2px rgba(0,0,0,0.2)'
                : '0px 0px 0px 1px rgba(0,0,0,0.3), 0px 9px 9px rgba(0,0,0,0.12), 0px 2px 5px rgba(0,0,0,0.15)',
              transition: 'box-shadow 0.15s ease',
            }}>
              <div ref={shaderRef} className="lmf-shader" style={{
                borderRadius: '1rem', overflow: 'hidden',
                position: 'relative', width: size, height: size,
              }} />
            </div>
          </div>

          {/* Clickable button surface */}
          <button
            ref={buttonRef}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            title={title}
            aria-label={ariaLabel}
            style={{
              position: 'absolute', top: 0, left: 0, width: size, height: size,
              background: 'transparent', border: 'none', cursor: 'pointer',
              outline: 'none', zIndex: 40,
              transform: 'translateZ(25px)',
              overflow: 'hidden', borderRadius: '1rem',
            }}
          >
            {ripples.map(r => (
              <span key={r.id} style={{
                position: 'absolute', left: r.x, top: r.y,
                width: 20, height: 20, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
                pointerEvents: 'none',
                animation: 'lmf-ripple 0.6s ease-out',
              }} />
            ))}
          </button>
        </div>
      </div>
    </div>
  )
}
