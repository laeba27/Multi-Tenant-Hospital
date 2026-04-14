import DashboardLayout from '@/components/layout/DashboardLayout'

export const metadata = {
  title: 'Hospital Admin Dashboard',
  description: 'Hospital administrator dashboard',
}

export default function HospitalAdminPage() {
  return (
    <DashboardLayout roleLabel="Hospital Administrator">
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Hospital Administrator Dashboard</h2>
        <p className="text-gray-600">Welcome to your hospital management dashboard</p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-indigo-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Hospital Name</p>
            <p className="text-2xl font-bold text-indigo-600">View Hospital</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Staff Members</p>
            <p className="text-2xl font-bold text-blue-600">Manage Staff</p>
          </div>
          <div className="bg-green-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Departments</p>
            <p className="text-2xl font-bold text-green-600">View Departments</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Analytics</p>
            <p className="text-2xl font-bold text-purple-600">View Reports</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
