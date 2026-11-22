import DashboardLayout from '@/components/layout/DashboardLayout'
import PatientProfileView from './PatientProfileView'

export const metadata = {
  title: 'My Profile - Hospital Management Portal',
  description: 'Your personal, contact and health details',
}

export default function PatientProfilePage() {
  return (
    <DashboardLayout roleLabel="Patient" showHeader>
      <PatientProfileView />
    </DashboardLayout>
  )
}
