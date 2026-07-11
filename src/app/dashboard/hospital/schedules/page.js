'use client'

import { useUser } from '@/hooks/use-user'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock } from 'lucide-react'
import SchedulesManager from './SchedulesManager'

export default function HospitalSchedulesPage() {
  const { user, loading } = useUser()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  const role = user?.profile?.role
  if (role !== 'hospital_admin' && role !== 'super_admin') {
    return (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Only a hospital administrator can manage staff schedules.
        </AlertDescription>
      </Alert>
    )
  }

  return <SchedulesManager hospitalId={user.profile.hospital_id} />
}
