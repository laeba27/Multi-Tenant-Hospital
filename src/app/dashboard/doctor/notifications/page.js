import { getHospitalNotices } from '@/actions/doctor-dashboard'
import { Bell } from 'lucide-react'

export const metadata = {
  title: 'Notices',
  description: 'Hospital notices and announcements.',
}

const CAT_META = {
  urgent: { label: 'Urgent', cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  schedule: { label: 'Schedule', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  policy: { label: 'Policy', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  event: { label: 'Event', cls: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  general: { label: 'General', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
}

function fmtDateTime(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return d
  }
}

export default async function NotificationsPage() {
  const notices = await getHospitalNotices()

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-6 w-6 text-indigo-600" /> Notices
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Announcements from your hospital · {notices.length} total
        </p>
      </div>

      {notices.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400">
          No notices at the moment.
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => {
            const cat = CAT_META[n.category] || CAT_META.general
            return (
              <div
                key={n.id}
                className={`bg-white border rounded-xl p-4 ${n.is_pinned ? 'border-amber-200 ring-1 ring-amber-100' : 'border-gray-200'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${cat.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] font-semibold text-gray-900">{n.title}</h3>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${cat.cls}`}>
                        {cat.label}
                      </span>
                      {n.is_pinned && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Pinned</span>
                      )}
                    </div>
                    {n.body && <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-line">{n.body}</p>}
                    <p className="text-[11px] text-gray-400 mt-2">{fmtDateTime(n.published_at)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
