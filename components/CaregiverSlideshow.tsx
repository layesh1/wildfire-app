'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowRight } from 'lucide-react'
import MorphingArrowButton from '@/components/ui/morphing-arrow-button'

const SLIDES = [
  {
    tag: 'Your Voice Matters',
    headline: 'Nobody Knows Them Better Than You.',
    body: "When you reach out to a loved one with real information\na fire bearing down, a route still open, a window to move\nthey listen. A call from you carries weight that no automated alert ever will.",
    sub: "Most tragedies happen not from lack of warning, but from no action taken at all. Be the reason they moved in time.",
    image: '/pexels-olly-3768131.jpg',
    imageAlt: 'Person connecting with a loved one',
    overlay: 'rgba(180, 80, 20, 0.18)',
    cta: false,
  },
  {
    tag: 'Stay Connected',
    headline: 'Distance Is Not a Disadvantage.',
    body: "Whether you're across the street or across the country, Minutes Matter keeps you connected to the people you care for.",
    sub: "You don't have to be there to protect them. You just have to be informed.",
    image: '/pexels-olly-3823542.jpg',
    imageAlt: 'Person staying connected remotely',
    overlay: 'rgba(200, 90, 10, 0.38)',
    cta: false,
  },
  {
    tag: 'Take Action',
    headline: "Don't Wait.\nInitiate.",
    body: "Official evacuation orders come late. Emergency services are overwhelmed. The window to move safely closes fast. Most people who didn't make it out in time weren't uninformed. They were waiting for someone else to make the call.",
    sub: "Minutes Matter puts the signal in your hands before the order is issued. Don't wait for someone else to act. You can be the one who makes the call.",
    image: '/pexels-rdne-6647036.jpg',
    imageAlt: 'Person taking action in an emergency',
    overlay: 'rgba(200, 90, 10, 0.38)',
    cta: false,
  },
  {
    tag: 'Join Us',
    headline: 'Make the Switch.',
    body: "The families who need early warnings most are the ones standard systems fail first. Slower to evacuate, harder to reach, further from help. Minutes Matter was built for them — and for you.",
    sub: "Personalised alerts, accessible routes, check-in tools, and Flameo — an AI assistant that helps plan evacuations in plain language. Free for all users.",
    image: '/pexels-kampus-6838549.jpg',
    imageAlt: 'Caregiver with family member',
    overlay: 'rgba(180, 80, 20, 0.18)',
    cta: true,
  },
]

export function CaregiverSlideshow({ onGetStarted }: { onGetStarted: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scrollTo = useCallback((index: number) => {
    const container = scrollRef.current
    if (!container) return
    const slideWidth = container.clientWidth
    container.scrollTo({ left: slideWidth * index, behavior: 'smooth' })
  }, [])

  const next = useCallback(() => {
    scrollTo((active + 1) % SLIDES.length)
  }, [active, scrollTo])

  // Track active slide from scroll position
  const onScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    const index = Math.round(container.scrollLeft / container.clientWidth)
    setActive(index)
  }, [])

  // Only start timer when slideshow is visible
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    timerRef.current = setTimeout(next, 9000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [active, next, visible])

  return (
    <div ref={containerRef} className="flex items-center gap-3">
      {/* Left arrow — outside */}
      <MorphingArrowButton direction="left" onClick={() => scrollTo((active - 1 + SLIDES.length) % SLIDES.length)} />

      <div className="flex-1 rounded-3xl overflow-hidden" style={{ background: '#0a1f12' }}>
      {/* Scrollable slides */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-full grid lg:grid-cols-[520px_1fr]"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* Text — left */}
            <div className="p-7 lg:p-8 flex flex-col justify-between">
              <div>
                <div className="text-green-500 text-xs font-semibold uppercase tracking-widest mb-2">{slide.tag}</div>
                <h3 className="font-display text-3xl font-bold text-white mb-3" style={{ whiteSpace: 'pre-line' }}>{slide.headline}</h3>
                <p className="text-white/90 text-base leading-relaxed mb-3" style={{ whiteSpace: 'pre-line' }}>{slide.body}</p>
                <p className="text-white/90 text-base leading-relaxed mb-7">{slide.sub}</p>
                {slide.cta && (
                  <button onClick={onGetStarted} className="self-start flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
                    Get started <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>

            {/* Image — right */}
            <div className="relative overflow-hidden" style={{ minHeight: 280, borderRadius: '1.5rem 0 0 1.5rem' }}>
              <img
                src={slide.image}
                alt={slide.imageAlt}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              {/* Warm hue overlay */}
              <div className="absolute inset-0" style={{ background: slide.overlay, mixBlendMode: 'multiply' }} />
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* Right arrow — outside */}
      <MorphingArrowButton direction="right" onClick={next} />
    </div>
  )
}
