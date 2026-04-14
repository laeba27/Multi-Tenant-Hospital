'use client'

import { Calendar as CalendarIcon } from 'lucide-react'
import { SharedCalendar } from '@/components/Calendar/SharedCalendar'

export default function DashboardCalendarPage({
  title = 'Calendar',
  description = 'Manage your schedule and events',
  userRole = 'patient',
  readOnly = false,
}) {
  const handleEventAdd = (event) => {
    console.log(`[${userRole}] event added`, event)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-indigo-600" />
            {title}
          </h1>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
      </div>

      <SharedCalendar
        initialEvents={[]}
        userRole={userRole}
        onEventAdd={handleEventAdd}
        readOnly={readOnly}
      />
    </div>
  )
}
