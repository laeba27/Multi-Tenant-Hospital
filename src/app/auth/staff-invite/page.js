'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { decodeStaffInviteToken } from '@/lib/utils/jwt'

function StaffInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [staffData, setStaffData] = useState(null)
  const [tokenError, setTokenError] = useState(null)
  const [isVerifying, setIsVerifying] = useState(true)

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setTokenError('No invitation token provided')
      setIsVerifying(false)
      return
    }

    try {
      const verification = decodeStaffInviteToken(token)
      if (!verification.valid) {
        setTokenError(verification.error || 'Invalid or expired invitation link')
        setIsVerifying(false)
        return
      }

      setStaffData(verification.data)
      setIsVerifying(false)
    } catch (error) {
      console.error('Token verification error:', error)
      setTokenError('Failed to verify invitation token')
      setIsVerifying(false)
    }
  }, [token])

  const isPasswordValid = password.length >= 8
  const passwordsMatch = password === confirmPassword
  const canSubmit = isPasswordValid && passwordsMatch && !isLoading

  async function handleSubmit(e) {
    e.preventDefault()

    if (!isPasswordValid) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    if (!passwordsMatch) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/verify-staff-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password
        })
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Verification failed')
        return
      }

      toast.success(result.message || 'Account created successfully!')
      
      // Redirect to sign-in
      setTimeout(() => {
        router.push('/auth/sign-in')
      }, 2000)
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Your Registration
            </h1>
            <p className="text-gray-600">
              Set up your password to activate your account
            </p>
          </div>

          {/* Loading State */}
          {isVerifying && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-gray-600">Verifying invitation...</p>
            </div>
          )}

          {/* Token Error State */}
          {tokenError && !isVerifying && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-red-900 mb-2">
                Invalid Invitation
              </h2>
              <p className="text-red-700 mb-4">{tokenError}</p>
              <p className="text-sm text-red-600 mb-4">
                {tokenError === 'Invalid or expired invitation link' 
                  ? 'Please request a new invitation from your hospital administrator.'
                  : 'If you believe this is an error, please contact support.'}
              </p>
              <Button
                onClick={() => router.push('/auth/sign-in')}
                variant="outline"
                className="w-full"
              >
                Return to Sign In
              </Button>
            </div>
          )}

          {/* Staff Details & Form */}
          {!isVerifying && !tokenError && staffData && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Staff Details Display */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 space-y-3 border border-indigo-100">
                <div>
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Name</p>
                  <p className="text-lg font-semibold text-gray-900">{staffData.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Email</p>
                  <p className="text-gray-700">{staffData.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Role</p>
                  <p className="inline-block bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {staffData.role.replace(/_/g, ' ').toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Registration No</p>
                  <p className="text-gray-700 font-mono text-sm">{staffData.registration_no}</p>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength="8"
                    className="pr-10 h-11 text-base border-gray-300 focus:border-indigo-500"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Minimum 8 characters required
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength="8"
                    className="pr-10 h-11 text-base border-gray-300 focus:border-indigo-500"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center ${isPasswordValid ? 'bg-green-100' : 'bg-gray-200'}`}>
                    {isPasswordValid && <CheckCircle className="h-3 w-3 text-green-600" />}
                  </div>
                  <span className={`text-sm ${isPasswordValid ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center ${passwordsMatch && password ? 'bg-green-100' : 'bg-gray-200'}`}>
                    {passwordsMatch && password && <CheckCircle className="h-3 w-3 text-green-600" />}
                  </div>
                  <span className={`text-sm ${passwordsMatch && password ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                    Passwords match
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full h-11 font-semibold flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Complete Registration
                  </>
                )}
              </Button>

              {/* Help Text */}
              <p className="text-xs text-gray-600 text-center">
                By completing this registration, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          )}
        </div>

        {/* Footer Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/auth/sign-in')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function StaffInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      }
    >
      <StaffInviteContent />
    </Suspense>
  )
}
