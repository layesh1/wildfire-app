'use client'

import { Fragment } from 'react'
import { stripMarkdownHeadingMarkers } from '@/lib/flameo-briefing-format'

/** Renders Flameo briefing strings: strips `#` headings, turns `**...**` into real bold. */
export function FlameoFormattedText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const cleaned = stripMarkdownHeadingMarkers(text)
  const parts = cleaned.split(/\*\*/)
  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </span>
  )
}
