import { getDoctorPrescriptionComposerData } from '@/actions/prescriptions'
import { PrescriptionComposer } from '@/components/prescriptions/PrescriptionComposer'

export const metadata = {
  title: 'New Prescription',
  description: 'Compose a prescription from a template-driven layout.',
}

export default async function DoctorPrescriptionNewPage({ searchParams }) {
  const resolvedSearchParams = await searchParams
  const appointmentId = resolvedSearchParams?.appointmentId
  const data = await getDoctorPrescriptionComposerData(appointmentId)

  return (
    <PrescriptionComposer
      appointment={data.appointment}
      doctor={data.doctor}
      hospital={data.hospital}
      templates={data.templates}
      optionSets={data.optionSets}
      selectedTemplate={data.selectedTemplate}
      presets={data.presets}
    />
  )
}
