'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { getStaffByUserId } from '@/actions/staff-details'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, TrendingUp, Activity } from 'lucide-react'

export default function ReceptionAnalyticsPage() {
  const { user, loading: userLoading } = useUser()
  const [staffDetails, setStaffDetails] = useState(null)
  const [loadingStaff, setLoadingStaff] = useState(true)

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

  if (userLoading || loadingStaff) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Analytics</h1>
          <p className="text-gray-600 mt-2">
            View insights and analytics for your hospital
          </p>
        </div>

        {/* Hospital Info */}
        {/* {staffDetails?.hospitals && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Hospital:</span> {staffDetails.hospitals.name}
            </p>
          </div>
        )} */}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">456</div>
              <p className="text-xs text-muted-foreground">+8% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹1.2L</div>
              <p className="text-xs text-muted-foreground">+15% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Doctors</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">+3 new this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Analytics</CardTitle>
            <CardDescription>
              Detailed analytics dashboards and reports coming soon...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  )
}
