import { getAppointmentWithPrescriptions } from '@/actions/prescriptions'
import { AppointmentDetailsView } from '../../AppointmentDetailsView'

export const metadata = {
  title: 'Appointment Prescription',
  description: 'Write prescriptions within the appointment context.',
}

export default async function AppointmentPrescriptionPage({ params }) {
  const { id: appointmentId } = await params

  let appointmentData = null
  let error = null

  try {
    appointmentData = await getAppointmentWithPrescriptions(appointmentId)
  } catch (err) {
    console.error('Error loading appointment:', err)
    error = err.message || 'Failed to load appointment'
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-900">Error Loading Appointment</h1>
          <p className="text-red-700 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  if (!appointmentData) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h1 className="text-lg font-semibold text-gray-900">Appointment Not Found</h1>
          <p className="text-gray-600 mt-2">The appointment you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <AppointmentDetailsView
      appointmentData={appointmentData}
      appointmentId={appointmentId}
      showPrescriptionComposer={false}
    />
  )
}
