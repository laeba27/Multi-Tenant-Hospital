'use client'

import { useEffect, useState } from 'react'
import { X, CalendarPlus, History, Megaphone, Phone, Sparkles } from 'lucide-react'

const STORAGE_KEY = 'patient_welcome_dismissed'

const STEPS = [
  { icon: CalendarPlus, text: 'Book an appointment at any hospital on the platform — you can register on the spot.' },
  { icon: History, text: 'Find your past visits and prescriptions under My History.' },
  { icon: Megaphone, text: 'Watch Quick Updates for health alerts and notices from your hospitals.' },
  { icon: Phone, text: 'Emergency numbers are always one tap away below.' },
]

export default function WelcomeGuide() {
  // Render nothing until we've read localStorage, so a dismissed card never
  // flashes on load.
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-indigo-600" />
        <h2 className="text-sm font-bold text-gray-900">Welcome to your patient portal</h2>
      </div>

      <ul className="space-y-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          return (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <Icon className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
              <span>{s.text}</span>
            </li>
          )
        })}
      </ul>

      <button
        onClick={dismiss}
        className="mt-4 text-xs font-medium text-indigo-600 hover:underline"
      >
        Got it, don&apos;t show again
      </button>
    </div>
  )
}
