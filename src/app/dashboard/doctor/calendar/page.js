import DashboardCalendarPage from '@/components/Calendar/DashboardCalendarPage'

export const metadata = {
  title: 'Doctor Calendar - Hospital Management Portal',
  description: 'Doctor calendar',
}

export default function DoctorCalendarPage() {
  return (
    <DashboardCalendarPage
      title="Doctor Calendar"
      description="Track appointments, rounds, and follow-ups in one place"
      userRole="doctor"
    />
  )
}
