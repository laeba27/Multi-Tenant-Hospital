'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export function useUserDetails() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [hospital, setHospital] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/auth/user', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()

        if (!response.ok) {
          const errorMessage = data.error || `HTTP ${response.status}: Failed to fetch user details`
          console.error('API Error:', errorMessage, data)
          throw new Error(errorMessage)
        }

        setUser(data.user)
        setProfile(data.user.profile)
        
        // Extract hospital details from profile
        if (data.user.profile && data.user.profile.hospitals) {
          setHospital(data.user.profile.hospitals)
        }
      } catch (err) {
        const errorMessage = err.message || 'An error occurred while fetching user details'
        console.error('Error fetching user details:', err)
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserDetails()
  }, [])

  return {
    user,
    profile,
    hospital,
    isLoading,
    error,
  }
}
