import DashboardLayout from '@/components/layout/DashboardLayout'

export const metadata = {
  title: 'Super Admin Dashboard - Hospital Management Portal',
  description: 'Super admin dashboard',
}

export default function SuperAdminPage() {
  return (
    <DashboardLayout roleLabel="Super Administrator">
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h2>
        <p className="text-gray-600">System-wide administration and management</p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-indigo-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Hospitals</p>
            <p className="text-2xl font-bold text-indigo-600">Manage Hospitals</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Users</p>
            <p className="text-2xl font-bold text-blue-600">Manage Users</p>
          </div>
          <div className="bg-green-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">System Stats</p>
            <p className="text-2xl font-bold text-green-600">View Analytics</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">System Settings</p>
            <p className="text-2xl font-bold text-purple-600">Configure System</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
