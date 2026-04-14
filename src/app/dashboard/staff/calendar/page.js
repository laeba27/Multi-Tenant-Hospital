import DashboardCalendarPage from '@/components/Calendar/DashboardCalendarPage'

export const metadata = {
  title: 'Staff Calendar - Hospital Management Portal',
  description: 'Staff calendar',
}

export default function StaffCalendarPage() {
  return (
    <DashboardCalendarPage
      title="Staff Calendar"
      description="Manage duty shifts, assigned tasks, and important dates"
      userRole="staff"
    />
  )
}
