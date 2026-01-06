export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="w-full max-w-lg px-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Smile Returns
            </h1>
            <p className="text-gray-600 mt-2">
              Hospital Management System
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
