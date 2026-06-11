import { getDoctorPrescriptionTemplatesPageData } from '@/actions/prescriptions'
import { PrescriptionTemplatesPage } from '@/components/prescriptions/PrescriptionTemplatesPage'

export const metadata = {
  title: 'Prescriptions',
  description: 'Manage your prescription templates and custom sections.',
}

export default async function DoctorPrescriptionsPage() {
  const data = await getDoctorPrescriptionTemplatesPageData()

  return (
    <PrescriptionTemplatesPage
      doctor={data.doctor}
      hospital={data.hospital}
      dbTemplates={data.dbTemplates}
      templates={data.templates}
      optionSets={data.optionSets}
      presets={data.presets}
    />
  )
}
