import { getDoctorAnalytics } from '@/actions/doctor-dashboard'
import { DoctorAnalyticsView } from './DoctorAnalyticsView'

export const metadata = {
  title: 'Analytics',
  description: 'Your clinical activity and hospital overview.',
}

export default async function DoctorAnalyticsPage() {
  const data = await getDoctorAnalytics()
  return <DoctorAnalyticsView data={data} />
}
