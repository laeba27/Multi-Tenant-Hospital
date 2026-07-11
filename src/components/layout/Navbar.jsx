'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, LogOut, Bell, Settings, MessageSquare, Megaphone, CalendarCheck } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useUserDetails } from '@/hooks/use-user-details'
import { getNavNotifications, markNotificationRead } from '@/actions/notifications'
import { ResetPasswordDialog } from './ResetPasswordDialog'

export function Navbar({ onMenuToggle }) {
  const router = useRouter()
  const { profile, hospital, isLoading } = useUserDetails()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState(null) // 'notifications' | 'settings' | null
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const menuRef = useRef(null)

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true)
    try {
      const res = await getNavNotifications()
      setNotifications(res.items || [])
      setUnreadCount(res.count || 0)
    } catch (e) {
      console.error('Failed to load notifications', e)
    } finally {
      setNotifLoading(false)
    }
  }, [])

  // Clicking a notification takes you to the thing it is about -- the booking
  // request queue for reception, the appointment list for a patient.
  const handleNotificationClick = useCallback(
    async (n) => {
      setOpenMenu(null)
      if (n.notificationId && n.unread) {
        await markNotificationRead(n.notificationId)
        loadNotifications()
      }
      if (n.link) router.push(n.link)
    },
    [router, loadNotifications]
  )

  // Load once the user is known so the bell badge reflects real content.
  useEffect(() => {
    if (profile) loadNotifications()
  }, [profile, loadNotifications])

  // Close any open icon menu on outside click.
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const toggleMenu = (name) => setOpenMenu((cur) => (cur === name ? null : name))

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Logged out successfully')
      router.push('/auth/sign-in')
    } catch (error) {
      toast.error('Error logging out')
      console.error(error)
    }
  }

  const hasNotifications = notifications.length > 0

  const userInitial = profile?.name?.charAt(0).toUpperCase() || '?'
  const userName = profile?.name || 'User'
  const userRole = profile?.role?.replace('_', ' ') || 'Loading...'
  const hospitalName = hospital?.name || 'Hospital Management Portal'

  return (
    <>
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuToggle}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                HMP
              </div>
              <div className="hidden sm:block">
                <p className="text-xs text-gray-500">Hospital Management</p>
                <p className="text-sm font-bold text-gray-900">{hospitalName}</p>
              </div>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            <div ref={menuRef} className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => toggleMenu('notifications')}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg relative"
                  title="Notifications"
                >
                  <Bell size={20} />
                  {/* Unread, not merely present -- notices and issues have no
                      read state and would keep the dot permanently lit. */}
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>

                {openMenu === 'notifications' && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">Notifications</p>
                      {unreadCount > 0 && (
                        <span className="text-[11px] text-gray-400">{unreadCount} unread</span>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifLoading ? (
                        <p className="px-4 py-6 text-sm text-gray-400 text-center">Loading…</p>
                      ) : !hasNotifications ? (
                        <p className="px-4 py-8 text-sm text-gray-400 text-center">
                          You&apos;re all caught up.
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleNotificationClick(n)}
                            className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 ${
                              n.unread ? 'bg-indigo-50/40' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span
                                className={`mt-0.5 inline-flex rounded-md p-1.5 ${
                                  n.kind === 'issue'
                                    ? 'bg-amber-50 text-amber-600'
                                    : n.kind?.startsWith('appointment')
                                      ? 'bg-emerald-50 text-emerald-600'
                                      : 'bg-indigo-50 text-indigo-600'
                                }`}
                              >
                                {n.kind === 'issue' ? (
                                  <MessageSquare size={14} />
                                ) : n.kind?.startsWith('appointment') ? (
                                  <CalendarCheck size={14} />
                                ) : (
                                  <Megaphone size={14} />
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-gray-900 truncate">
                                  {n.title}
                                </p>
                                {n.body && (
                                  <p className="text-[12px] text-gray-500 line-clamp-2">{n.body}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  {n.badge && (
                                    <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 capitalize">
                                      {n.badge}
                                    </span>
                                  )}
                                  {n.at && (
                                    <span className="text-[10px] text-gray-300">
                                      {formatDistanceToNow(new Date(n.at), { addSuffix: true })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="relative">
                <button
                  onClick={() => toggleMenu('settings')}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Settings"
                >
                  <Settings size={20} />
                </button>

                {openMenu === 'settings' && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Settings</p>
                    </div>
                    <button
                      onClick={() => {
                        setOpenMenu(null)
                        setShowResetDialog(true)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => {
                        setOpenMenu(null)
                        router.push('/dashboard/profiles')
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 border-t border-gray-100"
                    >
                      Profile Settings
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {profile?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {isLoading ? 'Loading...' : profile?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isLoading ? '' : profile?.role}
                  </p>
                </div>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <button
                    onClick={() => router.push('/dashboard/profiles')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg"
                  >
                    Profile Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 last:rounded-b-lg border-t border-gray-200"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>

    <ResetPasswordDialog open={showResetDialog} onClose={() => setShowResetDialog(false)} />
    </>
  )
}
