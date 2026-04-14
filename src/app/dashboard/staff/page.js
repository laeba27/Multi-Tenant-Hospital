import DashboardLayout from '@/components/layout/DashboardLayout'

export const metadata = {
  title: 'Staff Dashboard - Hospital Management Portal',
  description: 'Hospital staff dashboard',
}

export default function StaffPage() {
  return (
    <DashboardLayout roleLabel="Hospital Staff">
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Staff Dashboard</h2>
        <p className="text-gray-600">Welcome to your staff portal</p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-indigo-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">My Schedule</p>
            <p className="text-2xl font-bold text-indigo-600">View Schedule</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Patients</p>
            <p className="text-2xl font-bold text-blue-600">Patient List</p>
          </div>
          <div className="bg-green-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Tasks</p>
            <p className="text-2xl font-bold text-green-600">My Tasks</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Leave Request</p>
            <p className="text-2xl font-bold text-purple-600">Apply Leave</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
