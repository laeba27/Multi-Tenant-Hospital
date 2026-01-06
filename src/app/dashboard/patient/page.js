import DashboardLayout from '@/components/layout/DashboardLayout'

export const metadata = {
  title: 'Patient Dashboard - Hospital Management Portal',
  description: 'Patient dashboard',
}

export default function PatientPage() {
  return (
    <DashboardLayout roleLabel="Patient">
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Patient Dashboard</h2>
        <p className="text-gray-600">Welcome to your health portal</p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-indigo-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Appointments</p>
            <p className="text-2xl font-bold text-indigo-600">Book Appointment</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Medical Records</p>
            <p className="text-2xl font-bold text-blue-600">View Records</p>
          </div>
          <div className="bg-green-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Prescriptions</p>
            <p className="text-2xl font-bold text-green-600">View Prescriptions</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-6">
            <p className="text-sm text-gray-600">Lab Reports</p>
            <p className="text-2xl font-bold text-purple-600">View Reports</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
