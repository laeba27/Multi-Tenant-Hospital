'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUser() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        setError(error)
        setLoading(false)
        return
      }

      if (user) {
        // Fetch user profile with hospital_id and role from profiles table
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        setUser({
          ...user,
          profile: userProfile,
        })
      }

      setLoading(false)
    }

    getUser()
  }, [])

  return { user, loading, error }
}
