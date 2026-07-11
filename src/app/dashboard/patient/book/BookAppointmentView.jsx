'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, MapPin, Phone, Star, BadgeCheck, ChevronLeft, Building2, CheckCircle2,
  Stethoscope, CalendarClock, UserPlus, Info as InfoIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  bookMyAppointment, getBookableHospitals, getMyDoctorsAtHospital,
  getMyProfileForBooking, updateMyProfileDetails,
} from '@/actions/patients'
import { getDoctorAvailableSlots } from '@/actions/appointments'
import SlotPicker from '@/components/appointments/SlotPicker'
import { getTreatments } from '@/actions/treatments'
import { useHospitalDoctorsAndDepartments } from '@/hooks/useHospitalDoctorsAndDepartments'

const today = () => new Date().toISOString().split('T')[0]

const TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'both', label: 'Both' },
]

function fmtDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BookAppointmentView() {
  const router = useRouter()

  const [hospitals, setHospitals] = useState([])
  const [loadingHospitals, setLoadingHospitals] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let cancelled = false
    getBookableHospitals().then((res) => {
      if (cancelled) return
      if (res.success) setHospitals(res.hospitals)
      else toast.error(res.error || 'Could not load hospitals')
      setLoadingHospitals(false)
    })
    return () => { cancelled = true }
  }, [])

  if (selected) {
    return (
      <BookingForm
        hospital={selected}
        onBack={() => setSelected(null)}
        onBooked={() => router.push('/dashboard/patient/appointments')}
      />
    )
  }

  const enrolled = hospitals.filter((h) => h.isRegistered || h.hasOngoing)
  const others = hospitals.filter((h) => !h.isRegistered && !h.hasOngoing)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Book an Appointment</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choose a hospital to begin.
        </p>
      </div>

      {loadingHospitals ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading hospitals…</div>
      ) : hospitals.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          No hospitals are available for booking right now.
        </div>
      ) : (
        <>
          {enrolled.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-indigo-600" /> Your hospitals
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {enrolled.map((h) => (
                  <HospitalPickCard key={h.hospital_id} hospital={h} onSelect={() => setSelected(h)} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              {enrolled.length > 0 ? 'Other hospitals' : 'All hospitals'}
            </h2>
            {others.length === 0 ? (
              <p className="text-sm text-gray-400">No other hospitals available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {others.map((h) => (
                  <HospitalPickCard key={h.hospital_id} hospital={h} onSelect={() => setSelected(h)} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function HospitalPickCard({ hospital, onSelect }) {
  const location = [hospital.city, hospital.state].filter(Boolean).join(', ')
  return (
    <button
      onClick={onSelect}
      className="text-left rounded-xl border border-gray-200 bg-white p-5 hover:border-indigo-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{hospital.name}</p>
            <p className="text-[11px] font-mono text-gray-400">{hospital.hospital_id}</p>
          </div>
        </div>
        {hospital.hasOngoing ? (
          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
            <Star className="h-3 w-3" /> Ongoing
          </Badge>
        ) : hospital.isRegistered ? (
          <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 shrink-0">
            <BadgeCheck className="h-3 w-3" /> Enrolled
          </Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-600 border border-gray-200 shrink-0">New</Badge>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        <p className="text-xs text-gray-600 flex items-start gap-2">
          <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
          <span>{location || 'Location not listed'}</span>
        </p>
        <p className="text-xs text-gray-600 flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          {hospital.phone || 'Phone not listed'}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {!hospital.isRegistered && (
          <span className="text-[11px] text-amber-700">You&apos;ll be registered here</span>
        )}
        <span className="ml-auto text-xs font-semibold text-indigo-600">Select →</span>
      </div>
    </button>
  )
}

function BookingForm({ hospital, onBack, onBooked }) {
  const hospitalId = hospital.hospital_id

  const [appointmentType, setAppointmentType] = useState('consultation')
  const [departmentId, setDepartmentId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [reason, setReason] = useState('')

  const [treatments, setTreatments] = useState([])
  const [selectedTreatmentIds, setSelectedTreatmentIds] = useState([])

  const [seenDoctors, setSeenDoctors] = useState([])
  const [otherDoctors, setOtherDoctors] = useState([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)

  const [slots, setSlots] = useState([])
  const [slotsReason, setSlotsReason] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Optional "complete your details" section.
  const [profile, setProfile] = useState(null)
  const [details, setDetails] = useState({})

  const { departments } = useHospitalDoctorsAndDepartments(hospitalId)

  const needsTreatment = appointmentType === 'treatment' || appointmentType === 'both'

  // Doctors split into seen-before vs new.
  useEffect(() => {
    let cancelled = false
    setLoadingDoctors(true)
    getMyDoctorsAtHospital(hospitalId).then((res) => {
      if (cancelled) return
      setSeenDoctors(res.seen || [])
      setOtherDoctors(res.others || [])
      setLoadingDoctors(false)
    })
    return () => { cancelled = true }
  }, [hospitalId])

  // Which profile fields are blank, so we can offer to complete them.
  useEffect(() => {
    let cancelled = false
    getMyProfileForBooking().then((res) => {
      if (cancelled || !res.success) return
      setProfile(res.profile)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!needsTreatment) { setTreatments([]); return }
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

  // A department filter narrows the doctor lists too.
  const filterDept = (list) =>
    departmentId ? list.filter((d) => String(d.department_id) === String(departmentId)) : list
  const visibleSeen = filterDept(seenDoctors)
  const visibleOthers = filterDept(otherDoctors)

  useEffect(() => { setDoctorId(''); setSlot('') }, [departmentId])
  useEffect(() => { setSlot('') }, [doctorId, date])
  useEffect(() => { if (!needsTreatment) setSelectedTreatmentIds([]) }, [needsTreatment])

  useEffect(() => {
    if (!doctorId || !date) { setSlots([]); setSlotsReason(null); return }
    let cancelled = false
    setLoadingSlots(true)
    getDoctorAvailableSlots(doctorId, date, hospitalId)
      .then((res) => {
        if (cancelled) return
        setSlots(res?.slots || [])
        setSlotsReason(res?.reason || null)
      })
      .catch(() => { if (!cancelled) setSlots([]) })
      .finally(() => { if (!cancelled) setLoadingSlots(false) })
    return () => { cancelled = true }
  }, [doctorId, date, hospitalId])

  const toggleTreatment = (id) => {
    setSelectedTreatmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // Fields the profile is still missing -> offered (not required) at confirm.
  const MISSING_SPECS = [
    { key: 'blood_group', label: 'Blood group', type: 'select',
      options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    { key: 'date_of_birth', label: 'Date of birth', type: 'date' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'state', label: 'State', type: 'text' },
    { key: 'pincode', label: 'Pincode', type: 'text' },
    { key: 'emergency_contact_name', label: 'Emergency contact name', type: 'text' },
    { key: 'emergency_contact_mobile', label: 'Emergency contact phone', type: 'text' },
  ]
  const missing = profile
    ? MISSING_SPECS.filter((f) => !String(profile[f.key] || '').trim())
    : []

  async function submit(e) {
    e.preventDefault()

    if (needsTreatment && selectedTreatmentIds.length === 0) {
      toast.error('Select at least one treatment, or choose Consultation.')
      return
    }

    const chosenTreatments = visibleTreatments
      .filter((t) => selectedTreatmentIds.includes(t.id))
      .map((t) => ({ id: t.id, name: t.treatment_name || t.name }))

    setSubmitting(true)

    // Save any optional details the patient filled in, before booking. A failure
    // here shouldn't block the appointment -- it's recommended, not required.
    const toSave = Object.fromEntries(
      Object.entries(details).filter(([, v]) => String(v || '').trim() !== '')
    )
    if (Object.keys(toSave).length > 0) {
      try { await updateMyProfileDetails(toSave) } catch { /* non-blocking */ }
    }

    const res = await bookMyAppointment({
      hospitalId, departmentId, doctorId, date, slot, reason,
      appointmentType, treatments: chosenTreatments,
    })
    setSubmitting(false)

    if (!res?.success) {
      toast.error(res?.error || 'Could not book the appointment.')
      return
    }
    toast.success('Appointment booked.')
    onBooked?.()
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ChevronLeft className="h-4 w-4" /> Choose a different hospital
      </button>

      {/* Chosen hospital summary */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">{hospital.name}</p>
          <p className="text-xs text-gray-600">
            {[hospital.city, hospital.state].filter(Boolean).join(', ') || 'Location not listed'}
            {hospital.phone ? ` · ${hospital.phone}` : ''}
          </p>
          {!hospital.isRegistered && (
            <p className="text-[11px] text-amber-700 mt-1">
              You&apos;ll be registered at this hospital when you book.
            </p>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / main column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
            <div>
              <Label className="mb-2 block">Appointment Type *</Label>
              <div className="grid grid-cols-3 gap-2 max-w-md">
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

            <div className="max-w-xs">
              <Label className="mb-2 block">Department</Label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {needsTreatment && (
              <div>
                <Label className="mb-2 block">
                  Treatment{departmentId ? ' (for the selected department)' : ''} *
                </Label>
                {visibleTreatments.length === 0 ? (
                  <p className="text-xs text-gray-500 border border-gray-200 rounded-md px-3 py-3">
                    No treatments listed for this hospital.
                  </p>
                ) : (
                  <div className="max-h-44 overflow-y-auto rounded-md border border-gray-200 divide-y">
                    {visibleTreatments.map((t) => {
                      const name = t.treatment_name || t.name
                      return (
                        <label
                          key={t.id}
                          className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTreatmentIds.includes(t.id)}
                            onChange={() => toggleTreatment(t.id)}
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
          </div>

          {/* Doctor step: your doctors vs others */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <Label className="block">Doctor *</Label>

            {loadingDoctors ? (
              <p className="text-sm text-gray-400 py-4 text-center">Loading doctors…</p>
            ) : visibleSeen.length + visibleOthers.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No doctors available{departmentId ? ' in this department' : ''}.
              </p>
            ) : (
              <>
                {visibleSeen.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" /> Your doctors
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {visibleSeen.map((d) => (
                        <DoctorCard
                          key={d.id}
                          doctor={d}
                          selected={doctorId === d.id}
                          onSelect={() => setDoctorId(d.id)}
                          sub={`Last visited ${fmtDate(d.lastVisit)}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {visibleOthers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                      <UserPlus className="h-3.5 w-3.5" /> Other doctors
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {visibleOthers.map((d) => (
                        <DoctorCard
                          key={d.id}
                          doctor={d}
                          selected={doctorId === d.id}
                          onSelect={() => setDoctorId(d.id)}
                          sub={d.specialization || 'General'}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Optional: complete your details */}
          {missing.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 space-y-4">
              <div className="flex items-start gap-2">
                <InfoIcon className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Complete your details (optional)</p>
                  <p className="text-xs text-amber-800">
                    These help your doctor. You can fill any of them now or skip.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {missing.map((f) => (
                  <div key={f.key}>
                    <Label className="mb-1.5 block text-xs">{f.label}</Label>
                    {f.type === 'select' ? (
                      <select
                        value={details[f.key] || ''}
                        onChange={(e) => setDetails((p) => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                      >
                        <option value="">Select…</option>
                        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <Input
                        type={f.type}
                        max={f.type === 'date' ? today() : undefined}
                        value={details[f.key] || ''}
                        onChange={(e) => setDetails((p) => ({ ...p, [f.key]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: schedule + confirm */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4 lg:sticky lg:top-6">
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
              {!doctorId || !date ? (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-400">
                    Choose a doctor and a date to see the available times.
                  </p>
                </div>
              ) : (
                // showCapacity is deliberately off: a patient sees only whether
                // a slot is open, never how full it is.
                <SlotPicker
                  slots={slots}
                  value={slot}
                  onChange={setSlot}
                  loading={loadingSlots}
                  reason={slotsReason}
                />
              )}
            </div>

            <div>
              <Label className="mb-2 block">Reason for visit</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Toothache"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || !doctorId || !date || !slot}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

function DoctorCard({ doctor, selected, onSelect, sub }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-lg border px-4 py-3 flex items-center gap-3 transition-colors ${
        selected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
        <Stethoscope className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">Dr. {doctor.name}</p>
        <p className="text-[11px] text-gray-500 truncate">{sub}</p>
      </div>
    </button>
  )
}
