export const metadata = {
  title: 'Doctor Dashboard - Hospital Management Portal',
  description: 'Doctor dashboard',
}

export default function DoctorPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to your doctor portal</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
          <p className="text-sm text-gray-600">Today's Patients</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">0</p>
          <p className="text-xs text-gray-500 mt-1">Scheduled appointments</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <p className="text-sm text-gray-600">Pending Consultations</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">0</p>
          <p className="text-xs text-gray-500 mt-1">Waiting for action</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <p className="text-sm text-gray-600">Total Patients</p>
          <p className="text-3xl font-bold text-green-600 mt-2">0</p>
          <p className="text-xs text-gray-500 mt-1">Under your care</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
          <p className="text-sm text-gray-600">Prescriptions</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">0</p>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">
              + Create Prescription
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">
              + Add Medical Note
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">
              + Request Lab Test
            </button>
          </div>
        </div>

        {/* Recent Patients */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Patients</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>No recent consultations</p>
          </div>
        </div>
      </div>
    </div>
  )
}
