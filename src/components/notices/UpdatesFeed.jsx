'use client'

import { useEffect, useState } from 'react'
import { Megaphone, Pin } from 'lucide-react'
import { getMyUpdates } from '@/actions/notices'

const CATEGORY = {
  urgent: { label: 'Urgent', style: 'bg-rose-100 text-rose-800' },
  health_alert: { label: 'Health alert', style: 'bg-rose-100 text-rose-800' },
  closure: { label: 'Closure', style: 'bg-amber-100 text-amber-800' },
  advisory: { label: 'Advisory', style: 'bg-amber-100 text-amber-800' },
  schedule: { label: 'Schedule', style: 'bg-blue-100 text-blue-800' },
  policy: { label: 'Policy', style: 'bg-purple-100 text-purple-800' },
  event: { label: 'Event', style: 'bg-emerald-100 text-emerald-800' },
  general: { label: 'General', style: 'bg-gray-100 text-gray-700' },
}

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

/**
 * The updates addressed to whoever is signed in.
 *
 * There is no role prop and no filtering here on purpose: RLS on `notices`
 * already decides what this person may read, so one component serves doctors,
 * nurses, receptionists, pharmacists and admins alike.
 */
export default function UpdatesFeed({ limit = 20, title = 'Quick Updates' }) {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyUpdates({ limit }).then((res) => {
      if (res.success) setNotices(res.notices)
      setLoading(false)
    })
  }, [limit])

  if (loading) {
    return <p className="py-12 text-center text-sm text-gray-400">Loading updates…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-indigo-600" />
          {title}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Announcements from your hospital · {notices.length} total
        </p>
      </div>

      {notices.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <Megaphone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No updates right now</p>
          <p className="text-sm text-gray-400 mt-1">
            Announcements from your hospital will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => {
            const cat = CATEGORY[n.category] || CATEGORY.general
            return (
              <div
                key={n.id}
                className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {n.is_pinned && <Pin className="h-3.5 w-3.5 text-indigo-600" />}
                  <p className="font-semibold text-gray-900">{n.title}</p>
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${cat.style}`}>
                    {cat.label}
                  </span>
                </div>

                {n.body && (
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{n.body}</p>
                )}

                <p className="text-xs text-gray-400 mt-3">
                  {n.hospital?.name || ''} · {fmt(n.published_at)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
