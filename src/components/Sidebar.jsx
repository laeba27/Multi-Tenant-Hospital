'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Settings,
  Calendar,
  Clock,
  Bell,
  UserCircle,
  BarChart3,
  Building2,
  Users2,
  User,
  CreditCard,
  ClipboardPlus,
  NotebookPen,
  X,
} from 'lucide-react'
import { useUserDetails } from '@/hooks/use-user-details'

const roleBasedSidebarItems = {
  super_admin: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/super-admin' },
    { icon: Users, label: 'User Management', href: '/dashboard/super-admin/users' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
    { icon: Settings, label: 'Settings', href: '/dashboard/super-admin/settings' },
  ],
  doctor: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/doctor' },
    { icon: Calendar, label: 'Appointments', href: '/dashboard/doctor/appointments' },
    { icon: Clock, label: 'Calendar', href: '/dashboard/doctor/calendar' },
    { icon: Bell, label: 'Notifications', href: '/dashboard/doctor/notifications' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
    { icon: BarChart3, label: 'Data Analytics', href: '/dashboard/doctor/analytics' },
  ],
  hospital_admin: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/hospital' },
    { icon: Building2, label: 'Departments', href: '/dashboard/hospital/departments' },
    { icon: Users2, label: 'Staff Management', href: '/dashboard/hospital/staff' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
    { icon: Calendar, label: 'Calendar', href: '/dashboard/hospital/calendar' },
    { icon: CreditCard, label: 'Billing & Finance', href: '/dashboard/hospital/finance' },
    { icon: ClipboardPlus, label: 'Treatments', href: '/dashboard/hospital/treatments' },
    { icon: BarChart3, label: 'Data Analytics', href: '/dashboard/hospital/analytics' },
    { icon: NotebookPen, label: 'Inventory', href: '/dashboard/hospital/inventory' },
  ],
  reception: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/reception' },
    { icon: Users2, label: 'Patient Management', href: '/dashboard/reception/patient-management' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
    { icon: CreditCard, label: 'Billing & Payment', href: '/dashboard/reception/billing' },
    { icon: BarChart3, label: 'Data Analytics', href: '/dashboard/reception/analytics' },
  ],
  staff: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/staff' },
    { icon: Calendar, label: 'Schedule', href: '/dashboard/staff/schedule' },
    { icon: Users2, label: 'Patients', href: '/dashboard/staff/patients' },
    { icon: Clock, label: 'Tasks', href: '/dashboard/staff/tasks' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
  ],
  patient: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/patient' },
    { icon: Calendar, label: 'Appointments', href: '/dashboard/patient/appointments' },
    { icon: ClipboardPlus, label: 'Medical Records', href: '/dashboard/patient/records' },
    { icon: ClipboardPlus, label: 'Prescriptions', href: '/dashboard/patient/prescriptions' },
    { icon: BarChart3, label: 'Lab Reports', href: '/dashboard/patient/lab-reports' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
  ],
}

export function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname()
  const { profile, isLoading } = useUserDetails()

  const sidebarItems = roleBasedSidebarItems[profile?.role] || []

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-300 ease-in-out z-40 lg:relative lg:top-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <X size={20} />
        </button>

        {/* Sidebar Content */}
        <div className="p-4 pt-12 lg:pt-4">
          {/* User Info Card */}
          {!isLoading && profile && (
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold mb-3">
                {profile.name?.charAt(0).toUpperCase()}
              </div>
              <p className="font-semibold text-gray-900 text-sm">{profile.name}</p>
              <p className="text-xs text-gray-600 capitalize">{profile.role?.replace('_', ' ')}</p>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const IconComponent = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
