'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { bookMyAppointment, getBookableHospitals } from '@/actions/patients'
import { getDoctorAvailableSlots } from '@/actions/appointments'
import { getTreatments } from '@/actions/treatments'
import { useHospitalDoctorsAndDepartments } from '@/hooks/useHospitalDoctorsAndDepartments'

const today = () => new Date().toISOString().split('T')[0]

const TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'both', label: 'Both' },
]

export default function BookAppointmentDialog({ open, onClose, onBooked }) {
  const [hospitals, setHospitals] = useState([])
  const [loadingHospitals, setLoadingHospitals] = useState(false)
  const [hospitalId, setHospitalId] = useState('')
  const [appointmentType, setAppointmentType] = useState('consultation')
  const [departmentId, setDepartmentId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [reason, setReason] = useState('')

  const [treatments, setTreatments] = useState([])
  const [selectedTreatmentIds, setSelectedTreatmentIds] = useState([])

  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { departments, doctors, loading: loadingDD } = useHospitalDoctorsAndDepartments(hospitalId || null)

  const needsTreatment = appointmentType === 'treatment' || appointmentType === 'both'

  // Treatment catalogue for the chosen hospital, filtered by department.
  useEffect(() => {
    if (!hospitalId || !needsTreatment) { setTreatments([]); return }
    let cancelled = false
    getTreatments(hospitalId)
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res) ? res : res?.treatments || res?.data || []
        setTreatments(list)
      })
      .catch(() => { if (!cancelled) setTreatments([]) })
    return () => { cancelled = true }
  }, [hospitalId, needsTreatment])

  const visibleTreatments = departmentId
    ? treatments.filter((t) => !t.department_id || String(t.department_id) === String(departmentId))
    : treatments

  // Load every bookable hospital on the platform when the dialog opens.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingHospitals(true)
    getBookableHospitals().then((res) => {
      if (cancelled) return
      if (res.success) setHospitals(res.hospitals)
      else toast.error(res.error || 'Could not load hospitals')
      setLoadingHospitals(false)
    })
    return () => { cancelled = true }
  }, [open])

  const selectedHospital = hospitals.find((h) => h.hospital_id === hospitalId)

  // Changing hospital or department invalidates the doctor below it.
  useEffect(() => { setDoctorId(''); setSlot('') }, [hospitalId, departmentId])
  useEffect(() => { setSlot('') }, [doctorId, date])

  // Load real availability rather than offering slots that are already taken.
  useEffect(() => {
    if (!doctorId || !date || !hospitalId) { setSlots([]); return }
    let cancelled = false
    setLoadingSlots(true)
    getDoctorAvailableSlots(doctorId, date, hospitalId)
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res) ? res : res?.slots || []
        setSlots(list)
      })
      .catch(() => { if (!cancelled) setSlots([]) })
      .finally(() => { if (!cancelled) setLoadingSlots(false) })
    return () => { cancelled = true }
  }, [doctorId, date, hospitalId])

  const visibleDoctors = departmentId
    ? doctors.filter((d) => String(d.department_id) === String(departmentId))
    : doctors

  // Drop any treatment selection when the type no longer needs it.
  useEffect(() => { if (!needsTreatment) setSelectedTreatmentIds([]) }, [needsTreatment])

  const toggleTreatment = (id) => {
    setSelectedTreatmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const reset = () => {
    setHospitalId(''); setAppointmentType('consultation'); setDepartmentId(''); setDoctorId('')
    setDate(''); setSlot(''); setReason(''); setSlots([]); setSelectedTreatmentIds([])
  }

  async function submit(e) {
    e.preventDefault()

    if (needsTreatment && selectedTreatmentIds.length === 0) {
      toast.error('Select at least one treatment, or choose Consultation.')
      return
    }

    const chosen = visibleTreatments
      .filter((t) => selectedTreatmentIds.includes(t.id))
      .map((t) => ({ id: t.id, name: t.treatment_name || t.name }))

    setSubmitting(true)
    const res = await bookMyAppointment({
      hospitalId, departmentId, doctorId, date, slot, reason,
      appointmentType, treatments: chosen,
    })
    setSubmitting(false)

    if (!res?.success) {
      toast.error(res?.error || 'Could not book the appointment.')
      return
    }
    toast.success('Appointment booked.')
    reset()
    onBooked?.()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book an Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className="mb-2 block">Hospital *</Label>
            <select
              required
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              disabled={loadingHospitals}
              className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm disabled:bg-gray-50"
            >
              <option value="">
                {loadingHospitals ? 'Loading hospitals…' : 'Select a hospital'}
              </option>
              {hospitals.map((h) => {
                const loc = [h.city, h.state].filter(Boolean).join(', ')
                const tag = h.hasOngoing ? '  ★ Ongoing' : h.isRegistered ? '  • Your hospital' : '  (new)'
                return (
                  <option key={h.hospital_id} value={h.hospital_id}>
                    {h.name}{loc ? ` — ${loc}` : ''}{tag}
                  </option>
                )
              })}
            </select>
            {selectedHospital && !selectedHospital.isRegistered && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                You&apos;re not registered at {selectedHospital.name} yet. Booking here will
                register you automatically.
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2 block">Appointment Type *</Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setAppointmentType(t.value)}
                  className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                    appointmentType === t.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Department</Label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={!hospitalId || loadingDD}
                className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm disabled:bg-gray-50"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="mb-2 block">Doctor *</Label>
              <select
                required
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                disabled={!hospitalId || loadingDD}
                className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm disabled:bg-gray-50"
              >
                <option value="">
                  {loadingDD ? 'Loading…' : 'Select a doctor'}
                </option>
                {visibleDoctors.map((d) => (
                  <option key={d.id} value={d.id}>Dr. {d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {needsTreatment && (
            <div>
              <Label className="mb-2 block">
                Treatment{departmentId ? ' (for the selected department)' : ''} *
              </Label>
              {visibleTreatments.length === 0 ? (
                <p className="text-xs text-gray-500 border border-gray-200 rounded-md px-3 py-3">
                  {hospitalId ? 'No treatments listed for this hospital.' : 'Select a hospital first.'}
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200 divide-y">
                  {visibleTreatments.map((t) => {
                    const id = t.id
                    const name = t.treatment_name || t.name
                    const checked = selectedTreatmentIds.includes(id)
                    return (
                      <label
                        key={id}
                        className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTreatment(id)}
                          className="h-4 w-4 accent-indigo-600"
                        />
                        <span className="text-gray-800">{name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Date *</Label>
              <Input
                type="date"
                required
                min={today()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!doctorId}
              />
            </div>

            <div>
              <Label className="mb-2 block">Time Slot *</Label>
              <select
                required
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                disabled={!doctorId || !date || loadingSlots}
                className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm disabled:bg-gray-50"
              >
                <option value="">
                  {loadingSlots
                    ? 'Checking availability…'
                    : slots.length === 0 && doctorId && date
                      ? 'No slots available'
                      : 'Select a time'}
                </option>
                {slots.map((s) => {
                  const value = typeof s === 'string' ? s : s.slot || s.time
                  return <option key={value} value={value}>{value}</option>
                })}
              </select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Reason for visit</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Toothache, routine check-up"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !hospitalId || !doctorId || !date || !slot}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
