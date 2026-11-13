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
  ChevronDown,
  Pill,
  Hospital,
  TriangleAlert,
  UserPlus,
  CalendarPlus,
  Megaphone,
  CalendarClock,
} from 'lucide-react'
import { useUserDetails } from '@/hooks/use-user-details'
import { useRbac } from '@/hooks/use-rbac'
import { LogoWordmark } from '@/components/brand/Logo'

const roleBasedSidebarItems = {
  super_admin: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/super-admin' },
    { icon: Hospital, label: 'Hospitals', href: '/dashboard/super-admin/hospitals' },
    { icon: TriangleAlert, label: 'Issues', href: '/dashboard/super-admin/issues' },
    { icon: UserPlus, label: 'Add Member', href: '/dashboard/super-admin/add-member' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
  ],
  doctor: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/doctor' },
    { icon: Calendar, label: 'Appointments', href: '/dashboard/doctor/appointments' },
    {
      icon: Users,
      label: 'Patients',
      children: [
        { icon: Users, label: 'My Patients', href: '/dashboard/doctor/patients' },
        { icon: CalendarClock, label: 'Follow-ups', href: '/dashboard/doctor/follow-ups' },
      ],
    },
    { icon: Pill, label: 'Prescriptions', href: '/dashboard/doctor/prescriptions', permission: 'view_prescription' },
    { icon: CreditCard, label: 'Billing & Payment', href: '/dashboard/doctor/billing', permission: 'manage_billing' },
    { icon: Clock, label: 'Calendar', href: '/dashboard/doctor/calendar' },
    { icon: Bell, label: 'Notifications', href: '/dashboard/doctor/notifications' },
    { icon: BarChart3, label: 'Data Analytics', href: '/dashboard/doctor/analytics' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
  ],
  hospital_admin: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/hospital' },
    {
      icon: Users2,
      label: 'Patient Management',
      children: [
        { icon: Users2, label: 'Patients', href: '/dashboard/hospital/patient-management' },
        { icon: CalendarClock, label: 'Follow-ups', href: '/dashboard/hospital/follow-ups' },
      ],
    },
    { icon: Calendar, label: 'Calendar', href: '/dashboard/hospital/calendar' },
    {
      icon: UserStar,
      label: 'Staff Management',
      children: [
        { icon: UserStar, label: 'Staff', href: '/dashboard/hospital/staff' },
        { icon: Clock, label: 'Shifts & Slots', href: '/dashboard/hospital/schedules' },
        { icon: UserRoundCog, label: 'Roles & Access', href: '/dashboard/hospital/rbac' },
      ],
    },
    {
      icon: Building2,
      label: 'Hospital Setup',
      children: [
        { icon: Building2, label: 'Departments', href: '/dashboard/hospital/departments' },
        { icon: ClipboardPlus, label: 'Treatments', href: '/dashboard/hospital/treatments' },
        { icon: NotebookPen, label: 'Inventory', href: '/dashboard/hospital/inventory' },
      ],
    },
    { icon: CreditCard, label: 'Billing & Finance', href: '/dashboard/hospital/finance' },
    { icon: BarChart3, label: 'Data Analytics', href: '/dashboard/hospital/analytics' },
    { icon: Megaphone, label: 'Quick Updates', href: '/dashboard/hospital/updates' },
    { icon: TriangleAlert, label: 'Issues', href: '/dashboard/hospital/issues' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
  ],
  receptionist: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/reception' },
    { icon: Calendar, label: 'Calendar', href: '/dashboard/reception/calendar' },
    {
      icon: Users2,
      label: 'Patient Management',
      children: [
        { icon: Users2, label: 'Patients', href: '/dashboard/reception/patient-management', permission: 'book_appointment' },
        { icon: CalendarClock, label: 'Follow-ups', href: '/dashboard/reception/follow-ups' },
      ],
    },
    { icon: CreditCard, label: 'Billing & Payment', href: '/dashboard/reception/billing', permission: 'manage_billing' },
    { icon: Megaphone, label: 'Quick Updates', href: '/dashboard/reception/updates' },
    { icon: BarChart3, label: 'Data Analytics', href: '/dashboard/reception/analytics' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
  ],
  staff: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/staff' },
    { icon: Calendar, label: 'Calendar', href: '/dashboard/staff/calendar' },
    { icon: Users2, label: 'Patients', href: '/dashboard/staff/patients' },
    { icon: Megaphone, label: 'Quick Updates', href: '/dashboard/staff/updates' },
    { icon: Clock, label: 'Tasks', href: '/dashboard/staff/tasks' },
    { icon: UserCircle, label: 'My Profile', href: '/dashboard/profiles' },
  ],
  patient: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/patient' },
    { icon: CalendarPlus, label: 'Book Appointment', href: '/dashboard/patient/book' },
    { icon: Megaphone, label: 'Quick Updates', href: '/dashboard/patient/updates' },
    { icon: Hospital, label: 'Hospitals', href: '/dashboard/patient/hospitals' },
    { icon: Calendar, label: 'Appointments', href: '/dashboard/patient/appointments' },
    { icon: Clock, label: 'History', href: '/dashboard/patient/history' },
    { icon: UserCircle, label: 'Profile', href: '/dashboard/profiles' },
  ],
}

