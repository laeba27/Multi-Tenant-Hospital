'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { decodePasswordResetToken } from '@/lib/utils/jwt'
import AuthShell from '@/components/auth/AuthShell'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetData, setResetData] = useState(null)
  const [tokenError, setTokenError] = useState(null)
  const [isVerifying, setIsVerifying] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setTokenError('No reset token provided')
      setIsVerifying(false)
      return
    }
    const verification = decodePasswordResetToken(token)
    if (!verification.valid) {
      setTokenError(verification.error || 'Invalid or expired reset link')
    } else {
      setResetData(verification.data)
    }
    setIsVerifying(false)
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
      const response = await fetch('/api/auth/reset-password-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || 'Failed to reset password')
        return
      }
      toast.success(result.message || 'Password reset successfully!')
      setDone(true)
      setTimeout(() => router.push('/auth/sign-in'), 2000)
    } catch (error) {
      console.error('Reset error:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-gray-600">Verifying reset link...</p>
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-red-900 mb-2">Invalid Reset Link</h2>
        <p className="text-red-700 mb-4">{tokenError}</p>
        <p className="text-sm text-red-600 mb-4">
          Please request a new password reset link from the sign-in page.
        </p>
        <Button onClick={() => router.push('/auth/sign-in')} variant="outline" className="w-full">
          Return to Sign In
        </Button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-green-900 mb-2">Password Reset</h2>
        <p className="text-green-700">Redirecting you to sign in…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center -mt-2">
        <h2 className="text-xl font-bold text-gray-900">Reset Your Password</h2>
        <p className="text-sm text-gray-600 mt-1">
          {resetData?.registration_no
            ? `For registration ${resetData.registration_no}`
            : 'Choose a new password to continue'}
        </p>
      </div>

      {/* New Password */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">New Password *</label>
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
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">Minimum 8 characters required</p>
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm Password *</label>
        <div className="relative">
          <Input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength="8"
            className="pr-10 h-11 text-base border-gray-300 focus:border-indigo-500"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Requirements */}
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

      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full h-11 font-semibold flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Resetting…
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4" /> Reset Password
          </>
        )}
      </Button>

      <p className="text-center text-gray-600 text-sm">
        Remembered it?{' '}
        <button
          type="button"
          onClick={() => router.push('/auth/sign-in')}
          className="text-indigo-600 hover:underline font-medium"
        >
          Sign In
        </button>
      </p>
    </form>
  )
}

function ResetPasswordInner() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthShell headline="Reset password" sub="Choose a new password for your account.">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <ResetPasswordInner />
      </div>
    </AuthShell>
  )
}
