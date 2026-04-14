'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Custom hook to fetch patient details
 * Works with two scenarios:
 * 1. From registration flow - gets profile_id and fetches patient data
 * 2. From patient list - gets patients.id and fetches with joins
 * 
 * @param {uuid} patientId - Can be either patients.id or profile_id (depends on context)
 * @param {string} hospitalId - The hospital registration_no
 * @returns {Object} { patient, loading, error }
 */
export function usePatientDetails(patientId, hospitalId) {
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!patientId || !hospitalId) {
      setPatient(null)
      return
    }

    const fetchPatient = async () => {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()

        // Try two approaches:
        // Approach 1: patientId is from patients table (most common case)
        const { data: patientRecord, error: patientError } = await supabase
          .from('patients')
          .select(`
            id,
            profile_id,
            hospital_id,
            height,
            weight,
            marital_status,
            emergency_contact_name,
            emergency_contact_mobile,
            insurance_provider,
            insurance_number,
            allergies,
            chronic_conditions,
            medical_notes,
            profiles!profile_id(
              id,
              name,
              registration_no,
              mobile,
              gender,
              date_of_birth
            )
          `)
          .eq('id', patientId)
          .eq('hospital_id', hospitalId)
          .single()

        if (!patientError && patientRecord) {
          // Successfully fetched from patients table
          const profile = patientRecord.profiles
          const combinedPatient = {
            id: patientRecord.id,
            profile_id: patientRecord.profile_id,
            name: profile?.name || 'Unknown',
            registration_no: profile?.registration_no || 'N/A',
            mobile: profile?.mobile || 'N/A',
            gender: profile?.gender || 'N/A',
            date_of_birth: profile?.date_of_birth,
            height: patientRecord.height,
            weight: patientRecord.weight,
            marital_status: patientRecord.marital_status,
            emergency_contact_name: patientRecord.emergency_contact_name,
            emergency_contact_mobile: patientRecord.emergency_contact_mobile,
            insurance_provider: patientRecord.insurance_provider,
            insurance_number: patientRecord.insurance_number,
            allergies: patientRecord.allergies,
            chronic_conditions: patientRecord.chronic_conditions,
            medical_notes: patientRecord.medical_notes
          }
          setPatient(combinedPatient)
          return
        }

        // Approach 2: patientId is profile_id (from registration flow)
        // This is a fallback - just get profile info
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, registration_no, mobile, gender, date_of_birth')
          .eq('id', patientId)
          .single()

        if (profileError) {
          throw new Error('Patient not found')
        }

        setPatient({
          id: patientId,
          profile_id: patientId,
          name: profile.name || 'Unknown',
          registration_no: profile.registration_no || 'N/A',
          mobile: profile.mobile || 'N/A',
          gender: profile.gender || 'N/A',
          date_of_birth: profile.date_of_birth
        })
      } catch (err) {
        console.error('Error fetching patient details:', err)
        setError(err.message)
        setPatient(null)
      } finally {
        setLoading(false)
      }
    }

    fetchPatient()
  }, [patientId, hospitalId])

  return { patient, loading, error }
}
