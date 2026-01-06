'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X, LogOut, Bell, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useUserDetails } from '@/hooks/use-user-details'

export function Navbar({ onMenuToggle }) {
  const router = useRouter()
  const { profile, hospital, isLoading } = useUserDetails()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

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

  const userInitial = profile?.name?.charAt(0).toUpperCase() || '?'
  const userName = profile?.name || 'User'
  const userRole = profile?.role?.replace('_', ' ') || 'Loading...'
  const hospitalName = hospital?.name || 'Hospital Management Portal'

  return (
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
            {/* Notifications */}
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Settings */}
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <Settings size={20} />
            </button>

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
  )
}
