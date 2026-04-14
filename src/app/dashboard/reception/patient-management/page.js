'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { getStaffByUserId } from '@/actions/staff-details'
import { useRbac } from '@/hooks/use-rbac'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, Loader2 } from 'lucide-react'
import PatientManagementPage from '@/app/dashboard/hospital/patient-management/page'

export default function ReceptionPatientManagementPage() {
  const { user, loading: userLoading } = useUser()
  const [staffDetails, setStaffDetails] = useState(null)
  const [loadingStaff, setLoadingStaff] = useState(true)
  const { can, loading: loadingRbac } = useRbac()

  // Fetch staff details to get hospital_id
  useEffect(() => {
    if (user?.id && user?.profile?.role === 'receptionist') {
      fetchStaffDetails()
    }
  }, [user])

  const fetchStaffDetails = async () => {
    setLoadingStaff(true)
    try {
      const result = await getStaffByUserId(user.id)
      if (result.error) {
        toast.error('Failed to load staff details')
      } else {
        setStaffDetails(result.data)
      }
    } catch (error) {
      console.error('Error loading staff details:', error)
      toast.error('Error loading staff details')
    } finally {
      setLoadingStaff(false)
    }
  }

  if (userLoading || loadingStaff || loadingRbac) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    )
  }

  // Check RBAC permission
  const hasPermission = can('book_appointment')

  if (!hasPermission) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Alert variant="destructive" className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access patient management. Please contact your hospital administrator.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  // Show the same patient management page as hospital admin
  // Pass hospital_id from staff details to the component
  return (
    <DashboardLayout>
      {/* {staffDetails?.hospitals && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Hospital:</span> {staffDetails.hospitals.name}
            {staffDetails?.departments?.name && (
              <span className="ml-2">• <span className="font-medium">Department:</span> {staffDetails.departments.name}</span>
            )}
          </p>
        </div>
      )} */}
      <PatientManagementPage />
    </DashboardLayout>
  )
}
