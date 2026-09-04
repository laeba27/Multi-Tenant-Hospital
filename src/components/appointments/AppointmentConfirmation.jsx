'use client'

import { Button } from '@/components/ui/button'
import { Check, Edit, FileText, User, Clock, Stethoscope, Pill } from 'lucide-react'

export function AppointmentConfirmation({ patient, appointment, onConfirm, onEdit, isLoading }) {
  if (!patient || !appointment) {
    return (
      <div className="flex items-center justify-center p-4 text-sm text-gray-500">
        Appointment details not available
      </div>
    )
  }

  const appointmentDate = new Date(appointment.appointment_date)
  const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  // The booking step passes the readable range; an appointment loaded from the
  // DB only has the raw 24-hour key, so fall back to formatting that. Staff read
  // "2:00 PM" far more reliably than "14:00".
  const formattedSlot = appointment.appointment_slot_label || to12Hour(appointment.appointment_slot)

  // Calculate totals properly
  const consultationFee = parseFloat(appointment.consultation_fee_snapshot || appointment.doctor_consultation_fee || 0)
  const treatmentsTotal = parseFloat(appointment.treatmentsTotal || 0)
  const totalAmount = consultationFee + treatmentsTotal

  // Handle treatment_details array
  const treatmentDetails = appointment.treatment_details || []

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      {/* Header */}
      <div className="border-b px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-600" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Confirm Appointment</h2>
            <p className="text-xs text-gray-500">Step 3 of 3</p>
          </div>
        </div>
      </div>

      {/* Content. Patient on the left, the appointment on the right -- the two
          things a receptionist cross-checks against each other before booking. */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 items-start">

          {/* ── Left column: who ── */}
          <div className="space-y-3">
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-1.5 bg-gray-50 border-b px-3 py-2">
                <User className="w-3.5 h-3.5 text-gray-600" />
                <p className="text-xs font-semibold text-gray-700">PATIENT INFORMATION</p>
              </div>
              <div className="divide-y">
                {[
                  ['Name', patient.name || patient.profile?.name || 'N/A'],
                  ['Contact', patient.mobile || patient.profile?.mobile || 'N/A'],
                  ['Reg. No', patient.registration_no || patient.profile?.registration_no || 'N/A'],
                  ['Gender', patient.gender || patient.profile?.gender || 'N/A'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3 px-3 py-2">
                    <span className="text-xs text-gray-500 shrink-0">{label}</span>
                    <span className="text-xs font-semibold text-gray-900 text-right truncate capitalize">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule reads as its own block -- it is what gets misread most. */}
            <div className="border border-indigo-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-1.5 bg-indigo-50 border-b border-indigo-200 px-3 py-2">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <p className="text-xs font-semibold text-indigo-900">SCHEDULE</p>
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <p className="text-[11px] text-gray-500">Date</p>
                  <p className="text-sm font-bold text-gray-900">{formattedDate}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Time</p>
                  <p className="text-sm font-bold text-indigo-700">{formattedSlot || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column: what ── */}
          <div className="space-y-3">
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-1.5 bg-gray-50 border-b px-3 py-2">
                <Stethoscope className="w-3.5 h-3.5 text-gray-600" />
                <p className="text-xs font-semibold text-gray-700">APPOINTMENT DETAILS</p>
              </div>
              <div className="divide-y">
                {[
                  ['Doctor', `Dr. ${appointment.doctor_name || 'N/A'}`],
                  ['Department', appointment.department_name || 'N/A'],
                  ['Type', appointment.appointment_type || 'General'],
                  ['Date & Time', `${formattedDate}${formattedSlot ? ` · ${formattedSlot}` : ''}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3 px-3 py-2">
                    <span className="text-xs text-gray-500 shrink-0">{label}</span>
                    <span className="text-xs font-semibold text-gray-900 text-right capitalize">{value}</span>
                  </div>
                ))}
              </div>
              {appointment.reason && (
                <div className="border-t px-3 py-2">
                  <p className="text-[11px] text-gray-500">Reason</p>
                  <p className="text-xs text-gray-900">{appointment.reason}</p>
                </div>
              )}
            </div>

            {consultationFee > 0 && (
              <div className="flex items-center justify-between border border-blue-200 rounded-lg px-3 py-2.5 bg-blue-50">
                <div className="flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-900">Consultation Fee</p>
                </div>
                <p className="text-sm font-bold text-blue-600">₹{consultationFee.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Treatments span both columns -- the rows need the full width. */}
          {treatmentDetails.length > 0 && (
            <div className="col-span-2 border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-gray-50 border-b px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-gray-600" />
                  <p className="text-xs font-semibold text-gray-700">TREATMENTS ({treatmentDetails.length})</p>
                </div>
                <span className="text-xs font-bold text-gray-900">₹{treatmentsTotal.toFixed(2)}</span>
              </div>
              <div className="divide-y">
                {treatmentDetails.map((t, index) => (
                  <div key={t.id || index} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-5 h-5 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-[10px] font-semibold">
                        {index + 1}
                      </div>
                      <p className="text-xs font-medium text-gray-900 truncate">{t.name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <span className="text-gray-500">₹{parseFloat(t.price || 0).toFixed(2)}</span>
                      {parseFloat(t.discount || 0) > 0 && (
                        <span className="text-red-600">-₹{parseFloat(t.discount).toFixed(2)}</span>
                      )}
                      <span className="font-bold text-gray-900 w-16 text-right">
                        ₹{(parseFloat(t.price || 0) - parseFloat(t.discount || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Amount */}
          <div className="col-span-2 flex items-center justify-between border rounded-lg px-3 py-2.5 bg-gray-50">
            <span className="text-xs font-semibold text-gray-700">ESTIMATED AMOUNT</span>
            <span className="text-base font-bold text-gray-900">₹{totalAmount.toFixed(2)}</span>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 bg-gray-50 flex gap-3">
        <Button
          variant="outline"
          onClick={onEdit}
          disabled={isLoading}
          className="flex-1 h-8 text-xs"
        >
          <Edit className="w-3 h-3 mr-1" />
          Edit
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 h-8 text-xs bg-gray-900 hover:bg-gray-800"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Confirming...
            </>
          ) : (
            <>
              <Check className="w-3 h-3 mr-1" />
              Confirm & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/** "14:00" -> "2:00 PM". Returns null for anything unparseable. */
function to12Hour(clock) {
  if (!clock) return null
  const [h, m] = String(clock).split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return clock
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}
