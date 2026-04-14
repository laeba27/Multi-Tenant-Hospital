'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from './use-user'
import { createClient } from '@/lib/supabase/client'

/**
 * Enhanced authentication guard hook
 * Redirects to login if:
 * 1. User session is invalid/expired
 * 2. User is not authenticated
 * 3. Session is lost during page usage
 */
export function useAuthGuard(requiredRole = null) {
  const router = useRouter()
  const { user, loading: userLoading, error } = useUser()
  const hasRedirected = useRef(false)
  const sessionCheckInterval = useRef(null)

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) return

    // If still loading, wait
    if (userLoading) return

    // Check for authentication
    if (!user || error) {
      hasRedirected.current = true
      // Use setTimeout to ensure router is ready
      setTimeout(() => {
        router.push('/auth/sign-in?redirect=' + encodeURIComponent(window.location.pathname))
      }, 0)
      return
    }

    // Check for required role
    if (requiredRole && user.profile?.role !== requiredRole) {
      hasRedirected.current = true
      const roleToPath = {
        hospital_admin: 'hospital',
        doctor: 'doctor',
        staff: 'staff',
        receptionist: 'reception',
        patient: 'patient',
        super_admin: 'super-admin',
      }
      const userPath = roleToPath[user.profile?.role] || 'dashboard'
      // Use setTimeout to ensure router is ready
      setTimeout(() => {
        router.push(`/dashboard/${userPath}`)
      }, 0)
      return
    }

    // Set up periodic session validation
    if (!sessionCheckInterval.current) {
      sessionCheckInterval.current = setInterval(async () => {
        const supabase = createClient()
        const {
          data: { user: currentUser },
          error: sessionError,
        } = await supabase.auth.getUser()

        if (!currentUser || sessionError) {
          console.warn('Session expired, redirecting to login...')
          hasRedirected.current = true
          clearInterval(sessionCheckInterval.current)
          sessionCheckInterval.current = null
          // Use setTimeout to ensure router is ready
          setTimeout(() => {
            router.push('/auth/sign-in?session=expired')
          }, 0)
        }
      }, 60000) // Check every minute
    }

    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current)
        sessionCheckInterval.current = null
      }
    }
  }, [user, userLoading, error, requiredRole])

  return { user, loading: userLoading, isAuthenticated: !!user && !error }
}
