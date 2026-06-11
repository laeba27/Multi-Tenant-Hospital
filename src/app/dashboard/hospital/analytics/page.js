import { getHospitalAnalytics } from '@/actions/hospital-dashboard'
import { HospitalAnalyticsView } from './HospitalAnalyticsView'

export const metadata = {
  title: 'Analytics',
  description: 'Hospital-wide staff, patient and appointment activity.',
}

export default async function HospitalAnalyticsPage() {
  const data = await getHospitalAnalytics()
  return <HospitalAnalyticsView data={data} />
}
