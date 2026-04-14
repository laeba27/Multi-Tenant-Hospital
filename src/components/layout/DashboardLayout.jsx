'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import { toast } from 'sonner'
import { useUserDetails } from '@/hooks/use-user-details'
import { Button } from '@/components/ui/button'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const { profile, hospital, isLoading } = useUserDetails()

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Logged out successfully')
      router.push('/auth/sign-in')
    } catch {
      toast.error('Error logging out')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ===== Page Header ===== */}
        <div className="mb-8 bg-white rounded-xl border shadow-sm p-6">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            {/* Left */}
            <div>
              <p className="text-sm text-gray-500">Welcome back</p>

              <h2 className="text-2xl font-bold text-gray-900">
                {profile?.name} 👋
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                We’re glad to see you again. Continue managing your hospital activity below.
              </p>
            </div>

            {/* Right */}
            <div className="flex flex-col sm:items-end gap-3">
<div>
                {/* <p className="text-xs text-gray-500">Hospital</p> */}
                <p className="text-sm font-semibold text-gray-900">
                  {hospital?.name || 'Hospital Management Portal'}
                </p>
              </div>
              <div>
                {/* <p className="text-xs text-gray-500">Role</p> */}
                <p className="text-sm font-semibold text-indigo-700 capitalize">
                  {profile?.role?.replace('_', ' ')}
                </p>
              </div>

              

              
            </div>
          </div>
        </div>
        {/* ===== End Header ===== */}

        {children}
      </main>
    </div>
  )
}
