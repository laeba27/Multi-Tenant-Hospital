import DashboardLayout from '@/components/layout/DashboardLayout'
import QuickUpdates from '@/components/patients/QuickUpdates'

export const metadata = {
  title: 'Quick Updates - Smile Returns',
  description: 'Health alerts and announcements from your hospitals.',
}

export default function QuickUpdatesPage() {
  return (
    <DashboardLayout roleLabel="Patient">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quick Updates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Health alerts, advisories, and announcements from the platform and your hospitals.
          </p>
        </div>
        <QuickUpdates limit={50} />
      </div>
    </DashboardLayout>
  )
}
