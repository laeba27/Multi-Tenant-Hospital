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
import AuthShell from '@/components/auth/AuthShell'
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

  const inputClass =
    'h-10 text-sm bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100'

  return (
    <AuthShell
      headline="Sign in"
      sub="Use the registration number issued to you."
      topRight={
        <p className="text-sm text-slate-500">
          New hospital?{' '}
          <a href="/auth/sign-up" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Register
          </a>
        </p>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
      >
        <div>
          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
            Registration number <span className="text-rose-500">*</span>
          </label>
          <Input
            {...register('registrationNo')}
            placeholder="HOSP00001"
            disabled={isLoading}
            className={inputClass}
          />
          {errors.registrationNo ? (
            <p className="text-rose-600 text-xs mt-1.5">{errors.registrationNo.message}</p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">
              Your hospital, staff or patient registration number.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[13px] font-medium text-slate-700">
              Password <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
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
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-rose-600 text-xs mt-1.5">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 font-semibold flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <ForgotPasswordDialog open={showForgot} onClose={() => setShowForgot(false)} />
    </AuthShell>
  )
}
