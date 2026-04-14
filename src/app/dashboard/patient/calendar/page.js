import DashboardCalendarPage from '@/components/Calendar/DashboardCalendarPage'

export const metadata = {
  title: 'Patient Calendar - Hospital Management Portal',
  description: 'Patient calendar',
}

export default function PatientCalendarPage() {
  return (
    <DashboardCalendarPage
      title="Patient Calendar"
      description="Keep track of your appointments, medications, and follow-up dates"
      userRole="patient"
    />
  )
}
