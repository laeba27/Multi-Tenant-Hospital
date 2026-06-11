import { redirect } from 'next/navigation'

export default async function NewAppointmentPrescriptionPage({ searchParams }) {
  const params = await searchParams
  const appointmentId = params?.appointmentId

  if (!appointmentId) {
    redirect('/dashboard/doctor/appointments')
  }

  redirect(`/dashboard/doctor/appointments/${appointmentId}/prescribe`)
}
