'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Mail, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendMyEmailOtp, completePatientProfile } from '@/actions/patients'

export default function CompleteProfileForm() {
  const router = useRouter()

  // 'email' -> enter address and request a code; 'verify' -> code + password + details.
  const [step, setStep] = useState('email')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [details, setDetails] = useState({
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
  })

  const onDetail = (key) => (e) => setDetails((d) => ({ ...d, [key]: e.target.value }))

  async function requestCode(e) {
    e.preventDefault()
    setIsLoading(true)
    const res = await sendMyEmailOtp(email)
    setIsLoading(false)

    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(res.message)
    setStep('verify')
  }

  async function resendCode() {
    setIsLoading(true)
    const res = await sendMyEmailOtp(email)
    setIsLoading(false)
    res.success ? toast.success(res.message) : toast.error(res.error)
  }

  async function submitAll(e) {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setIsLoading(true)
    const res = await completePatientProfile({ email, code, password, details })
    setIsLoading(false)

    if (!res.success) {
      toast.error(res.error)
      return
    }

    toast.success(res.message)
    // Full reload so middleware re-reads the cleared must_complete_profile flag.
    router.replace('/dashboard/patient')
    router.refresh()
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Finish setting up your account</h1>
        <p className="mt-2 text-sm text-gray-600">
          You signed in with the temporary password your clinic gave you. Add your email
          address and choose a password to secure your account.
        </p>
      </div>

      {step === 'email' ? (
        <form onSubmit={requestCode} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                className="h-11 pl-10 text-base"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              We&apos;ll send a 6-digit code here to confirm it&apos;s yours.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !email}
            className="flex h-11 w-full items-center justify-center gap-2 bg-indigo-600 text-base font-semibold hover:bg-indigo-700"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Sending code...' : 'Send verification code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={submitAll} className="space-y-5">
          <div className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">
            Code sent to <strong>{email}</strong>.{' '}
            <button
              type="button"
              onClick={() => setStep('email')}
              className="font-medium underline"
            >
              Change
            </button>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              6-Digit Code *
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                disabled={isLoading}
                className="h-11 pl-10 text-base tracking-[0.4em]"
              />
            </div>
            <button
              type="button"
              onClick={resendCode}
              disabled={isLoading}
              className="mt-2 text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
            >
              Resend code
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                New Password *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="h-11 pr-10 text-base"
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
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="h-11 text-base"
              />
            </div>
          </div>

          <details className="rounded-lg border border-gray-200 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700">
              Add your address (optional)
            </summary>
            <div className="mt-4 space-y-4">
              <Input
                value={details.address}
                onChange={onDetail('address')}
                placeholder="Street address"
                disabled={isLoading}
                className="h-11"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  value={details.city}
                  onChange={onDetail('city')}
                  placeholder="City"
                  disabled={isLoading}
                  className="h-11"
                />
                <Input
                  value={details.state}
                  onChange={onDetail('state')}
                  placeholder="State"
                  disabled={isLoading}
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  value={details.pincode}
                  onChange={onDetail('pincode')}
                  placeholder="Pincode"
                  disabled={isLoading}
                  className="h-11"
                />
                <Input
                  value={details.country}
                  onChange={onDetail('country')}
                  placeholder="Country"
                  disabled={isLoading}
                  className="h-11"
                />
              </div>
            </div>
          </details>

          <Button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="flex h-11 w-full items-center justify-center gap-2 bg-indigo-600 text-base font-semibold hover:bg-indigo-700"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Verifying...' : 'Verify and continue'}
          </Button>
        </form>
      )}
    </div>
  )
}
