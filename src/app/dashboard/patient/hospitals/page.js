import DashboardLayout from '@/components/layout/DashboardLayout'
import MyHospitalsView from './MyHospitalsView'

export const metadata = {
  title: 'My Hospitals - Smile Returns',
  description: 'Every hospital you are registered at.',
}

export default function MyHospitalsPage() {
  return (
    <DashboardLayout roleLabel="Patient">
      <MyHospitalsView />
    </DashboardLayout>
  )
}
