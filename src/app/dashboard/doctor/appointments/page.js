import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDoctorAppointments } from '@/actions/appointments'
import { DoctorAppointmentsBoard } from './DoctorAppointmentsBoard'

export const metadata = {
  title: 'Doctor Appointments',
  description: 'Track and manage patient appointments in real time.',
}

async function getDoctorProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, registration_no, hospital_id, role, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') {
    redirect('/dashboard')
  }

  const { data: doctorRecord } = await supabase
    .from('staff')
    .select('id, hospital_id, specialization, consultation_fee')
    .eq('employee_registration_no', profile.registration_no)
    .eq('role', 'doctor')
    .single()

  if (!doctorRecord) {
    return { profile, doctorRecord: null, appointments: [] }
  }

  const appointments = await getDoctorAppointments(doctorRecord.id)

  return { profile, doctorRecord, appointments }
}

export default async function DoctorAppointmentsPage() {
  const { profile, doctorRecord, appointments } = await getDoctorProfile()

  if (!doctorRecord) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600 mt-2">
            Your staff profile is not linked to a doctor record yet. Please contact the hospital administrator.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
        <p className="text-gray-600">
          Review today&apos;s consultations, upcoming visits, and prescriptions in one view.
        </p>
      </div>

      <DoctorAppointmentsBoard
        doctor={{
          id: doctorRecord.id,
          name: profile.name,
          specialization: doctorRecord.specialization,
          hospital_id: doctorRecord.hospital_id,
        }}
        appointments={appointments}
      />
    </div>
  )
}
