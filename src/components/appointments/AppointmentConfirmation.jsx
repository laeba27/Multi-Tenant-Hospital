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
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  // Calculate totals properly
  const consultationFee = parseFloat(appointment.consultation_fee_snapshot || appointment.doctor_consultation_fee || 0)
  const treatmentsTotal = parseFloat(appointment.treatmentsTotal || 0)
  const totalAmount = consultationFee + treatmentsTotal

  // Handle treatment_details array
  const treatmentDetails = appointment.treatment_details || []

  return (
    <div className="flex flex-col bg-white" style={{ height: '600px' }}>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* Patient Summary */}
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-1.5 pb-2 border-b">
            <User className="w-3.5 h-3.5 text-gray-600" />
            <p className="text-xs font-semibold text-gray-700">PATIENT INFORMATION</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-gray-500">Name</p>
              <p className="font-semibold text-gray-900">{patient.name || patient.profile?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Contact</p>
              <p className="font-semibold text-gray-900">{patient.mobile || patient.profile?.mobile || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Reg. No</p>
              <p className="font-semibold text-gray-900">{patient.registration_no || patient.profile?.registration_no || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Doctor & Appointment */}
        <div className="border rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-1.5 pb-2 border-b">
            <Stethoscope className="w-3.5 h-3.5 text-gray-600" />
            <p className="text-xs font-semibold text-gray-700">APPOINTMENT DETAILS</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-500">Doctor</p>
              <p className="font-semibold text-gray-900">Dr. {appointment.doctor_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Department</p>
              <p className="font-semibold text-gray-900">{appointment.department_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Type</p>
              <p className="font-semibold text-gray-900 capitalize">{appointment.appointment_type || 'General'}</p>
            </div>
            <div>
              <p className="text-gray-500">Date & Time</p>
              <p className="font-semibold text-gray-900">{formattedDate} at {appointment.appointment_slot || 'N/A'}</p>
            </div>
          </div>
          {appointment.reason && (
            <div className="pt-2 border-t">
              <p className="text-gray-500 text-xs">Reason</p>
              <p className="text-xs text-gray-900">{appointment.reason}</p>
            </div>
          )}
        </div>

        {/* Consultation Fee */}
        {consultationFee > 0 && (
          <div className="flex items-center justify-between border rounded-lg p-3 bg-blue-50">
            <div className="flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
              <p className="text-xs font-semibold text-blue-900">Consultation Fee</p>
            </div>
            <p className="text-sm font-bold text-blue-600">₹{consultationFee.toFixed(2)}</p>
          </div>
        )}

        {/* Treatments */}
        {treatmentDetails.length > 0 && (
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-gray-600" />
                <p className="text-xs font-semibold text-gray-700">TREATMENTS ({treatmentDetails.length})</p>
              </div>
              <span className="text-xs font-bold text-gray-900">₹{treatmentsTotal.toFixed(2)}</span>
            </div>

            <div className="space-y-1.5">
              {treatmentDetails.map((t, index) => (
                <div key={t.id || index} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{t.name}</p>
                      <p className="text-gray-500">Price: ₹{parseFloat(t.price || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {parseFloat(t.discount || 0) > 0 && (
                      <span className="text-xs text-red-600 line-through">₹{t.discount}</span>
                    )}
                    <span className="text-xs font-bold text-gray-900">₹{(parseFloat(t.price || 0) - parseFloat(t.discount || 0)).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule */}
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-1.5 pb-2 border-b">
            <Clock className="w-3.5 h-3.5 text-gray-600" />
            <p className="text-xs font-semibold text-gray-700">SCHEDULE</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-500">Date</p>
              <p className="font-semibold text-gray-900">{formattedDate}</p>
            </div>
            <div>
              <p className="text-gray-500">Time</p>
              <p className="font-semibold text-gray-900">{appointment.appointment_slot || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div className="flex items-center justify-between border rounded-lg p-3 bg-gray-50">
          <span className="text-xs font-semibold text-gray-700">ESTIMATED AMOUNT</span>
          <span className="text-sm font-bold text-gray-900">₹{totalAmount.toFixed(2)}</span>
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
