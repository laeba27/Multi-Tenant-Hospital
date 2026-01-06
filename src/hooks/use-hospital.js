'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'

export function useHospital() {
  const { user } = useUser()
  const [hospital, setHospital] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.profile?.hospital_id) {
      setLoading(false)
      return
    }

    const getHospital = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', user.profile.hospital_id)
        .single()

      if (error) {
        setError(error)
      } else {
        setHospital(data)
      }

      setLoading(false)
    }

    getHospital()
  }, [user?.profile?.hospital_id])

  return { hospital, loading, error }
}
