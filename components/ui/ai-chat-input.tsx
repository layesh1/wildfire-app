"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Send, Mic } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

interface AIChatInputProps {
  placeholders: string[]
  onSubmit: (text: string) => void
  disabled?: boolean
}

const AIChatInput = ({ placeholders, onSubmit, disabled }: AIChatInputProps) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [showPlaceholder, setShowPlaceholder] = useState(true)
  const [isActive, setIsActive] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cycle placeholder text when input is inactive and empty
  useEffect(() => {
    if (isActive || inputValue) return
    const interval = setInterval(() => {
      setShowPlaceholder(false)
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
        setShowPlaceholder(true)
      }, 400)
    }, 3500)
    return () => clearInterval(interval)
  }, [isActive, inputValue, placeholders.length])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        if (!inputValue) setIsActive(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [inputValue])

  const handleActivate = () => {
    setIsActive(true)
    inputRef.current?.focus()
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = inputValue.trim()
    if (!text || disabled) return
    onSubmit(text)
    setInputValue("")
    setIsActive(false)
  }

  const containerVariants = {
    collapsed: {
      boxShadow: "0 2px 12px 0 rgba(0,0,0,0.08)",
      transition: { type: "spring" as const, stiffness: 120, damping: 18 },
    },
    expanded: {
      boxShadow: "0 8px 32px 0 rgba(22,163,74,0.15)",
      transition: { type: "spring" as const, stiffness: 120, damping: 18 },
    },
  }

  const placeholderContainerVariants = {
    initial: {},
    animate: { transition: { staggerChildren: 0.018 } },
    exit: { transition: { staggerChildren: 0.010, staggerDirection: -1 as const } },
  }

  const letterVariants = {
    initial: { opacity: 0, filter: "blur(10px)", y: 8 },
    animate: {
      opacity: 1, filter: "blur(0px)", y: 0,
      transition: { opacity: { duration: 0.22 }, filter: { duration: 0.35 }, y: { type: "spring" as const, stiffness: 80, damping: 20 } },
    },
    exit: {
      opacity: 0, filter: "blur(10px)", y: -8,
      transition: { opacity: { duration: 0.18 }, filter: { duration: 0.28 }, y: { type: "spring" as const, stiffness: 80, damping: 20 } },
    },
  }

  return (
    <motion.div
      ref={wrapperRef}
      className="w-full bg-white border border-gray-200 rounded-2xl cursor-text"
      variants={containerVariants}
      animate={isActive || inputValue ? "expanded" : "collapsed"}
      initial="collapsed"
      onClick={handleActivate}
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3">
        {/* Flameo icon */}
        <div className="shrink-0 w-7 h-7 rounded-full bg-forest-50 border border-forest-200 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/flameo1.png" alt="Flameo" className="w-5 h-5 object-contain" />
        </div>

        {/* Text input + animated placeholder */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            disabled={disabled}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            onFocus={handleActivate}
            className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 py-1 leading-relaxed disabled:opacity-50"
            style={{ position: "relative", zIndex: 1 }}
            autoComplete="off"
          />
          {/* Animated placeholder */}
          <div className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center">
            <AnimatePresence mode="wait">
              {showPlaceholder && !isActive && !inputValue && (
                <motion.span
                  key={placeholderIndex}
                  className="absolute left-0 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none pointer-events-none"
                  style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", zIndex: 0 }}
                  variants={placeholderContainerVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {placeholders[placeholderIndex].split("").map((char, i) => (
                    <motion.span key={i} variants={letterVariants} style={{ display: "inline-block" }}>
                      {char === " " ? "\u00A0" : char}
                    </motion.span>
                  ))}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!inputValue.trim() || disabled}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-forest-600 hover:bg-forest-700 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send size={15} />
        </button>
      </form>
    </motion.div>
  )
}

export { AIChatInput }
