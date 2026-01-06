'use client'

import { useCallback } from 'react'
import { useUser } from './use-user'

export function usePermissions() {
  const { user } = useUser()

  const can = useCallback(
    (action, resource) => {
      if (!user?.profile?.role) return false

      const role = user.profile.role
      const permissions = {
        super_admin: {
          hospitals: ['read', 'create', 'update', 'delete'],
          users: ['read', 'create', 'update', 'delete'],
          analytics: ['read'],
        },
        hospital_admin: {
          departments: ['read', 'create', 'update', 'delete'],
          staff: ['read', 'create', 'update', 'delete'],
          inventory: ['read', 'create', 'update', 'delete'],
          finance: ['read'],
          analytics: ['read'],
        },
        doctor: {
          appointments: ['read', 'update'],
          patients: ['read', 'create', 'update'],
          prescriptions: ['read', 'create', 'update'],
          medicalRecords: ['read', 'create', 'update'],
        },
        reception: {
          appointments: ['read', 'create', 'update'],
          patients: ['read', 'create', 'update'],
          billing: ['read', 'create', 'update'],
          payments: ['read', 'create', 'update'],
        },
        patient: {
          appointments: ['read'],
          medicalRecords: ['read'],
          prescriptions: ['read'],
        },
      }

      const resourcePerms = permissions[role]?.[resource] || []
      return resourcePerms.includes(action)
    },
    [user?.profile?.role]
  )

  return { can, role: user?.profile?.role }
}
