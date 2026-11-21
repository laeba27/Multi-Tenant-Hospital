'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, Check, X, Loader2, Building2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMyFollowUps, respondToFollowUp } from '@/actions/follow-ups'
import { cn } from '@/lib/utils'

/**
 * Patient dashboard: follow-up visits the doctor asked for, from today up to
 * two weeks ahead, each with "I'm coming" / "Can't come". Hidden when there
 * are none.
 */
export default function MyFollowUpsCard() {
  const [data, setData] = useState(null)

  const load = async () => {
    const res = await getMyFollowUps()
    if (res.success) setData(res)
  }

  useEffect(() => { load() }, [])

  if (!data?.followUps?.length) return null

  return (
    <div className="rounded-xl border border-indigo-100 bg-white shadow-sm p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-indigo-600" />
        <h2 className="text-sm font-bold text-gray-900">Follow-up visits</h2>
      </div>
      {data.followUps.map((f) => <FollowUpRow key={f.key} f={f} onSaved={load} />)}
    </div>
  )
}

function whenLabel(daysAway, date) {
  if (daysAway === 0) return 'Today'
  if (daysAway === 1) return 'Tomorrow'
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  })
}

function FollowUpRow({ f, onSaved }) {
  const [saving, setSaving] = useState(null) // 'coming' | 'not_coming'
  const [askReason, setAskReason] = useState(false)
  const [note, setNote] = useState('')
  const isToday = f.daysAway === 0
  const doctor = f.doctorName ? `Dr. ${f.doctorName.replace(/^dr\.?\s+/i, '')}` : 'Your doctor'

  const answer = async (response) => {
    setSaving(response)
    const res = await respondToFollowUp({
      patientId: f.patientId,
      followUpDate: f.followUpDate,
      response,
      note: response === 'not_coming' ? note : '',
    })
    setSaving(null)
    if (!res.success) { toast.error(res.error); return }
    toast.success(res.message)
    setAskReason(false)
    onSaved()
  }

  return (
    <div className={cn(
      'rounded-lg border p-3 sm:p-4',
      isToday ? 'border-indigo-200 bg-indigo-50/60' : 'border-gray-100 bg-slate-50/60'
    )}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn(
          'rounded-full px-2 py-0.5 text-[11px] font-bold uppercase',
          isToday ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 border border-indigo-200'
        )}>
          {whenLabel(f.daysAway, f.followUpDate)}
        </span>
        <p className="text-sm font-semibold text-gray-900 wrap-anywhere">
          {isToday ? `You have a follow-up with ${doctor} today` : `Follow-up with ${doctor}`}
        </p>
      </div>
      <p className="mt-1 text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-0.5">
        {f.hospitalName && (
          <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{f.hospitalName}</span>
        )}
        {f.appointment ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Booked{f.appointment.slot ? ` for ${f.appointment.slot}` : ''}
            {f.appointment.date !== f.followUpDate && ` on ${whenLabel(null, f.appointment.date)}`}
          </span>
        ) : (
          <Link href="/dashboard/patient/book" className="text-indigo-600 font-medium hover:underline">
            Not booked yet: book a time
          </Link>
        )}
      </p>

      {/* Current answer */}
      {f.response && !askReason && (
        <p className={cn(
          'mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
          f.response === 'coming' ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'
        )}>
          {f.response === 'coming' ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          {f.response === 'coming' ? "You said you're coming" : "You said you can't come"}
          {f.note && <span className="font-normal">· {f.note}</span>}
        </p>
      )}

      {askReason ? (
        <div className="mt-3 space-y-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Reason (optional), e.g. out of town"
            className="bg-white"
            autoFocus
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700"
              disabled={Boolean(saving)}
              onClick={() => answer('not_coming')}
            >
              {saving === 'not_coming' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Confirm I can't come
            </Button>
            <Button size="sm" variant="outline" className="bg-white" onClick={() => setAskReason(false)}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          {!f.response && <p className="text-xs font-medium text-gray-700 mb-2">Are you coming?</p>}
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              size="sm"
              disabled={Boolean(saving) || f.response === 'coming'}
              onClick={() => answer('coming')}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving === 'coming' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {f.response === 'not_coming' ? "I'll come after all" : "Yes, I'm coming"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={Boolean(saving) || f.response === 'not_coming'}
              onClick={() => { setNote(f.note || ''); setAskReason(true) }}
              className="bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
            >
              <X className="h-4 w-4" /> {f.response === 'coming' ? "Can't come now" : "No, can't come"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