export function Sidebar({ isOpen = false, onClose = () => {} }) {
  const pathname = usePathname()
  const { profile, isLoading } = useUserDetails()
  const { can, loading: rbacLoading } = useRbac()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Ensure hydration consistency
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Only set sidebarItems after profile is loaded and mounted to prevent hydration mismatch.
  //
  // Items carrying a `permission` are then filtered by what the person actually
  // holds, so the nav follows the admin's RBAC settings rather than the job
  // title alone: a doctor granted billing gets the link, a receptionist whose
  // billing was revoked loses it. Wait for RBAC to resolve before filtering --
  // otherwise every gated item flashes away and back on each load.
  const roleItems = mounted && !isLoading ? (roleBasedSidebarItems[profile?.role] || []) : []
  const allowed = (item) => !item.permission || (!rbacLoading && can(item.permission))
  // Groups keep only the children this person may open, and disappear when
  // none are left -- an empty heading would just be a dead click.
  const sidebarItems = roleItems
    .map((item) => (item.children ? { ...item, children: item.children.filter(allowed) } : item))
    .filter((item) => (item.children ? item.children.length > 0 : allowed(item)))

  // Every clickable link, groups flattened, for working out which is active.
  const leafItems = sidebarItems.flatMap((item) => item.children || [item])

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
  const activeMatch = leafItems.reduce((max, item) => {
    const match = getActiveMatch(item.href)
    return match > max ? match : max
  }, -1)

  const isActiveHref = (href) => activeMatch === href.length && getActiveMatch(href) !== -1
  const groupHasActive = (group) => group.children.some((c) => isActiveHref(c.href))

  // Which groups are expanded. The group holding the current page always opens
  // on navigation, so you can see where you are; others stay as you left them.
  const [openGroups, setOpenGroups] = useState(() => new Set())
  const activeGroupLabel = sidebarItems.find((item) => item.children && groupHasActive(item))?.label
  useEffect(() => {
    if (!activeGroupLabel) return
    setOpenGroups((prev) => (prev.has(activeGroupLabel) ? prev : new Set(prev).add(activeGroupLabel)))
  }, [activeGroupLabel])
  const toggleGroup = (label) =>
    setOpenGroups((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })

  // Collapsing is a desktop affordance. The phone drawer always shows labels,
  // even if the sidebar was collapsed on a wider screen.
  const collapsed = isCollapsed && !isOpen

  // Escape closes the phone drawer, like any other overlay.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  return (
    <>
      {/* Mobile backdrop. Covers the navbar too, since the drawer sits over it. */}
      {mounted && (
        <div
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden ${
            isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: a full-height drawer over the page on phones and tablets,
          an in-flow column from lg up. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white border-r border-gray-200 shadow-xl transition-transform duration-300 ease-in-out lg:relative lg:inset-auto lg:z-auto lg:max-w-none lg:shadow-none lg:transition-[width] ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${mounted && isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Drawer header (phones only): the brand plus a close button that
            sits in its own row instead of floating over the user card. */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4 lg:hidden">
          <LogoWordmark size={32} />
          <button
            onClick={onClose}
            className="-mr-2 p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toggle Button - Positioned to be visible on top */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-5 top-8 items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-lg z-50 pointer-events-auto"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            size={20}
            className={`transition-transform duration-300 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Scrollable Sidebar Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain flex flex-col">
          <div className={`${collapsed ? 'p-2' : 'p-4'} pt-4 flex-1`}>
            {/* User Info Card */}
            {!isLoading && profile && !collapsed && (
              <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-indigo-50 flex items-center gap-3 rounded-lg">
                <div className="w-11 h-11 shrink-0 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {profile.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{profile.name}</p>
                  <p className="text-xs text-gray-600 capitalize truncate">{profile.role?.replace('_', ' ')}</p>
                </div>
              </div>
            )}

            {/* Collapsed User Avatar */}
            {!isLoading && profile && collapsed && (
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

                if (item.children) {
                  // Icon-only mode has no room for a sub-list, so the children
                  // are shown as their own icons with the group's name in the
                  // tooltip.
                  if (collapsed) {
                    return item.children.map((child) => (
                      <NavLink
                        key={child.href}
                        item={child}
                        active={isActiveHref(child.href)}
                        collapsed
                        title={`${item.label}: ${child.label}`}
                        onClick={onClose}
                      />
                    ))
                  }

                  const open = openGroups.has(item.label)
                  const hasActive = groupHasActive(item)
                  const groupId = `nav-group-${item.label.replace(/\W+/g, '-').toLowerCase()}`
                  return (
                    <div key={item.label}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.label)}
                        aria-expanded={open}
                        aria-controls={groupId}
                        className={`flex w-full items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                          hasActive && !open
                            ? 'bg-indigo-50 text-indigo-600'
                            : hasActive
                              ? 'text-indigo-600 hover:bg-gray-100'
                              : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <IconComponent size={20} className="shrink-0" />
                        <span className="text-sm truncate flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {open && (
                        <div id={groupId} className="mt-1 ml-6 space-y-1 border-l border-gray-200 pl-3">
                          {item.children.map((child) => (
                            <NavLink
                              key={child.href}
                              item={child}
                              active={isActiveHref(child.href)}
                              nested
                              onClick={onClose}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActiveHref(item.href)}
                    collapsed={collapsed}
                    onClick={onClose}
                  />
                )
              })}
            </nav>
          </div>
        </div>
      </aside>
    </>
  )
}

function NavLink({ item, active, collapsed = false, nested = false, title, onClick }) {
  const IconComponent = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${
        nested ? 'px-3 py-2' : 'px-4 py-3'
      } rounded-lg font-medium transition-colors ${
        active ? 'bg-indigo-100 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'
      }`}
      title={collapsed ? title || item.label : ''}
    >
      <IconComponent size={nested ? 16 : 20} className="shrink-0" />
      {!collapsed && <span className="text-sm truncate">{item.label}</span>}
    </Link>
  )
}
