'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { ForgotPasswordDialog } from './ForgotPasswordDialog'

const signInSchema = z.object({
  registrationNo: z.string().min(1, 'Registration number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function SignInPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const hasShownStatusToast = useRef(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
  })

  useEffect(() => {
    if (hasShownStatusToast.current) return

    if (typeof window === 'undefined') return

    const reason = new URLSearchParams(window.location.search).get('reason')
    if (reason === 'pending-approval') {
      toast.error('Your hospital account is pending approval. Please wait for super admin approval.')
      hasShownStatusToast.current = true
    }
    if (reason === 'access-revoked') {
      toast.error('Your access has been revoked. Please contact super admin.')
      hasShownStatusToast.current = true
    }
  }, [])

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      // Step 1: Get user by registration_no from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          role,
          email,
          status,
          access_granted,
          hospital_id,
          hospitals:hospital_id(
            account_status,
            name
          )
        `)
        .eq('registration_no', data.registrationNo)
        .single()

      if (profileError || !profileData) {
        toast.error('Registration number not found')
        setIsLoading(false)
        return
      }

      const profileStatus = (profileData.status || '').toLowerCase()
      const hospitalStatus = (profileData.hospitals?.account_status || '').toLowerCase()

      if (profileData.role === 'hospital_admin') {
        if (profileData.access_granted !== true) {
          toast.error('Your account is pending super admin approval. Please try again later.')
          setIsLoading(false)
          return
        }

        if (hospitalStatus && !['active', 'approved'].includes(hospitalStatus)) {
          toast.error(`Hospital account status is ${profileData.hospitals?.account_status || 'not active'}. Contact super admin.`)
          setIsLoading(false)
          return
        }
      }

      if (profileData.role !== 'super_admin' && profileStatus && !['active', 'approved'].includes(profileStatus)) {
        toast.error('Your profile is not active. Please contact support or super admin.')
        setIsLoading(false)
        return
      }

      // Step 2: Sign in with email and password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password: data.password,
      })

      if (signInError) {
        toast.error(signInError.message)
        setIsLoading(false)
        return
      }

      toast.success('Signed in successfully!')
      
      // Step 3: Redirect to dashboard based on role
      const dashboardRoutes = {
        hospital_admin: '/dashboard/hospital',
        doctor: '/dashboard/doctor',
        staff: '/dashboard/staff',
        receptionist: '/dashboard/reception',
        patient: '/dashboard/patient',
        super_admin: '/dashboard/super-admin',
      }

      const redirectPath = dashboardRoutes[profileData.role] || '/dashboard'
      router.push(redirectPath)
    } catch (error) {
      toast.error('An error occurred. Please try again.')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Registration Number
          </label>
          <Input
            {...register('registrationNo')}
            placeholder="HOSP00001 or HOSP00001"
            disabled={isLoading}
            className="h-11 text-base border-gray-300 focus:border-indigo-500"
          />
          {errors.registrationNo && (
            <p className="text-red-500 text-sm mt-1">{errors.registrationNo.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-sm text-indigo-600 hover:underline font-medium"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              disabled={isLoading}
              className="h-11 text-base border-gray-300 focus:border-indigo-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-base font-semibold flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <p className="text-center text-gray-600 text-sm">
        Don't have an account?{' '}
        <a href="/auth/sign-up" className="text-indigo-600 hover:underline font-medium">
          Register here
        </a>
      </p>
    </div>

    <ForgotPasswordDialog open={showForgot} onClose={() => setShowForgot(false)} />
    </>
  )
}
