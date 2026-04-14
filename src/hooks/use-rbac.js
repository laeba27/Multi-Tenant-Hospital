'use client'

import { useEffect, useState } from 'react'
import { useUser } from './use-user'

export function useRbac() {
  const { user } = useUser()
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.profile?.hospital_id) {
      const role = user.profile.role

      // Hospital admins and super admins have all permissions - no API call needed
      if (role === 'hospital_admin' || role === 'super_admin') {
        setPermissions({
          book_appointment: true,
        })
        setLoading(false)
        return
      }

      // Only check permissions for non-admin roles
      checkPermissions()
    } else {
      setLoading(false)
    }
  }, [user])

  const checkPermissions = async () => {
    setLoading(true)
    try {
      const hospitalId = user.profile.hospital_id
      const staffId = user.profile.id
      const role = user.profile.role

      // Check permissions via API
      const response = await fetch('/api/rbac/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hospital_id: hospitalId,
          staff_id: staffId,
          role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('RBAC check failed:', data.error)
        // Default to no permissions
        setPermissions({})
      } else {
        setPermissions(data.permissions || {})
      }
    } catch (error) {
      console.error('Error checking RBAC permissions:', error)
      setPermissions({})
    } finally {
      setLoading(false)
    }
  }

  const can = (permission) => {
    // Hospital admins always have permission
    if (user?.profile?.role === 'hospital_admin' || user?.profile?.role === 'super_admin') {
      return true
    }
    // Check specific permission
    return permissions[permission] === true
  }

  return { can, permissions, loading }
}
