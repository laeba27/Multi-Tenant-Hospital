'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { getStaffByUserId } from '@/actions/staff-details'
import { getReceptionDashboardStats } from '@/actions/dashboard-stats'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

export default function ReceptionDashboardPage() {
  const { user, loading: userLoading } = useUser()
  const [staffDetails, setStaffDetails] = useState(null)
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    pendingPayments: 0,
    monthlyRevenue: 0
  })

  // Fetch staff details when user loads
  useEffect(() => {
    if (user?.id && user?.profile?.role === 'receptionist') {
      fetchStaffDetails()
    }
  }, [user])

  // Fetch stats when staff details are loaded
  useEffect(() => {
    if (staffDetails?.hospitals?.registration_no) {
      fetchStats()
    }
  }, [staffDetails])

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

  const fetchStats = async () => {
    if (!staffDetails?.hospitals?.registration_no) return

    try {
      const result = await getReceptionDashboardStats(staffDetails.hospitals.registration_no)
      if (result.error) {
        console.error('Error fetching stats:', result.error)
        // Keep default values on error
        setStats({
          todayAppointments: 0,
          totalPatients: 0,
          pendingPayments: 0,
          monthlyRevenue: 0
        })
      } else {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
      // Keep default values on error
      setStats({
        todayAppointments: 0,
        totalPatients: 0,
        pendingPayments: 0,
        monthlyRevenue: 0
      })
    }
  }

  if (userLoading || loadingStaff) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </DashboardLayout>
    )
  }

  const menuItems = [
    {
      id: 'patient-management',
      label: 'Patient Management',
      description: 'Register patients, book appointments, manage records',
      icon: Users,
      href: '/dashboard/reception/patient-management',
      color: 'blue'
    },
    {
      id: 'billing',
      label: 'Billing & Payments',
      description: 'Manage invoices, payments, and transactions',
      icon: CreditCard,
      href: '/dashboard/reception/billing',
      color: 'green'
    },
    {
      id: 'analytics',
      label: 'Data Analytics',
      description: 'View insights and reports',
      icon: BarChart3,
      href: '/dashboard/reception/analytics',
      color: 'purple'
    }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {staffDetails?.name || user.profile?.name || 'Receptionist'}!
          </h2>
          <p className="text-gray-600 mt-1">
            {staffDetails?.hospitals
              ? `Working at ${staffDetails.hospitals.name}`
              : 'Here\'s what\'s happening today at your hospital.'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Today's Appointments"
            value={stats.todayAppointments}
            icon={Calendar}
            color="blue"
            trend="+2 from yesterday"
          />
          <StatCard
            title="Total Patients"
            value={stats.totalPatients}
            icon={Users}
            color="green"
            trend="+12 this week"
          />
          <StatCard
            title="Pending Payments"
            value={stats.pendingPayments}
            icon={CreditCard}
            color="amber"
            trend="Requires attention"
          />
          <StatCard
            title="Monthly Revenue"
            value={`₹${stats.monthlyRevenue.toLocaleString()}`}
            icon={BarChart3}
            color="purple"
            trend="+8% vs last month"
          />
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {menuItems.map((item) => {
              const Icon = item.icon
              const colorClasses = {
                blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
                green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
                purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
              }

              return (
                <Link key={item.id} href={item.href}>
                  <Card className={`cursor-pointer transition-all hover:shadow-lg ${colorClasses[item.color]}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Icon className="h-8 w-8" />
                        <ArrowRight className="h-5 w-5 opacity-50" />
                      </div>
                      <CardTitle className="text-xl">{item.label}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color, trend }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-xs text-gray-500">{trend}</span>
        </div>
        <div className="mt-4">
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
          <p className="text-sm text-gray-600 mt-1">{title}</p>
        </div>
      </CardHeader>
    </Card>
  )
}
