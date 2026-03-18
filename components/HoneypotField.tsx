'use client'
/**
 * Invisible honeypot field — bots fill it, humans can't see it.
 * Add to any form and check honeyValue === '' before submitting.
 *
 * Usage:
 *   const [honey, setHoney] = useState('')
 *   <HoneypotField value={honey} onChange={setHoney} />
 *   if (honey) return  // bot detected, silently drop
 */
export default function HoneypotField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
      tabIndex={-1}
    >
      <label htmlFor="__wfa_confirm">Leave this empty</label>
      <input
        id="__wfa_confirm"
        name="confirm_email"
        type="text"
        autoComplete="off"
        tabIndex={-1}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
