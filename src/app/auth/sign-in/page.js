'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const signInSchema = z.object({
  registrationNo: z.string().min(1, 'Registration number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function SignInPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      // Step 1: Get user by registration_no from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, email')
        .eq('registration_no', data.registrationNo)
        .single()

      if (profileError || !profileData) {
        toast.error('Registration number not found')
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
        reception: '/dashboard/reception',
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <Input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            disabled={isLoading}
            className="h-11 text-base border-gray-300 focus:border-indigo-500"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-base font-semibold"
        >
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
  )
}
