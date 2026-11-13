'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock, AlertTriangle, CalendarCheck, CalendarDays, Search, Phone, BellRing, RefreshCw,
  Pencil, Bell, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getFollowUps, updateFollowUpDate, sendFollowUpReminder } from '@/actions/follow-ups'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const STATUS = {
  overdue: { label: 'Overdue', className: 'bg-rose-100 text-rose-800 border border-rose-200' },
  not_booked: { label: 'Not booked', className: 'bg-amber-100 text-amber-800 border border-amber-200' },
  booked: { label: 'Booked', className: 'bg-blue-100 text-blue-800 border border-blue-200' },
  visited: { label: 'Visited', className: 'bg-green-100 text-green-800 border border-green-200' },
}

const RANGES = [
  { value: 'all', label: 'All dates' },
  { value: 'upcoming_30', label: 'Next 30 days' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'next_7', label: 'Next 7 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'overdue', label: 'Past dates' },
  { value: 'custom', label: 'Custom range' },
]

const SORTS = [
  { value: 'date_asc', label: 'Date: soonest first' },
  { value: 'date_desc', label: 'Date: latest first' },
  { value: 'patient_asc', label: 'Patient: A to Z' },
  { value: 'doctor_asc', label: 'Doctor: A to Z' },
  { value: 'status', label: 'Status: needs action first' },
]

// "Needs action" order for the status sort.
const STATUS_RANK = { overdue: 0, not_booked: 1, booked: 2, visited: 3 }

function shift(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function prettyDate(iso) {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

function relative(daysAway) {
  if (daysAway === 0) return 'Today'
  if (daysAway === 1) return 'Tomorrow'
  if (daysAway === -1) return 'Yesterday'
  return daysAway > 0 ? `In ${daysAway} days` : `${-daysAway} days ago`
}

/** [from, to] (inclusive, YYYY-MM-DD) for a range preset; null = unbounded. */
function rangeBounds(range, today, custom) {
  switch (range) {
    case 'today': return [today, today]
    case 'tomorrow': return [shift(today, 1), shift(today, 1)]
    case 'next_7': return [today, shift(today, 7)]
    case 'upcoming_30': return [today, shift(today, 30)]
    case 'this_month': {
      const [y, m] = today.split('-').map(Number)
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
      return [`${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-${String(last).padStart(2, '0')}`]
    }
    case 'overdue': return [null, shift(today, -1)]
    case 'custom': return [custom.from || null, custom.to || null]
    default: return [null, null]
  }
}

export default function FollowUpsView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Start on every follow-up; the filters only ever narrow it down.
  const [range, setRange] = useState('all')
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [status, setStatus] = useState('all')
  const [doctorId, setDoctorId] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('date_asc')

  const load = async () => {
    setLoading(true)
    const res = await getFollowUps()
    if (res.success) setData(res)
    else toast.error(res.error || 'Failed to load follow-ups')
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const today = data?.today
  const isDoctor = data?.role === 'doctor'
  const all = data?.followUps || []
  // From the hospital's Roles & Access settings (admins always both).
  const canEdit = Boolean(data?.can?.edit)
  const canRemind = Boolean(data?.can?.remind)
  const hasActions = canEdit || canRemind

  const [editing, setEditing] = useState(null) // follow-up row being edited
  const [reminding, setReminding] = useState(null) // key being sent

  const remind = async (f) => {
    setReminding(f.key)
    const res = await sendFollowUpReminder({ patientId: f.patient.id, followUpDate: f.followUpDate })
    setReminding(null)
    if (!res.success) { toast.error(res.error); return }
    toast.success(res.message)
    load()
  }

  // Headline counts are over everything, so they don't move as you filter.
  const counts = useMemo(() => {
    if (!today) return {}
    const week = shift(today, 7)
    return {
      overdue: all.filter((f) => f.status === 'overdue').length,
      today: all.filter((f) => f.followUpDate === today).length,
      next7: all.filter((f) => f.followUpDate >= today && f.followUpDate <= week).length,
      notBooked: all.filter((f) => f.status === 'not_booked').length,
    }
  }, [all, today])

  const visible = useMemo(() => {
    if (!today) return []
    const [from, to] = rangeBounds(range, today, custom)
    const q = search.trim().toLowerCase()

    const rows = all.filter((f) => {
      if (from && f.followUpDate < from) return false
      if (to && f.followUpDate > to) return false
      if (status !== 'all' && f.status !== status) return false
      if (doctorId !== 'all' && f.doctor?.id !== doctorId) return false
      if (q) {
        const hay = `${f.patient.name} ${f.patient.registrationNo} ${f.patient.mobile || ''} ${f.doctor?.name || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    const byDate = (a, b) => a.followUpDate.localeCompare(b.followUpDate)
    const sorters = {
      date_asc: byDate,
      date_desc: (a, b) => byDate(b, a),
      patient_asc: (a, b) => a.patient.name.localeCompare(b.patient.name) || byDate(a, b),
      doctor_asc: (a, b) => (a.doctor?.name || '').localeCompare(b.doctor?.name || '') || byDate(a, b),
      status: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || byDate(a, b),
    }
    return [...rows].sort(sorters[sort] || byDate)
  }, [all, today, range, custom, status, doctorId, search, sort])

  const applyCard = (preset) => {
    setSearch('')
    setDoctorId('all')
    if (preset === 'overdue') { setRange('all'); setStatus('overdue'); setSort('date_desc') }
    if (preset === 'today') { setRange('today'); setStatus('all'); setSort('date_asc') }
    if (preset === 'next7') { setRange('next_7'); setStatus('all'); setSort('date_asc') }
    if (preset === 'notBooked') { setRange('all'); setStatus('not_booked'); setSort('date_asc') }
  }

  const filtersActive =
    range !== 'all' || status !== 'all' || doctorId !== 'all' || search.trim() !== ''

  const resetFilters = () => {
    setRange('all'); setCustom({ from: '', to: '' }); setStatus('all')
    setDoctorId('all'); setSearch(''); setSort('date_asc')
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Follow-ups</h1>
          <p className="text-sm text-gray-600 mt-1">
            {isDoctor
              ? 'Patients you asked to come back, from the follow-up date on your prescriptions.'
              : 'Patients their doctors asked to come back, from the follow-up date on prescriptions.'}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="w-full sm:w-auto">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>

      {/* Headline counts; each one is a shortcut filter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={AlertTriangle} tone="text-rose-600 bg-rose-50" label="Overdue, not booked" value={counts.overdue} onClick={() => applyCard('overdue')} />
        <StatCard icon={CalendarClock} tone="text-indigo-600 bg-indigo-50" label="Due today" value={counts.today} onClick={() => applyCard('today')} />
        <StatCard icon={CalendarDays} tone="text-blue-600 bg-blue-50" label="Next 7 days" value={counts.next7} onClick={() => applyCard('next7')} />
        <StatCard icon={CalendarCheck} tone="text-amber-600 bg-amber-50" label="Upcoming, not booked" value={counts.notBooked} onClick={() => applyCard('notBooked')} />
      </div>

      <Card className="gap-4">
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isDoctor ? 'Patient name, ID or mobile' : 'Patient, ID, mobile or doctor'}
                className="pl-9"
              />
            </div>

            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(STATUS).map(([k, s]) => (
                  <SelectItem key={k} value={k}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SORTS.filter((s) => !(isDoctor && s.value === 'doctor_asc')).map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(range === 'custom' || (!isDoctor && data?.doctors?.length > 1)) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {range === 'custom' && (
                <>
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-gray-600">From</span>
                    <Input type="date" value={custom.from} max={custom.to || undefined}
                      onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-gray-600">To</span>
                    <Input type="date" value={custom.to} min={custom.from || undefined}
                      onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
                  </label>
                </>
              )}
              {!isDoctor && data?.doctors?.length > 1 && (
                <label className="space-y-1 lg:col-start-4">
                  <span className="text-xs font-medium text-gray-600">Doctor</span>
                  <Select value={doctorId} onValueChange={setDoctorId}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All doctors</SelectItem>
                      {data.doctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>Dr. {d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>
              {loading ? 'Loading…' : `${visible.length} of ${all.length} follow-up${all.length === 1 ? '' : 's'}`}
            </span>
            {filtersActive && (
              <button type="button" onClick={resetFilters} className="font-medium text-indigo-600 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="py-0 gap-0 overflow-hidden">
        {loading && !data ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading follow-ups…</div>
        ) : visible.length === 0 ? (
          <div className="py-16 px-4 text-center text-sm text-gray-500">
            <CalendarClock className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            {all.length === 0
              ? 'No follow-ups yet. They appear here when a doctor sets a follow-up date on a prescription.'
              : 'No follow-ups match these filters.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="px-2 sm:px-4">Follow-up</TableHead>
                <TableHead className="px-2 sm:px-4">Patient</TableHead>
                {!isDoctor && <TableHead className="hidden md:table-cell px-4">Doctor</TableHead>}
                <TableHead className="px-2 sm:px-4">Status</TableHead>
                <TableHead className="hidden lg:table-cell px-4">Appointment</TableHead>
                <TableHead className="hidden lg:table-cell px-4">Reminder</TableHead>
                {hasActions && (
                  <TableHead className="px-2 sm:px-4 text-right"><span className="sr-only sm:not-sr-only">Actions</span></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((f) => (
                <TableRow key={f.key}>
                  <TableCell className="px-2 py-2.5 sm:px-4 sm:py-3 align-top">
                    <p className="font-medium text-gray-900 whitespace-nowrap">{prettyDate(f.followUpDate)}</p>
                    <p className={cn('text-xs', f.daysAway < 0 ? 'text-rose-600' : f.daysAway <= 2 ? 'text-indigo-600' : 'text-gray-500')}>
                      {relative(f.daysAway)}
                    </p>
                  </TableCell>
                  <TableCell className="px-2 py-2.5 sm:px-4 sm:py-3 align-top whitespace-normal">
                    <p className="font-medium text-gray-900 wrap-anywhere">{f.patient.name}</p>
                    <p className="text-xs text-gray-500 font-mono wrap-anywhere">{f.patient.registrationNo}</p>
                    {f.patient.mobile && (
                      <a href={`tel:${f.patient.mobile}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                        <Phone className="h-3 w-3" /> {f.patient.mobile}
                      </a>
                    )}
                    {!isDoctor && f.doctor && (
                      <p className="text-xs text-gray-500 md:hidden wrap-anywhere">Dr. {f.doctor.name}</p>
                    )}
                  </TableCell>
                  {!isDoctor && (
                    <TableCell className="hidden md:table-cell px-4 py-3 align-top whitespace-normal">
                      {f.doctor ? `Dr. ${f.doctor.name}` : '—'}
                      {f.prescribedOn && (
                        <p className="text-xs text-gray-500">Prescribed {prettyDate(f.prescribedOn)}</p>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="px-2 py-2.5 sm:px-4 sm:py-3 align-top">
                    <Badge className={cn('text-[10px] uppercase', STATUS[f.status].className)}>
                      {STATUS[f.status].label}
                    </Badge>
                    {f.appointment && (
                      <p className="mt-1 text-xs text-gray-500 lg:hidden whitespace-nowrap">
                        {prettyDate(f.appointment.date).replace(/, \d{4}$/, '')}{f.appointment.slot ? ` · ${f.appointment.slot}` : ''}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell px-4 py-3 align-top text-sm">
                    {f.appointment ? (
                      <>
                        <p>{prettyDate(f.appointment.date)}</p>
                        <p className="text-xs text-gray-500">
                          {f.appointment.slot || ''}{f.appointment.slot ? ' · ' : ''}{f.appointment.id}
                        </p>
                      </>
                    ) : <span className="text-gray-400">None</span>}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell px-4 py-3 align-top text-xs text-gray-500">
                    {f.reminderSentAt ? (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <BellRing className="h-3.5 w-3.5" />
                        Sent {new Date(f.reminderSentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    ) : f.daysAway > 2 ? (
                      'Sent 2 days before'
                    ) : (
                      'Not sent'
                    )}
                  </TableCell>
                  {hasActions && (
                    <TableCell className="px-2 py-2.5 sm:px-4 sm:py-3 align-top">
                      <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:justify-end">
                        {canRemind && f.status !== 'visited' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 px-2 sm:px-3"
                            disabled={reminding === f.key}
                            onClick={() => remind(f)}
                            title="Send the patient a reminder now"
                          >
                            {reminding === f.key
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Bell className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">Remind</span>
                          </Button>
                        )}
                        {canEdit && f.status !== 'visited' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 px-2 sm:px-3"
                            onClick={() => setEditing(f)}
                            title="Change the follow-up date"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <EditFollowUpDialog
        followUp={editing}
        today={today}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load() }}
      />

      {data?.truncated && (
        <p className="text-xs text-amber-700">
          Showing the first 2,000 follow-ups only. Narrow the dates to see the rest.
        </p>
      )}
      {data && (
        <p className="text-xs text-gray-500">
          &quot;Booked&quot; and &quot;Visited&quot; mean the patient has an appointment at this
          hospital within {data.matchDays} days of the follow-up date.
        </p>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, tone, label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-xl border border-gray-100 bg-white p-3 sm:p-4 text-left shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/30"
    >
      <div className={cn('mb-2 flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9', tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl sm:text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-[11px] sm:text-xs text-gray-500">{label}</p>
    </button>
  )
}

/**
 * Change or remove a follow-up date. Saving moves the date on every
 * prescription behind this follow-up that the person may edit (a doctor:
 * their own). A new date gets its own automatic reminder two days before.
 */
function EditFollowUpDialog({ followUp, today, onClose, onSaved }) {
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(null) // 'save' | 'remove'

  useEffect(() => {
    if (followUp) setDate(followUp.followUpDate >= (today || '') ? followUp.followUpDate : '')
  }, [followUp, today])

  if (!followUp) return null

  const submit = async (newDate) => {
    setSaving(newDate === null ? 'remove' : 'save')
    const res = await updateFollowUpDate({
      patientId: followUp.patient.id,
      followUpDate: followUp.followUpDate,
      newDate,
    })
    setSaving(null)
    if (!res.success) { toast.error(res.error); return }
    toast.success(res.message)
    onSaved()
  }

  return (
    <Dialog open={Boolean(followUp)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left pr-6">
          <DialogTitle>Edit follow-up</DialogTitle>
          <DialogDescription>
            {followUp.patient.name} · currently {prettyDate(followUp.followUpDate)}
            {followUp.doctor ? ` · Dr. ${followUp.doctor.name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); if (date) submit(date) }}
          className="space-y-4"
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">New follow-up date</span>
            <Input
              type="date"
              value={date}
              min={today || undefined}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <p className="text-xs text-gray-500">
            The patient will get an automatic reminder two days before the new date.
          </p>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={Boolean(saving)}
              onClick={() => {
                if (confirm('Remove this follow-up? The patient will no longer be reminded about it.')) submit(null)
              }}
            >
              {saving === 'remove' ? 'Removing…' : 'Remove follow-up'}
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose} disabled={Boolean(saving)}>Cancel</Button>
              <Button type="submit" disabled={Boolean(saving) || !date || date === followUp.followUpDate}>
                {saving === 'save' ? 'Saving…' : 'Save date'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
