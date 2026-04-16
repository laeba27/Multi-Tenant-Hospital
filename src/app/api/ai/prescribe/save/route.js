import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { appointmentId, transcript, structured } = await request.json()

    if (!appointmentId || !structured) {
      return NextResponse.json(
        { error: 'Missing appointmentId or structured data' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, registration_no')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: doctorRecord } = await supabase
      .from('staff')
      .select('id, hospital_id')
      .eq('employee_registration_no', profile.registration_no)
      .eq('role', 'doctor')
      .single()

    if (!doctorRecord) {
      return NextResponse.json({ error: 'Doctor record not found' }, { status: 404 })
    }

    const { data: appointment } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('id', appointmentId)
      .eq('doctor_id', doctorRecord.id)
      .single()

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const { data: prescription, error: prescError } = await supabase
      .from('prescriptions')
      .insert([
        {
          hospital_id: doctorRecord.hospital_id,
          doctor_id: doctorRecord.id,
          created_by: user.id,
          patient_id: appointment.patient_id,
          appointment_id: appointmentId,
          status: 'draft',
          clinical_summary: transcript,
          template_snapshot: structured,
          metadata: {
            created_from_ai: true,
            created_at: new Date().toISOString(),
          },
        },
      ])
      .select()
      .single()

    if (prescError) {
      throw prescError
    }

    const valuesToInsert = Object.entries(structured)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value], index) => ({
        prescription_id: prescription.id,
        field_id: key,
        section_key: key,
        field_key: key,
        label: key.replace(/_/g, ' '),
        value: typeof value === 'string' ? value : JSON.stringify(value),
        rendered_value: typeof value === 'string' ? value : JSON.stringify(value),
        sort_order: index,
      }))

    if (valuesToInsert.length > 0) {
      const { error: valuesError } = await supabase
        .from('prescription_values')
        .insert(valuesToInsert)

      if (valuesError) {
        throw valuesError
      }
    }

    await supabase
      .from('prescription_audit_logs')
      .insert([
        {
          prescription_id: prescription.id,
          actor_id: user.id,
          event_type: 'created_from_ai',
          payload: {
            appointment_id: appointmentId,
            transcript_length: transcript.length,
          },
        },
      ])

    return NextResponse.json({
      success: true,
      prescriptionId: prescription.id,
      message: 'Draft prescription created successfully',
    })
  } catch (error) {
    console.error('Error saving AI prescription:', error)
    return NextResponse.json(
      { error: 'Failed to save prescription', details: error.message },
      { status: 500 }
    )
  }
}
