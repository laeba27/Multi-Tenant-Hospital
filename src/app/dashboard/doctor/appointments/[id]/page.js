import { redirect } from 'next/navigation'

export default async function AppointmentDetailsPage({ params }) {
  const { id } = await params
  redirect(`/dashboard/doctor/appointments/${id}/prescribe`)
}
