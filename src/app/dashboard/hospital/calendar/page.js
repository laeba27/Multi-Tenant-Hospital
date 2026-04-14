'use client'

import DashboardCalendarPage from '@/components/Calendar/DashboardCalendarPage'

export default function HospitalCalendarPage() {
  return (
    <DashboardCalendarPage
      title="Hospital Calendar"
      description="Manage hospital schedules, meetings, and events"
      userRole="hospital_admin"
    />
  )
}
