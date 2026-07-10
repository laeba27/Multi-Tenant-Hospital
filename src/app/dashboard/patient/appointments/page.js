import DashboardLayout from '@/components/layout/DashboardLayout'
import MyAppointmentsView from './MyAppointmentsView'

export const metadata = {
  title: 'My Appointments - Smile Returns',
  description: 'Your upcoming and past appointments, and book a new one.',
}

export default function MyAppointmentsPage() {
  return (
    <DashboardLayout roleLabel="Patient" showHeader>
      <MyAppointmentsView />
    </DashboardLayout>
  )
}
