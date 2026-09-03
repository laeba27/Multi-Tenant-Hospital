'use client'

import { useEffect, useRef, useState } from 'react'
import { Eye, X } from 'lucide-react'

/**
 * A small "how does this work?" affordance for a dialog header.
 *
 * These dialogs are steps in a longer journey -- find a patient, register one,
 * book, confirm, invoice -- and nothing on screen explains what a step expects
 * or what happens after it. Rather than crowding every dialog with permanent
 * instructions, each one carries an eye icon that opens a short popover on
 * demand.
 *
 * Deliberately not a `title` tooltip: those never appear on touch devices and
 * cannot hold a list.
 *
 * @param {string} title  What this step is for, in a few words.
 * @param {string[]} steps  What the user can do here, one line each.
 */
export function HelpHint({ title, steps = [], className = '' }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={wrapRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="How this works"
        title="How this works"
        className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition ${
          open ? 'bg-brand-blue/10 text-brand-blue' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
        }`}
      >
        <Eye className="h-4 w-4" />
      </button>

      {open && (
        // Left-anchored and z-above the dialog body so it is never clipped by
        // the header's own bounds.
        <div className="absolute left-0 top-full z-[60] mt-2 w-80 rounded-lg border bg-white p-4 text-left shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="-mr-1 -mt-1 shrink-0 rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {steps.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-gray-600">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </span>
  )
}

export default HelpHint
