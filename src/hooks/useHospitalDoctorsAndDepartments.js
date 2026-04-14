'use client'

import { useEffect, useState } from 'react'

/**
 * Custom hook to fetch departments and doctors for the current hospital
 * Makes a single API request to /api/hospital/departments-doctors
 * 
 * @param {string} hospitalId - The hospital registration_no to fetch data for
 * @returns {Object} { departments, doctors, loading, error }
 */
export function useHospitalDoctorsAndDepartments(hospitalId) {
  const [departments, setDepartments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!hospitalId) {
      console.warn('[useHospitalDoctorsAndDepartments] No hospitalId provided')
      setDepartments([])
      setDoctors([])
      setError(null)
      return
    }

    console.log('[useHospitalDoctorsAndDepartments] Fetching data for hospital:', hospitalId)

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const url = `/api/hospital/departments-doctors?hospital_id=${encodeURIComponent(hospitalId)}`
        console.log('[useHospitalDoctorsAndDepartments] Calling API:', url)
        
        const response = await fetch(url)
        const data = await response.json()

        console.log('[useHospitalDoctorsAndDepartments] API Response:', { 
          status: response.status, 
          ok: response.ok, 
          data 
        })

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch departments and doctors')
        }

        console.log('[useHospitalDoctorsAndDepartments] Setting state:', {
          departments: data.departments?.length,
          doctors: data.doctors?.length
        })

        setDepartments(data.departments || [])
        setDoctors(data.doctors || [])
      } catch (err) {
        console.error('[useHospitalDoctorsAndDepartments] Error:', err)
        setError(err.message)
        setDepartments([])
        setDoctors([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [hospitalId])

  return { departments, doctors, loading, error }
}
