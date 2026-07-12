'use client'

import { useCallback, useEffect, useState } from 'react'
import { useUser } from './use-user'
import { SUPER_ROLES, defaultsForRole } from '@/lib/rbac/permissions'

/**
 * The signed-in user's permissions, for showing and hiding UI.
 *
 * This is a CONVENIENCE, not a security boundary. Every permission is also
 * enforced server-side by requirePermission() inside the action itself -- so a
 * user who bypasses the UI still cannot book, confirm, or bill. Hiding a button
 * only makes the app tidy; it never makes it safe.
 */
export function useRbac() {
  const { user } = useUser()
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const role = user?.profile?.role
    if (!role) {
      setLoading(false)
      return
    }

    // Admins hold everything; no round trip needed.
    if (SUPER_ROLES.includes(role)) {
      setPermissions(defaultsForRole(role))
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // The route resolves identity from the session -- it deliberately ignores
      // anything we could send it.
      const res = await fetch('/api/rbac/check', { method: 'POST' })
      const data = await res.json()
      setPermissions(res.ok ? data.permissions || {} : defaultsForRole(role))
    } catch (error) {
      console.error('Error checking RBAC permissions:', error)
      // Fall back to the role's defaults rather than to nothing: a network blip
      // should not make the app look as though the user has been stripped of
      // access. The server still decides for real.
      setPermissions(defaultsForRole(role))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const can = useCallback(
    (permission) => {
      const role = user?.profile?.role
      if (SUPER_ROLES.includes(role)) return true
      return permissions[permission] === true
    },
    [user, permissions]
  )

  return { can, permissions, loading, refresh: load }
}
