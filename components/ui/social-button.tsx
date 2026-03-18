'use client'

import { useState, FC, ReactNode, useRef, useEffect, type RefObject } from 'react'
import { Check, Copy, Instagram, Linkedin, Share2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: any[]) { return twMerge(clsx(inputs)) }

function useClickOutside(ref: RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) handler()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [ref, handler])
}

const shareButtons = [
  { icon: Instagram, label: 'Instagram', color: 'hover:text-[#E1306C] hover:bg-[#E1306C]/10' },
  { icon: Linkedin, label: 'LinkedIn', color: 'hover:text-[#0A66C2] hover:bg-[#0A66C2]/10' },
]

export default function SocialButton({ className }: { className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <OnClickOutside onClickOutside={() => setIsExpanded(false)}>
      <div className={cn('flex items-center justify-center', className)}>
        <motion.div
          animate={{ width: isExpanded ? 'auto' : '120px', height: '40px' }}
          className={cn(
            'relative flex items-center overflow-hidden',
            'bg-white',
            'border border-gray-200',
            'shadow-sm hover:shadow-md',
            'cursor-pointer rounded-full'
          )}
          initial={false}
          onClick={() => !isExpanded && setIsExpanded(true)}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <AnimatePresence mode='sync'>
            {!isExpanded ? (
              <motion.div className='absolute inset-0 flex items-center justify-center gap-2 text-gray-600' exit={{ opacity: 0, y: -20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key='share-text' transition={{ duration: 0.2 }}>
                <Share2 className='h-4 w-4' />
                <span className='text-sm font-medium'>Share</span>
              </motion.div>
            ) : (
              <motion.div className='flex items-center px-1' exit={{ opacity: 0, scale: 0.9 }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} key='actions' transition={{ delay: 0.1, duration: 0.2 }}>
                {shareButtons.map((btn) => (
                  <button className={cn('flex h-9 w-9 items-center justify-center rounded-full transition-colors', 'text-gray-500', btn.color)} key={btn.label} type='button' title={btn.label}>
                    <btn.icon className='h-4 w-4' />
                  </button>
                ))}
                <div className='mx-1 h-5 w-px bg-gray-200' />
                <button
                  className={cn('flex h-9 w-9 items-center justify-center rounded-full transition-colors', 'text-gray-500', 'hover:bg-gray-100', copied && 'bg-green-50 text-green-600')}
                  onClick={(e) => { e.stopPropagation(); handleCopy() }}
                  type='button' title='Copy Link'
                >
                  {copied ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </OnClickOutside>
  )
}

interface OnClickOutsideProps { children: ReactNode; onClickOutside: () => void; classes?: string }
const OnClickOutside: FC<OnClickOutsideProps> = ({ children, onClickOutside, classes }) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  useClickOutside(wrapperRef, onClickOutside)
  return <div ref={wrapperRef} className={cn(classes)}>{children}</div>
}
