import { getDoctorPatients, getDoctorPatientDetail } from '@/actions/doctor-patients'
import { DoctorPatientsView } from './DoctorPatientsView'

export const metadata = {
  title: 'My Patients',
  description: 'Patients you have treated, with their prescriptions and visit history.',
}

export default async function DoctorPatientsPage({ searchParams }) {
  const params = await searchParams
  const highlight = params?.highlight || null

  const patients = await getDoctorPatients()
  const detail = highlight ? await getDoctorPatientDetail(highlight) : null

  return (
    <DoctorPatientsView
      patients={patients}
      initialDetail={detail}
      initialHighlight={highlight}
    />
  )
}
