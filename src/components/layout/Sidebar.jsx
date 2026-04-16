'use client'

import React, { useState, useEffect } from 'react'
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
  UserStar,
  CreditCard,
  ClipboardPlus,
  NotebookPen,
  UserRoundCog,
  X,
  ChevronLeft,
} from 'lucide-react'
import { useUserDetails } from '@/hooks/use-user-details'

const roleBasedSidebarItems = {
  super_admin: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/super-admin' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
  ],
  doctor: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/doctor' },
    { icon: Calendar, label: 'Appointments', href: '/dashboard/doctor/appointments' },
    { icon: ClipboardPlus, label: 'Prescriptions', href: '/dashboard/doctor/prescriptions' },
    { icon: Clock, label: 'Calendar', href: '/dashboard/doctor/calendar' },
    { icon: Bell, label: 'Notifications', href: '/dashboard/doctor/notifications' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
    { icon: BarChart3, label: 'Data Analytics', href: '/dashboard/doctor/analytics' },
  ],
  hospital_admin: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/hospital' },
    { icon: Building2, label: 'Departments', href: '/dashboard/hospital/departments' },
    { icon: UserStar, label: 'Staff Management', href: '/dashboard/hospital/staff' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
     { icon: Users2, label: 'Patient Management', href: '/dashboard/hospital/patient-management' },
    { icon: Calendar, label: 'Calendar', href: '/dashboard/hospital/calendar' },
    { icon: UserRoundCog, label: 'Roles', href: '/dashboard/hospital/rbac' }, 
    { icon: CreditCard, label: 'Billing & Finance', href: '/dashboard/hospital/finance' },
    { icon: ClipboardPlus, label: 'Treatments', href: '/dashboard/hospital/treatments' },
    { icon: BarChart3, label: 'Data Analytics', href: '/dashboard/hospital/analytics' },
    { icon: NotebookPen, label: 'Inventory', href: '/dashboard/hospital/inventory' },
  ],
  receptionist: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/reception' },
    { icon: Calendar, label: 'Calendar', href: '/dashboard/reception/calendar' },
    { icon: Users2, label: 'Patient Management', href: '/dashboard/reception/patient-management' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
    { icon: CreditCard, label: 'Billing & Payment', href: '/dashboard/reception/billing' },
    { icon: BarChart3, label: 'Data Analytics', href: '/dashboard/reception/analytics' },
  ],
  staff: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/staff' },
    { icon: Calendar, label: 'Calendar', href: '/dashboard/staff/calendar' },
    { icon: Users2, label: 'Patients', href: '/dashboard/staff/patients' },
    { icon: Clock, label: 'Tasks', href: '/dashboard/staff/tasks' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
  ],
  patient: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/patient' },
    { icon: Calendar, label: 'Calendar', href: '/dashboard/patient/calendar' },
    { icon: Calendar, label: 'Appointments', href: '/dashboard/patient/appointments' },
    { icon: ClipboardPlus, label: 'Medical Records', href: '/dashboard/patient/records' },
    { icon: ClipboardPlus, label: 'Prescriptions', href: '/dashboard/patient/prescriptions' },
    { icon: BarChart3, label: 'Lab Reports', href: '/dashboard/patient/lab-reports' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
  ],
}

export function Sidebar({ isOpen = false, onClose = () => {} }) {
  const pathname = usePathname()
  const { profile, isLoading } = useUserDetails()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Ensure hydration consistency
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const sidebarItems = roleBasedSidebarItems[profile?.role] || []

  // Helper function to determine if a route is active
  // Returns the length of the matching href for specificity, or -1 if no match
  const getActiveMatch = (itemHref) => {
    // Exact match
    if (pathname === itemHref) return itemHref.length
    // Prefix match (only for nested routes)
    if (pathname.startsWith(itemHref + '/') && itemHref !== '/dashboard/profiles') {
      return itemHref.length
    }
    return -1
  }

  // Find the most specific (longest) matching href
  const activeMatch = sidebarItems.reduce((max, item) => {
    const match = getActiveMatch(item.href)
    return match > max ? match : max
  }, -1)

  return (
    <>
      {/* Mobile Overlay - Only render after hydration */}
      {mounted && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 bottom-0 bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 ease-in-out z-40 lg:relative lg:top-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${mounted && isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Close button for mobile - Only render after hydration */}
        {mounted && (
          <button
            onClick={onClose}
            className="absolute top-4 right-10 lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg z-50"
          >
            <X size={20} />
          </button>
        )}

        {/* Toggle Button - Absolute positioned at edge */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-5 top-8 items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-lg z-50"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            size={20}
            className={`transition-transform duration-300 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Sidebar Content */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} pt-4`}>
          {/* User Info Card */}
          {!isLoading && profile && !isCollapsed && (
            <div className="mb-6 p-4 bg-indigo-50 flex  gap-2 rounded-lg">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold mb-3">
                {profile.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{profile.name}</p>
                <p className="text-xs text-gray-600 capitalize">{profile.role?.replace('_', ' ')}</p>
              </div>
            </div>
          )}

          {/* Collapsed User Avatar */}
          {!isLoading && profile && isCollapsed && (
            <div className="mb-4 flex justify-center">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                {profile.name?.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const IconComponent = item.icon
              // An item is active only if its href matches the longest match found
              const isActive = activeMatch === item.href.length && getActiveMatch(item.href) !== -1

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <IconComponent size={20} />
                  {!isCollapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
