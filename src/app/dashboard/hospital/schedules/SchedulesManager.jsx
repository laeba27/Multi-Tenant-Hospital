'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  CalendarOff,
  Clock,
  Plus,
  Trash2,
  Stethoscope,
  Coffee,
  Users,
  CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getStaffSchedules,
  updateStaffSchedule,
  getUnavailability,
  createUnavailability,
  deleteUnavailability,
} from '@/actions/schedules'

const DAYS = [
  { value: 'monday', short: 'Mon' },
  { value: 'tuesday', short: 'Tue' },
  { value: 'wednesday', short: 'Wed' },
  { value: 'thursday', short: 'Thu' },
  { value: 'friday', short: 'Fri' },
  { value: 'saturday', short: 'Sat' },
  { value: 'sunday', short: 'Sun' },
]

const SLOT_LENGTHS = [15, 20, 30, 45, 60, 90, 120]

const fmtDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

const fmtTime = (t) => (t ? t.slice(0, 5) : null)

/** 07:00 + 60min → "7:00 – 8:00 AM", so the admin sees the blocks they're creating. */
function previewBlocks(start, end, step) {
  if (!start || !end || !step) return []
  const toMin = (t) => {
    const [h, m] = t.split(':')
    return Number(h) * 60 + Number(m)
  }
  const fmt = (mins) => {
    const m = mins % 1440
    const h24 = Math.floor(m / 60)
    const mm = m % 60
    const s = h24 >= 12 ? 'PM' : 'AM'
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12
    return `${h12}:${String(mm).padStart(2, '0')} ${s}`
  }
  const s = toMin(start)
  let e = toMin(end)
  if (e <= s) e += 1440
  // Blocks align to the clock, not the shift start — a 06:30 shift still yields
  // 7:00–8:00, not 6:30–7:30. Must match getDoctorAvailableSlots exactly, or the
  // admin previews blocks that differ from the ones patients are offered.
  const first = Math.ceil(s / step) * step
  const out = []
  for (let t = first; t + step <= e && out.length < 40; t += step) {
    out.push(`${fmt(t)} – ${fmt(t + step)}`)
  }
  return out
}

