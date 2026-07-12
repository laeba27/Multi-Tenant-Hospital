'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Ambulance,
  BedDouble,
  Siren,
  MessageSquareHeart,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
} from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import {
  registrationUserSchema,
  registrationHospitalSchema,
  HOSPITAL_TYPES,
} from '@/lib/validations/schemas'

const STEPS = [
  { n: 1, title: 'Your account', blurb: 'How you sign in' },
  { n: 2, title: 'Hospital details', blurb: 'About the facility' },
  { n: 3, title: 'Capacity & services', blurb: 'What you offer' },
]

function Field({ label, error, required, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-rose-600 text-xs mt-1.5">{error.message}</p>}
    </div>
  )
}

function ServiceToggle({ icon: Icon, title, description, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full text-left rounded-xl border p-3.5 transition ${
        checked
          ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-100'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ${
            checked ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <span
          className={`shrink-0 h-5 w-5 rounded-md border flex items-center justify-center ${
            checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
          }`}
        >
          {checked && <Check className="h-3 w-3 text-white" />}
        </span>
      </div>
    </button>
  )
}

export default function SignUpPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [userFormData, setUserFormData] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const userForm = useForm({
    resolver: zodResolver(registrationUserSchema),
    mode: 'onBlur',
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '' },
  })

  const hospitalForm = useForm({
    resolver: zodResolver(registrationHospitalSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '', licenseNumber: '', hospitalType: '', email: '', phone: '', website: '',
      administratorName: '', address: '', city: '', state: '', postalCode: '',
      totalBeds: '', icuBeds: '',
      emergencyServices: false, inpatientServices: false,
      ambulanceServices: false, feedbackEnabled: false,
    },
  })

  const { watch, setValue } = hospitalForm
  const services = watch([
    'emergencyServices',
    'inpatientServices',
    'ambulanceServices',
    'feedbackEnabled',
  ])

  const onUserSubmit = (data) => {
    setUserFormData(data)
    setStep(2)
  }

  // Advance without submitting: validate only this step's fields, so an empty
  // "total beds" on step 3 can't block leaving step 2.
  const goToStep3 = async () => {
    const ok = await hospitalForm.trigger([
      'name', 'licenseNumber', 'hospitalType', 'email', 'phone', 'website',
      'administratorName', 'address', 'city', 'state', 'postalCode',
    ])
    if (ok) setStep(3)
  }

  const onHospitalSubmit = async (h) => {
    if (!userFormData) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: userFormData.fullName,
          email: userFormData.email,
          phone: userFormData.phone,
          password: userFormData.password,

          hospitalName: h.name,
          licenseNumber: h.licenseNumber,
          administratorName: h.administratorName,
          // The hospital's own address — not the administrator's personal one.
          administratorEmail: h.email,
          administratorPhone: h.phone,

          address: h.address,
          city: h.city,
          state: h.state,
          postalCode: h.postalCode,

          hospitalType: h.hospitalType || null,
          website: h.website || null,
          totalBeds: h.totalBeds ? parseInt(h.totalBeds, 10) : null,
          icuBeds: h.icuBeds ? parseInt(h.icuBeds, 10) : null,

          services: {
            emergency: h.emergencyServices || false,
            inpatient: h.inpatientServices || false,
            ambulance: h.ambulanceServices || false,
          },
          feedbackEnabled: h.feedbackEnabled || false,
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || 'Registration failed')
        return
      }

      toast.success('Registration submitted. You can sign in once an admin approves it.')
      setTimeout(() => router.push('/auth/sign-in'), 1800)
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'h-10 text-sm bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100'

  return (
    <AuthShell
      wide
      headline={STEPS[step - 1].title}
      sub={STEPS[step - 1].blurb}
      topRight={
        <p className="text-sm text-slate-500">
          Already registered?{' '}
          <a href="/auth/sign-in" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Sign in
          </a>
        </p>
      }
    >
      <>
          <div>
            {/* Stepper */}
            <ol className="flex items-center gap-2 mb-8">
              {STEPS.map((s, i) => {
                const done = step > s.n
                const active = step === s.n
                return (
                  <li key={s.n} className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`h-7 w-7 shrink-0 rounded-full text-xs font-semibold flex items-center justify-center border transition ${
                          done
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : active
                              ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                              : 'border-slate-200 text-slate-300 bg-white'
                        }`}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : s.n}
                      </span>
                      <span
                        className={`hidden sm:block text-xs font-medium truncate ${
                          active ? 'text-slate-900' : done ? 'text-slate-500' : 'text-slate-300'
                        }`}
                      >
                        {s.title}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`h-px flex-1 ${step > s.n ? 'bg-indigo-600' : 'bg-slate-200'}`}
                      />
                    )}
                  </li>
                )
              })}
            </ol>

            {/* ── Step 1 ── */}
            {step === 1 && (
              <form
                onSubmit={userForm.handleSubmit(onUserSubmit)}
                className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
              >
                <Field label="Full name" required error={userForm.formState.errors.fullName}>
                  <Input
                    {...userForm.register('fullName')}
                    placeholder="Dr. John Mehta"
                    className={inputClass}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Email" required error={userForm.formState.errors.email}>
                    <Input
                      {...userForm.register('email')}
                      type="email"
                      placeholder="john@example.com"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Phone" required error={userForm.formState.errors.phone}>
                    <Input
                      {...userForm.register('phone')}
                      placeholder="98765 43210"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Password"
                    required
                    error={userForm.formState.errors.password}
                    hint="At least 6 characters"
                  >
                    <div className="relative">
                      <Input
                        {...userForm.register('password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  <Field
                    label="Confirm password"
                    required
                    error={userForm.formState.errors.confirmPassword}
                  >
                    <Input
                      {...userForm.register('confirmPassword')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6">
                    Continue <ChevronRight size={16} className="ml-1.5" />
                  </Button>
                </div>
              </form>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
                <Field label="Hospital name" required error={hospitalForm.formState.errors.name}>
                  <Input
                    {...hospitalForm.register('name')}
                    placeholder="Smile Returns Dental Care"
                    className={inputClass}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Type of facility"
                    required
                    error={hospitalForm.formState.errors.hospitalType}
                  >
                    <Select
                      value={hospitalForm.watch('hospitalType')}
                      onValueChange={(v) => setValue('hospitalType', v, { shouldValidate: true })}
                    >
                      <SelectTrigger className="h-10 text-sm bg-white border-slate-200">
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOSPITAL_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field
                    label="License number"
                    required
                    error={hospitalForm.formState.errors.licenseNumber}
                    hint="Your registration / license ID"
                  >
                    <Input
                      {...hospitalForm.register('licenseNumber')}
                      placeholder="DL-2024-01234"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Hospital email"
                    required
                    error={hospitalForm.formState.errors.email}
                    hint="The facility's own address, not yours"
                  >
                    <Input
                      {...hospitalForm.register('email')}
                      type="email"
                      placeholder="contact@hospital.com"
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label="Hospital phone"
                    required
                    error={hospitalForm.formState.errors.phone}
                  >
                    <Input
                      {...hospitalForm.register('phone')}
                      placeholder="011 4567 8900"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Administrator name"
                    required
                    error={hospitalForm.formState.errors.administratorName}
                  >
                    <Input
                      {...hospitalForm.register('administratorName')}
                      placeholder="Dr. John Mehta"
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label="Website"
                    error={hospitalForm.formState.errors.website}
                    hint="Optional"
                  >
                    <Input
                      {...hospitalForm.register('website')}
                      placeholder="https://hospital.com"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Address" required error={hospitalForm.formState.errors.address}>
                  <Textarea
                    {...hospitalForm.register('address')}
                    placeholder="12 Ring Road, Lajpat Nagar"
                    rows={2}
                    className="text-sm bg-white border-slate-200 focus:border-indigo-500"
                  />
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="City" required error={hospitalForm.formState.errors.city}>
                    <Input
                      {...hospitalForm.register('city')}
                      placeholder="New Delhi"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="State" required error={hospitalForm.formState.errors.state}>
                    <Input
                      {...hospitalForm.register('state')}
                      placeholder="Delhi"
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label="PIN code"
                    required
                    error={hospitalForm.formState.errors.postalCode}
                  >
                    <Input
                      {...hospitalForm.register('postalCode')}
                      placeholder="110024"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="pt-2 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-10 px-5"
                  >
                    <ChevronLeft size={16} className="mr-1.5" /> Back
                  </Button>
                  <Button
                    type="button"
                    onClick={goToStep3}
                    className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6"
                  >
                    Continue <ChevronRight size={16} className="ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <form
                onSubmit={hospitalForm.handleSubmit(onHospitalSubmit)}
                className="rounded-xl border border-slate-200 bg-white p-6 space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Total beds"
                    error={hospitalForm.formState.errors.totalBeds}
                    hint="Leave blank if not applicable"
                  >
                    <Input
                      {...hospitalForm.register('totalBeds')}
                      type="number"
                      min="0"
                      placeholder="50"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="ICU beds" error={hospitalForm.formState.errors.icuBeds}>
                    <Input
                      {...hospitalForm.register('icuBeds')}
                      type="number"
                      min="0"
                      placeholder="8"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div>
                  <p className="text-[13px] font-medium text-slate-700 mb-3">Services offered</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <ServiceToggle
                      icon={Siren}
                      title="Emergency"
                      description="24×7 casualty care"
                      checked={services[0]}
                      onChange={(v) => setValue('emergencyServices', v)}
                    />
                    <ServiceToggle
                      icon={BedDouble}
                      title="Inpatient (IPD)"
                      description="Overnight admissions"
                      checked={services[1]}
                      onChange={(v) => setValue('inpatientServices', v)}
                    />
                    <ServiceToggle
                      icon={Ambulance}
                      title="Ambulance"
                      description="Own ambulance service"
                      checked={services[2]}
                      onChange={(v) => setValue('ambulanceServices', v)}
                    />
                    <ServiceToggle
                      icon={MessageSquareHeart}
                      title="Patient feedback"
                      description="Ratings and reviews"
                      checked={services[3]}
                      onChange={(v) => setValue('feedbackEnabled', v)}
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3.5 flex gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Registrations are reviewed before activation. You&apos;ll be able to sign in
                    once an administrator approves your hospital.
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="h-10 px-5"
                    disabled={isLoading}
                  >
                    <ChevronLeft size={16} className="mr-1.5" /> Back
                  </Button>
                  <Button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…
                      </>
                    ) : (
                      'Complete registration'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
      </>
    </AuthShell>
  )
}
