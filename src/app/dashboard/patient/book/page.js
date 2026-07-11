import DashboardLayout from '@/components/layout/DashboardLayout'
import BookAppointmentView from './BookAppointmentView'

export const metadata = {
  title: 'Book Appointment - Smile Returns',
  description: 'Choose a hospital and book your appointment.',
}

export default function BookAppointmentPage() {
  return (
    <DashboardLayout roleLabel="Patient">
      <BookAppointmentView />
    </DashboardLayout>
  )
}
