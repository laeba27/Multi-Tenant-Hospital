import DashboardCalendarPage from '@/components/Calendar/DashboardCalendarPage'

export const metadata = {
  title: 'Reception Calendar - Hospital Management Portal',
  description: 'Reception calendar',
}

export default function ReceptionCalendarPage() {
  return (
    <DashboardCalendarPage
      title="Reception Calendar"
      description="Coordinate front desk scheduling, check-ins, and reminders"
      userRole="receptionist"
    />
  )
}
