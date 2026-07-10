'use client'

import { useEffect, useState } from 'react'
import { Megaphone, Pin, AlertTriangle, Info, CalendarOff, PartyPopper } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getMyNotices } from '@/actions/patients'
import { Section, Empty, fmtDate } from '@/components/patients/portal-ui'

const CATEGORY = {
  health_alert: { icon: AlertTriangle, badge: 'bg-rose-100 text-rose-800 border border-rose-200', label: 'Health Alert' },
  advisory: { icon: Info, badge: 'bg-amber-100 text-amber-800 border border-amber-200', label: 'Advisory' },
  closure: { icon: CalendarOff, badge: 'bg-slate-100 text-slate-700 border border-slate-200', label: 'Closure' },
  event: { icon: PartyPopper, badge: 'bg-violet-100 text-violet-800 border border-violet-200', label: 'Event' },
  general: { icon: Info, badge: 'bg-blue-100 text-blue-800 border border-blue-200', label: 'Update' },
}

export default function QuickUpdates({ limit = 5 }) {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getMyNotices({ limit }).then((res) => {
      if (cancelled) return
      // A failure here shouldn't break the dashboard -- just show nothing.
      if (res.success) setNotices(res.notices)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [limit])

  return (
    <Section title="Quick Updates" icon={Megaphone}>
      {loading ? (
        <p className="py-6 text-center text-sm text-gray-400">Loading updates…</p>
      ) : notices.length === 0 ? (
        <Empty>No updates right now.</Empty>
      ) : (
        <div className="space-y-2">
          {notices.map((n) => {
            const meta = CATEGORY[n.category] || CATEGORY.general
            const Icon = meta.icon
            return (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3"
              >
                <div className="h-9 w-9 rounded-lg bg-gray-50 text-gray-600 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                    {n.is_pinned && <Pin className="h-3 w-3 text-indigo-500" />}
                    <Badge className={`text-[10px] uppercase ${meta.badge}`}>{meta.label}</Badge>
                  </div>
                  {n.body && (
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{n.body}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {n.hospital?.name || 'All hospitals'} · {fmtDate(n.published_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}
