import DashboardLayout from '@/components/layout/DashboardLayout'
import PatientDashboard from './PatientDashboard'

export const metadata = {
  title: 'Patient Dashboard - Hospital Management Portal',
  description: 'Patient dashboard',
}

export default function PatientPage() {
  return (
    <DashboardLayout roleLabel="Patient" showHeader>
      <PatientDashboard />
    </DashboardLayout>
  )
}
