import DashboardLayout from '@/components/layout/DashboardLayout'

export const metadata = {
  title: 'Reception Dashboard - Hospital Management Portal',
  description: 'Reception staff dashboard',
}

export default function ReceptionPage() {
  return (
    <DashboardLayout roleLabel="Reception Staff">
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Reception Dashboard</h2>
        <p className="text-gray-600">Welcome to reception portal</p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-indigo-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Appointments</p>
            <p className="text-2xl font-bold text-indigo-600">Schedule Appointment</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Visitors</p>
            <p className="text-2xl font-bold text-blue-600">Register Visitor</p>
          </div>
          <div className="bg-green-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Check-in/Check-out</p>
            <p className="text-2xl font-bold text-green-600">Process Check-in</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Feedback</p>
            <p className="text-2xl font-bold text-purple-600">View Feedback</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
