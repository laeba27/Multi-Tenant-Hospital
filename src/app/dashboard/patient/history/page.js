import DashboardLayout from '@/components/layout/DashboardLayout'
import MyHistoryView from './MyHistoryView'

export const metadata = {
  title: 'My History - Smile Returns',
  description: 'Your past visits and the prescriptions issued to you.',
}

export default function MyHistoryPage() {
  return (
    <DashboardLayout roleLabel="Patient">
      <MyHistoryView />
    </DashboardLayout>
  )
}