export default function SchedulesManager({ hospitalId }) {
  const [staff, setStaff] = useState([])
  const [absences, setAbsences] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showLeave, setShowLeave] = useState(false)

  const load = useCallback(async () => {
    if (!hospitalId) return
    setLoading(true)
    const [s, a] = await Promise.all([
      getStaffSchedules(hospitalId),
      getUnavailability(hospitalId),
    ])
    if (s.success) setStaff(s.staff)
    else toast.error(s.error || 'Could not load schedules')
    if (a.success) setAbsences(a.entries)
    setLoading(false)
  }, [hospitalId])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = (m) => {
    setEditing({
      id: m.id,
      name: m.name,
      role: m.role,
      shiftName: m.shift_name || '',
      shiftStart: fmtTime(m.shift_start_time) || '',
      shiftEnd: fmtTime(m.shift_end_time) || '',
      breakStart: fmtTime(m.break_start_time) || '',
      breakEnd: fmtTime(m.break_end_time) || '',
      workDays: Array.isArray(m.work_days) ? m.work_days : [],
      slotDuration: m.slot_duration_minutes || 60,
      maxPerSlot: m.max_patients_per_slot || 1,
      maxPerDay: m.max_patients_per_day ?? '',
    })
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await updateStaffSchedule(editing.id, editing)
    setSaving(false)
    if (!res.success) {
      toast.error(res.error || 'Could not save')
      return
    }
    toast.success(`${editing.name}'s schedule saved`)
    setEditing(null)
    load()
  }

  const toggleDay = (day) =>
    setEditing((p) => ({
      ...p,
      workDays: p.workDays.includes(day)
        ? p.workDays.filter((d) => d !== day)
        : [...p.workDays, day],
    }))

  const doctors = staff.filter((s) => s.role === 'doctor')
  const others = staff.filter((s) => s.role !== 'doctor')

  const blocks = editing
    ? previewBlocks(editing.shiftStart, editing.shiftEnd, Number(editing.slotDuration))
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shifts &amp; Slots</h1>
        <p className="text-gray-600 mt-2">
          Set who works when. This controls the time slots reception and patients can book.
        </p>
      </div>

      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedules">Staff Schedules</TabsTrigger>
          <TabsTrigger value="leave" className="gap-2">
            Leave &amp; Holidays
            {absences.length > 0 && (
              <Badge className="bg-amber-100 text-amber-800">{absences.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Schedules ── */}
        <TabsContent value="schedules" className="space-y-4">
          {loading ? (
            <p className="py-12 text-center text-sm text-gray-400">Loading…</p>
          ) : (
            <>
              <ScheduleSection
                title="Doctors"
                description="Their schedule decides which appointment slots exist."
                members={doctors}
                onEdit={openEdit}
                highlight
              />
              {others.length > 0 && (
                <ScheduleSection
                  title="Other Staff"
                  description="Working hours for the rest of the team."
                  members={others}
                  onEdit={openEdit}
                />
              )}
            </>
          )}
        </TabsContent>

        {/* ── Leave ── */}
        <TabsContent value="leave">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Leave &amp; Holidays</CardTitle>
                  <CardDescription>
                    A doctor on leave shows red and cannot be booked. A hospital holiday closes
                    every doctor&apos;s diary that day.
                  </CardDescription>
                </div>
                <Button onClick={() => setShowLeave(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {absences.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarOff className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nothing scheduled</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Add a leave or a public holiday and booking will respect it.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {absences.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={
                              a.kind === 'holiday'
                                ? 'bg-purple-100 text-purple-800'
                                : a.kind === 'leave'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-700'
                            }
                          >
                            {a.kind}
                          </Badge>
                          <p className="font-medium text-sm text-gray-900">
                            {a.staff?.name || 'Whole hospital'}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {fmtDate(a.starts_on)}
                          {a.ends_on !== a.starts_on && ` → ${fmtDate(a.ends_on)}`}
                          {a.starts_at_time &&
                            ` · ${fmtTime(a.starts_at_time)}–${fmtTime(a.ends_at_time)}`}
                          {a.reason && ` · ${a.reason}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 shrink-0"
                        onClick={async () => {
                          const res = await deleteUnavailability(a.id)
                          if (res.success) {
                            toast.success('Removed')
                            load()
                          } else toast.error(res.error || 'Could not remove')
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit schedule */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>{editing.name}</DialogTitle>
                <DialogDescription className="capitalize">
                  {editing.role.replace('_', ' ')} · working hours and appointment slots
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={save} className="space-y-5 mt-2">
                <div>
                  <Label>Working days *</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DAYS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                          editing.workDays.includes(d.value)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        {d.short}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Days not selected show as unavailable when booking.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ss">Shift starts *</Label>
                    <Input
                      id="ss"
                      type="time"
                      value={editing.shiftStart}
                      onChange={(e) => setEditing({ ...editing, shiftStart: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="se">Shift ends *</Label>
                    <Input
                      id="se"
                      type="time"
                      value={editing.shiftEnd}
                      onChange={(e) => setEditing({ ...editing, shiftEnd: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bs" className="flex items-center gap-1.5">
                      <Coffee className="h-3.5 w-3.5" /> Break starts
                    </Label>
                    <Input
                      id="bs"
                      type="time"
                      value={editing.breakStart}
                      onChange={(e) => setEditing({ ...editing, breakStart: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="be">Break ends</Label>
                    <Input
                      id="be"
                      type="time"
                      value={editing.breakEnd}
                      onChange={(e) => setEditing({ ...editing, breakEnd: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 -mt-3">
                  Slots overlapping the break are not offered. Leave both blank for no break.
                </p>

                {editing.role === 'doctor' && (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
                    <p className="text-xs font-semibold text-indigo-900 uppercase">
                      Appointment slots
                    </p>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="sd">Slot length</Label>
                        <Select
                          value={String(editing.slotDuration)}
                          onValueChange={(v) => setEditing({ ...editing, slotDuration: Number(v) })}
                        >
                          <SelectTrigger id="sd" className="mt-1 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SLOT_LENGTHS.map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n} min
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="mps">Patients / slot</Label>
                        <Input
                          id="mps"
                          type="number"
                          min="1"
                          value={editing.maxPerSlot}
                          onChange={(e) => setEditing({ ...editing, maxPerSlot: e.target.value })}
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="mpd">Patients / day</Label>
                        <Input
                          id="mpd"
                          type="number"
                          min="1"
                          placeholder="No limit"
                          value={editing.maxPerDay}
                          onChange={(e) => setEditing({ ...editing, maxPerDay: e.target.value })}
                          className="mt-1 bg-white"
                        />
                      </div>
                    </div>

                    {blocks.length > 0 && (
                      <div>
                        <p className="text-xs text-indigo-900 mb-1.5">
                          This creates {blocks.length} slot{blocks.length === 1 ? '' : 's'} a day,
                          each holding {editing.maxPerSlot} patient
                          {Number(editing.maxPerSlot) === 1 ? '' : 's'}:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {blocks.slice(0, 8).map((b) => (
                            <span
                              key={b}
                              className="text-[11px] bg-white border border-indigo-100 rounded px-1.5 py-0.5 text-indigo-800"
                            >
                              {b}
                            </span>
                          ))}
                          {blocks.length > 8 && (
                            <span className="text-[11px] text-indigo-600 px-1 py-0.5">
                              +{blocks.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save Schedule'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <LeaveDialog
        open={showLeave}
        onClose={() => setShowLeave(false)}
        hospitalId={hospitalId}
        staff={staff}
        onSaved={() => {
          setShowLeave(false)
          load()
        }}
      />
    </div>
  )
}

function ScheduleSection({ title, description, members, onEdit, highlight }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Nobody here yet.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const days = Array.isArray(m.work_days) ? m.work_days : []
              const hasShift = m.shift_start_time && m.shift_end_time
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-3 hover:border-indigo-200 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {highlight && <Stethoscope className="h-3.5 w-3.5 text-indigo-500" />}
                      <p className="font-medium text-sm text-gray-900">{m.name}</p>
                      {!m.is_active && <Badge variant="outline">Inactive</Badge>}
                      {!hasShift && (
                        <Badge className="bg-rose-100 text-rose-800">No hours set</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-gray-500">
                      {hasShift && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {fmtTime(m.shift_start_time)}–{fmtTime(m.shift_end_time)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {days.length === 0
                          ? 'No days set'
                          : days.length === 7
                            ? 'Every day'
                            : DAYS.filter((d) => days.includes(d.value))
                                .map((d) => d.short)
                                .join(', ')}
                      </span>
                      {m.role === 'doctor' && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {m.slot_duration_minutes || 60}min slots ·{' '}
                          {m.max_patients_per_slot || 1}/slot
                        </span>
                      )}
                      {m.break_start_time && (
                        <span className="flex items-center gap-1">
                          <Coffee className="h-3 w-3" />
                          {fmtTime(m.break_start_time)}–{fmtTime(m.break_end_time)}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => onEdit(m)}>
                    Edit
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LeaveDialog({ open, onClose, hospitalId, staff, onSaved }) {
  const [form, setForm] = useState({
    kind: 'leave',
    staffId: '',
    startsOn: '',
    endsOn: '',
    partial: false,
    startsAtTime: '',
    endsAtTime: '',
    reason: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        kind: 'leave',
        staffId: '',
        startsOn: '',
        endsOn: '',
        partial: false,
        startsAtTime: '',
        endsAtTime: '',
        reason: '',
      })
    }
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await createUnavailability({
      hospitalId,
      // A hospital holiday has no owner -- one row closes every diary.
      staffId: form.kind === 'holiday' ? null : form.staffId || null,
      kind: form.kind,
      startsOn: form.startsOn,
      endsOn: form.endsOn || form.startsOn,
      startsAtTime: form.partial ? form.startsAtTime : null,
      endsAtTime: form.partial ? form.endsAtTime : null,
      reason: form.reason,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.error || 'Could not save')
      return
    }
    toast.success('Saved')
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Leave or Holiday</DialogTitle>
          <DialogDescription>
            Booked appointments are not cancelled — this only blocks new bookings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="kind">Type</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
              <SelectTrigger id="kind" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leave">Leave (one person)</SelectItem>
                <SelectItem value="holiday">Holiday (whole hospital)</SelectItem>
                <SelectItem value="unavailable">Unavailable (one person)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.kind !== 'holiday' && (
            <div>
              <Label htmlFor="who">Who *</Label>
              <Select
                value={form.staffId}
                onValueChange={(v) => setForm({ ...form, staffId: v })}
              >
                <SelectTrigger id="who" className="mt-1">
                  <SelectValue placeholder="Choose a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.role.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from">From *</Label>
              <Input
                id="from"
                type="date"
                required
                value={form.startsOn}
                onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                min={form.startsOn}
                value={form.endsOn}
                onChange={(e) => setForm({ ...form, endsOn: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">Blank = one day only.</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.partial}
              onChange={(e) => setForm({ ...form, partial: e.target.checked })}
              className="h-4 w-4"
            />
            Only part of the day
          </label>

          {form.partial && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ft">From time</Label>
                <Input
                  id="ft"
                  type="time"
                  value={form.startsAtTime}
                  onChange={(e) => setForm({ ...form, startsAtTime: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tt">To time</Label>
                <Input
                  id="tt"
                  type="time"
                  value={form.endsAtTime}
                  onChange={(e) => setForm({ ...form, endsAtTime: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              rows={2}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Annual leave, Diwali"
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
