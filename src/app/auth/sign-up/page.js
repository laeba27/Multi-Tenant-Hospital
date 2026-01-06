'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { registrationUserSchema, registrationHospitalSchema } from '@/lib/validations/schemas'
import { createClient } from '@/lib/supabase/client'
import { generateHospitalId, generateUserId } from '@/lib/utils/index'

export default function SignUpPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [userFormData, setUserFormData] = useState(null)

  // Step 1: User Details Form
  const userForm = useForm({
    resolver: zodResolver(registrationUserSchema),
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  // Step 2: Hospital Details Form
  const hospitalForm = useForm({
    resolver: zodResolver(registrationHospitalSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      licenseNumber: '',
      administratorName: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
    },
  })

  const onUserSubmit = async (data) => {
    setUserFormData(data)
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onHospitalSubmit = async (hospitalData) => {
    if (!userFormData) return

    setIsLoading(true)
    try {
      const payload = {
        fullName: userFormData.fullName,
        email: userFormData.email,
        phone: userFormData.phone,
        password: userFormData.password,
        hospitalName: hospitalData.name,
        licenseNumber: hospitalData.licenseNumber,
        administratorName: hospitalData.administratorName,
        administratorEmail: userFormData.email,
        administratorPhone: hospitalData.phone,
        address: hospitalData.address,
        city: hospitalData.city,
        state: hospitalData.state,
        postalCode: hospitalData.postalCode,
        hospitalType: hospitalData.hospitalType || null,
        website: hospitalData.website || null,
        totalBeds: hospitalData.totalBeds ? parseInt(hospitalData.totalBeds) : null,
        icuBeds: hospitalData.icuBeds ? parseInt(hospitalData.icuBeds) : null,
        services: {
          emergency: hospitalData.emergencyServices || false,
          inpatient: hospitalData.inpatientServices || false,
          ambulance: hospitalData.ambulanceServices || false,
        },
        feedbackEnabled: hospitalData.feedbackEnabled || false,
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Registration failed')
        return
      }

      toast.success('Registration successful! Welcome email sent. Redirecting to login...')
      setTimeout(() => {
        router.push('/auth/sign-in')
      }, 2000)
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 sm:px-8 py-8 sm:py-10 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {step === 1 ? 'Register Hospital' : 'Hospital Details'}
            </h1>
            <p className="text-indigo-100 text-sm">
              Step {step} of 2 • {step === 1 ? 'Your Information' : 'Hospital Information'}
            </p>

            {/* Progress Bar */}
            <div className="mt-6 w-full bg-indigo-500 h-1 rounded-full overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-300"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 sm:px-8 py-8 sm:py-10">
            {step === 1 && (
              <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Full Name *
                  </label>
                  <Input
                    {...userForm.register('fullName')}
                    placeholder="John Doe"
                    className="h-11 text-base border-gray-300 focus:border-indigo-500"
                  />
                  {userForm.formState.errors.fullName && (
                    <p className="text-red-500 text-xs mt-2 flex items-center">
                      <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-2" />
                      {userForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Email Address *
                  </label>
                  <Input
                    {...userForm.register('email')}
                    type="email"
                    placeholder="john@example.com"
                    className="h-11 text-base border-gray-300 focus:border-indigo-500"
                  />
                  {userForm.formState.errors.email && (
                    <p className="text-red-500 text-xs mt-2 flex items-center">
                      <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-2" />
                      {userForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Phone Number *
                  </label>
                  <Input
                    {...userForm.register('phone')}
                    placeholder="+1 (555) 000-0000"
                    className="h-11 text-base border-gray-300 focus:border-indigo-500"
                  />
                  {userForm.formState.errors.phone && (
                    <p className="text-red-500 text-xs mt-2 flex items-center">
                      <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-2" />
                      {userForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Password *
                  </label>
                  <Input
                    {...userForm.register('password')}
                    type="password"
                    placeholder="••••••••"
                    className="h-11 text-base border-gray-300 focus:border-indigo-500"
                  />
                  {userForm.formState.errors.password && (
                    <p className="text-red-500 text-xs mt-2 flex items-center">
                      <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-2" />
                      {userForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Confirm Password *
                  </label>
                  <Input
                    {...userForm.register('confirmPassword')}
                    type="password"
                    placeholder="••••••••"
                    className="h-11 text-base border-gray-300 focus:border-indigo-500"
                  />
                  {userForm.formState.errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-2 flex items-center">
                      <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-2" />
                      {userForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Next Button */}
                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-base font-semibold flex items-center justify-center mt-6"
                  disabled={isLoading}
                >
                  Next <ChevronRight size={20} className="ml-2" />
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={hospitalForm.handleSubmit(onHospitalSubmit)} className="space-y-5 max-h-96 overflow-y-auto pr-2">
                {/* Hospital Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Hospital Name *
                  </label>
                  <Input
                    {...hospitalForm.register('name')}
                    placeholder="St. Mary's Hospital"
                    className="h-11 text-base border-gray-300 focus:border-indigo-500"
                  />
                  {hospitalForm.formState.errors.name && (
                    <p className="text-red-500 text-xs mt-2 flex items-center">
                      <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-2" />
                      {hospitalForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* License & Administrator Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      License # *
                    </label>
                    <Input
                      {...hospitalForm.register('licenseNumber')}
                      placeholder="LIC12345"
                      className="h-11 text-base border-gray-300 focus:border-indigo-500"
                    />
                    {hospitalForm.formState.errors.licenseNumber && (
                      <p className="text-red-500 text-xs mt-1">
                        {hospitalForm.formState.errors.licenseNumber.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Admin Name *
                    </label>
                    <Input
                      {...hospitalForm.register('administratorName')}
                      placeholder="Dr. Smith"
                      className="h-11 text-base border-gray-300 focus:border-indigo-500"
                    />
                    {hospitalForm.formState.errors.administratorName && (
                      <p className="text-red-500 text-xs mt-1">
                        {hospitalForm.formState.errors.administratorName.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Phone *
                  </label>
                  <Input
                    {...hospitalForm.register('phone')}
                    placeholder="+1 (555) 000-0000"
                    className="h-11 text-base border-gray-300 focus:border-indigo-500"
                  />
                  {hospitalForm.formState.errors.phone && (
                    <p className="text-red-500 text-xs mt-2">
                      {hospitalForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Address *
                  </label>
                  <Input
                    {...hospitalForm.register('address')}
                    placeholder="123 Hospital St."
                    className="h-11 text-base border-gray-300 focus:border-indigo-500"
                  />
                  {hospitalForm.formState.errors.address && (
                    <p className="text-red-500 text-xs mt-2">
                      {hospitalForm.formState.errors.address.message}
                    </p>
                  )}
                </div>

                {/* City, State, Postal Code */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      City *
                    </label>
                    <Input
                      {...hospitalForm.register('city')}
                      placeholder="NYC"
                      className="h-11 text-base border-gray-300 focus:border-indigo-500"
                    />
                    {hospitalForm.formState.errors.city && (
                      <p className="text-red-500 text-xs mt-1">
                        {hospitalForm.formState.errors.city.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      State *
                    </label>
                    <Input
                      {...hospitalForm.register('state')}
                      placeholder="NY"
                      className="h-11 text-base border-gray-300 focus:border-indigo-500"
                    />
                    {hospitalForm.formState.errors.state && (
                      <p className="text-red-500 text-xs mt-1">
                        {hospitalForm.formState.errors.state.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      ZIP *
                    </label>
                    <Input
                      {...hospitalForm.register('postalCode')}
                      placeholder="10001"
                      className="h-11 text-base border-gray-300 focus:border-indigo-500"
                    />
                    {hospitalForm.formState.errors.postalCode && (
                      <p className="text-red-500 text-xs mt-1">
                        {hospitalForm.formState.errors.postalCode.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 h-11 text-base"
                  >
                    <ChevronLeft size={20} className="mr-2" /> Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-11 text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating...' : 'Complete'}
                  </Button>
                </div>
              </form>
            )}

            {/* Sign In Link */}
            <p className="text-center text-gray-600 text-sm mt-6 border-t border-gray-200 pt-6">
              Already registered?{' '}
              <a href="/auth/sign-in" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                Sign in here
              </a>
            </p>
          </div>
        </div>

        {/* Bottom Info */}
        <p className="text-center text-gray-500 text-xs mt-6">
          Your information is secure and encrypted
        </p>
      </div>
    </div>
  )
}
