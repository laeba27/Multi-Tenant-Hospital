import { getDoctorPrescriptionTemplatesPageData } from '@/actions/prescriptions'
import { PrescriptionTemplateStudio } from '@/components/prescriptions/PrescriptionTemplateStudio'

export const metadata = {
  title: 'Prescription Templates',
  description: 'Template and customization workspace for doctor prescriptions.',
}

export default async function DoctorPrescriptionTemplatesPage() {
  const data = await getDoctorPrescriptionTemplatesPageData()

  return (
    <PrescriptionTemplateStudio
      doctor={data.doctor}
      hospital={data.hospital}
      templates={data.templates}
      optionSets={data.optionSets}
      presets={data.presets}
    />
  )
}
