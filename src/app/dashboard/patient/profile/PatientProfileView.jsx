'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  User, Phone, HeartPulse, Siren, ShieldCheck, Building2, Pencil, X, Save, Loader2, KeyRound, Mail,
  Copy, Lock, BadgeCheck, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { getMyPatientProfile, updateMyPatientProfile, verifyMyNewEmail } from '@/actions/patient-profile'
import { sendMyEmailOtp } from '@/actions/patients'
import { patientAge } from '@/lib/patients/age'
import ChangePasswordDialog from '@/components/patients/ChangePasswordDialog'
import { cn } from '@/lib/utils'

const GENDERS = ['Male', 'Female', 'Other']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed']

const SECTION_FIELDS = {
  personal: ['name', 'gender', 'date_of_birth', 'age_years', 'blood_group', 'marital_status', 'aadhaar_number'],
  contact: ['mobile', 'address', 'city', 'state', 'pincode', 'country'],
  health: ['height', 'weight', 'allergies', 'chronic_conditions', 'insurance_provider', 'insurance_number'],
  emergency: ['emergency_contact_name', 'emergency_contact_mobile'],
}

function fmtDate(d, withTime = false) {
  if (!d) return '—'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? new Date(`${d}T00:00:00`) : new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  return date.toLocaleString('en-IN', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' })
}

const maskAadhaar = (a) => (a ? `XXXX XXXX ${String(a).slice(-4)}` : '')

export default function PatientProfileView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // section key
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)

  const load = useCallback(async () => {
    const res = await getMyPatientProfile()
    if (!res.success) toast.error(res.error || 'Could not load your profile')
    else setData(res)
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const startEdit = (section) => {
    const d = {}
    for (const k of SECTION_FIELDS[section]) d[k] = data.profile[k] ?? ''
    if (section === 'personal') d.age_years = patientAge(data.profile) || ''
    setDraft(d)
    setEditing(section)
  }
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e?.target ? e.target.value : e }))

  const save = async () => {
    setSaving(true)
    const res = await updateMyPatientProfile(editing, draft)
    setSaving(false)
    if (!res.success) { toast.error(res.error); return }
    toast.success('Saved')
    setEditing(null)
    load()
  }

  if (loading) return <div className="py-16 text-center text-sm text-gray-400">Loading your profile…</div>
  if (!data) return <div className="py-16 text-center text-sm text-gray-400">Couldn&apos;t load your profile. Refresh to try again.</div>

  const p = data.profile
  const a = data.account
  const age = patientAge(p)
  const bmi = p.height && p.weight ? (Number(p.weight) / ((Number(p.height) / 100) ** 2)).toFixed(1) : null

  const sectionProps = (key) => ({
    editing: editing === key,
    busy: saving,
    locked: editing !== null && editing !== key,
    onEdit: () => startEdit(key),
    onCancel: () => setEditing(null),
    onSave: save,
  })

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Keep your details up to date. Hospitals you visit see the latest version.</p>
      </div>

      {a.mustChangePassword && (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="flex-1 min-w-0 text-sm text-amber-900">Your account still uses a temporary password. Please set your own.</p>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto" onClick={() => setPwOpen(true)}>
            <KeyRound className="h-4 w-4" /> Change password
          </Button>
        </div>
      )}

      {/* Identity */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-semibold shrink-0">
          {(p.name || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-gray-900 truncate">{p.name || '—'}</p>
          <p className="text-sm text-gray-500">{[age && `${age} years`, p.gender, p.blood_group].filter(Boolean).join(' · ') || 'Patient'}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 min-w-0">
          <p className="text-[11px] text-gray-500 flex items-center gap-1"><Lock className="h-3 w-3" /> Patient ID</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-gray-900 truncate">{a.patientId || '—'}</span>
            {a.patientId && (
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(a.patientId); toast.success('Patient ID copied') }}
                className="p-1 text-gray-400 hover:text-indigo-600" aria-label="Copy patient ID"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <EditableSection title="Personal details" icon={User} {...sectionProps('personal')}>
        {editing === 'personal' ? (
          <Grid>
            <Field label="Full name *" className="sm:col-span-2"><Input value={draft.name} onChange={set('name')} maxLength={100} /></Field>
            <Field label="Gender"><Choice value={draft.gender} onChange={set('gender')} options={GENDERS} /></Field>
            <Field label="Blood group"><Choice value={draft.blood_group} onChange={set('blood_group')} options={BLOOD_GROUPS} /></Field>
            <Field label="Date of birth" hint="Optional. If given, your age is worked out from it.">
              <Input type="date" max={new Date().toISOString().slice(0, 10)} value={draft.date_of_birth || ''} onChange={set('date_of_birth')} />
            </Field>
            <Field label="Age *" hint={draft.date_of_birth ? 'From your date of birth' : 'Years'}>
              <Input type="number" min="0" max="150" value={draft.date_of_birth ? (patientAge({ date_of_birth: draft.date_of_birth }) || '') : draft.age_years} onChange={set('age_years')} disabled={Boolean(draft.date_of_birth)} />
            </Field>
            <Field label="Marital status"><Choice value={draft.marital_status} onChange={set('marital_status')} options={MARITAL} /></Field>
            <Field label="Aadhaar number" hint="12 digits. Optional.">
              <Input inputMode="numeric" maxLength={14} value={draft.aadhaar_number} onChange={set('aadhaar_number')} placeholder="XXXX XXXX XXXX" />
            </Field>
          </Grid>
        ) : (
          <Read>
            <Item label="Full name" value={p.name} />
            <Item label="Gender" value={p.gender} />
            <Item label="Age" value={age ? `${age} years` : ''} />
            <Item label="Date of birth" value={p.date_of_birth ? fmtDate(p.date_of_birth) : ''} />
            <Item label="Blood group" value={p.blood_group} />
            <Item label="Marital status" value={p.marital_status} />
            <Item label="Aadhaar number" value={maskAadhaar(p.aadhaar_number)} mono />
          </Read>
        )}
      </EditableSection>

      <EditableSection title="Contact & address" icon={Phone} {...sectionProps('contact')}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-slate-50/60 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500">Email (used to sign in)</p>
            <p className="text-sm text-gray-900 truncate flex items-center gap-1.5">
              {p.email || <span className="text-gray-400">Not set</span>}
              {p.emailVerified && <BadgeCheck className="h-4 w-4 text-emerald-600" aria-label="Verified" />}
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setEmailOpen(true)} disabled={editing !== null}>
            <Mail className="h-3.5 w-3.5" /> {p.email ? 'Change email' : 'Add email'}
          </Button>
        </div>
        {editing === 'contact' ? (
          <Grid>
            <Field label="Mobile number *"><Input type="tel" value={draft.mobile} onChange={set('mobile')} placeholder="+91 98765 43210" /></Field>
            <Field label="Country"><Input value={draft.country} onChange={set('country')} placeholder="India" /></Field>
            <Field label="Address" className="sm:col-span-2"><Textarea rows={2} value={draft.address} onChange={set('address')} placeholder="House, street, area" /></Field>
            <Field label="City"><Input value={draft.city} onChange={set('city')} /></Field>
            <Field label="State"><Input value={draft.state} onChange={set('state')} /></Field>
            <Field label="PIN code"><Input inputMode="numeric" maxLength={10} value={draft.pincode} onChange={set('pincode')} /></Field>
          </Grid>
        ) : (
          <Read>
            <Item label="Mobile number" value={p.mobile} />
            <Item label="Address" value={p.address} wide />
            <Item label="City" value={p.city} />
            <Item label="State" value={p.state} />
            <Item label="PIN code" value={p.pincode} />
            <Item label="Country" value={p.country} />
          </Read>
        )}
      </EditableSection>

      <EditableSection title="Health information" icon={HeartPulse} hint="Shared with the hospitals you're registered at, to help them treat you safely." {...sectionProps('health')}>
        {editing === 'health' ? (
          <Grid>
            <Field label="Height (cm)"><Input type="number" min="30" max="260" step="0.1" value={draft.height} onChange={set('height')} /></Field>
            <Field label="Weight (kg)"><Input type="number" min="1" max="400" step="0.1" value={draft.weight} onChange={set('weight')} /></Field>
            <Field label="Allergies" className="sm:col-span-2" hint="Medicines, food or anything else, e.g. Penicillin, peanuts">
              <Textarea rows={2} value={draft.allergies} onChange={set('allergies')} />
            </Field>
            <Field label="Ongoing conditions" className="sm:col-span-2" hint="e.g. Diabetes, high blood pressure, asthma">
              <Textarea rows={2} value={draft.chronic_conditions} onChange={set('chronic_conditions')} />
            </Field>
            <Field label="Insurance provider"><Input value={draft.insurance_provider} onChange={set('insurance_provider')} /></Field>
            <Field label="Policy number"><Input value={draft.insurance_number} onChange={set('insurance_number')} /></Field>
          </Grid>
        ) : (
          <Read>
            <Item label="Height" value={p.height ? `${p.height} cm` : ''} />
            <Item label="Weight" value={p.weight ? `${p.weight} kg` : ''} />
            {bmi && <Item label="BMI" value={bmi} />}
            <Item label="Allergies" value={p.allergies} wide />
            <Item label="Ongoing conditions" value={p.chronic_conditions} wide />
            <Item label="Insurance provider" value={p.insurance_provider} />
            <Item label="Policy number" value={p.insurance_number} mono />
          </Read>
        )}
      </EditableSection>

      <EditableSection title="Emergency contact" icon={Siren} hint="Someone the hospital can call if you can't." {...sectionProps('emergency')}>
        {editing === 'emergency' ? (
          <Grid>
            <Field label="Name"><Input value={draft.emergency_contact_name} onChange={set('emergency_contact_name')} placeholder="e.g. Priya (sister)" /></Field>
            <Field label="Mobile number"><Input type="tel" value={draft.emergency_contact_mobile} onChange={set('emergency_contact_mobile')} /></Field>
          </Grid>
        ) : (
          <Read>
            <Item label="Name" value={p.emergency_contact_name} />
            <Item label="Mobile number" value={p.emergency_contact_mobile} />
          </Read>
        )}
      </EditableSection>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900 flex-1">Security</h2>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setPwOpen(true)} disabled={editing !== null}>
            <KeyRound className="h-3.5 w-3.5" /> Change password
          </Button>
        </div>
        <Read>
          <Item label="Password" value={a.mustChangePassword ? 'Temporary password, please change it' : '••••••••'} />
          <Item label="Last signed in" value={a.lastSignIn ? fmtDate(a.lastSignIn, true) : ''} />
          <Item label="Account created" value={a.createdAt ? fmtDate(a.createdAt) : ''} />
          <Item label="Details last updated" value={a.updatedAt ? fmtDate(a.updatedAt, true) : ''} />
        </Read>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">My hospital records</h2>
        </div>
        <p className="text-[12px] text-gray-500 mb-3 flex items-center gap-1"><Lock className="h-3 w-3" /> IDs are given by the hospital and can&apos;t be changed.</p>
        {data.hospitals.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">You aren&apos;t registered at any hospital yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.hospitals.map((h) => (
              <li key={h.recordId} className="py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{h.name}</p>
                  <p className="text-[11px] text-gray-500">{[h.city, `Registered ${fmtDate(h.since)}`].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-400">Record ID</p>
                  <p className="font-mono text-[12px] text-gray-800">{h.recordId}</p>
                </div>
                {!h.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">Inactive</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ChangePasswordDialog
        open={pwOpen}
        temporary={a.mustChangePassword}
        onClose={() => setPwOpen(false)}
        onChanged={() => { setPwOpen(false); load() }}
      />
      <ChangeEmailDialog open={emailOpen} current={p.email} onClose={() => setEmailOpen(false)} onChanged={() => { setEmailOpen(false); load() }} />
    </div>
  )
}

function EditableSection({ title, icon: Icon, hint, editing, busy, locked, onEdit, onCancel, onSave, children }) {
  return (
    <section className={cn('bg-white rounded-xl border shadow-sm p-4 sm:p-5 transition-colors', editing ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-100')}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-indigo-600" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
        </div>
        {editing ? (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button size="sm" variant="outline" className="h-8 flex-1 sm:flex-none gap-1" onClick={onCancel} disabled={busy}><X className="h-3.5 w-3.5" /> Cancel</Button>
            <Button size="sm" className="h-8 flex-1 sm:flex-none gap-1 bg-indigo-600 hover:bg-indigo-700" onClick={onSave} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onEdit} disabled={locked}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        )}
      </div>
      {children}
    </section>
  )
}

const Grid = ({ children }) => <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
const Read = ({ children }) => <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">{children}</dl>

function Field({ label, hint, className, children }) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

function Item({ label, value, mono, wide }) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-[11px] text-gray-500">{label}</dt>
      <dd className={cn('text-sm text-gray-900 wrap-anywhere whitespace-pre-line', mono && 'font-mono')}>
        {value || <span className="text-gray-400">Not added</span>}
      </dd>
    </div>
  )
}

function Choice({ value, onChange, options }) {
  return (
    <Select value={value || '__none'} onValueChange={(v) => onChange(v === '__none' ? '' : v)}>
      <SelectTrigger className="h-9 text-[14px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none" className="text-gray-400">Not set</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function ChangeEmailDialog({ open, current, onClose, onChanged }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (open) { setEmail(''); setCode(''); setStep('email') } }, [open])

  const send = async (e) => {
    e?.preventDefault()
    if (email.trim().toLowerCase() === String(current || '').toLowerCase()) { toast.error('That is already your email'); return }
    setBusy(true)
    const res = await sendMyEmailOtp(email)
    setBusy(false)
    if (!res.success) { toast.error(res.error); return }
    toast.success(res.message || 'Code sent')
    setStep('code')
  }

  const verify = async (e) => {
    e.preventDefault()
    setBusy(true)
    const res = await verifyMyNewEmail({ email, code })
    setBusy(false)
    if (!res.success) { toast.error(res.error); return }
    toast.success(`Email changed to ${res.email}. Use it next time you sign in.`)
    onChanged()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{current ? 'Change email' : 'Add email'}</DialogTitle>
          <DialogDescription>
            {step === 'email'
              ? 'We’ll send a 6-digit code to the new address to check it’s yours. Your current email keeps working until then.'
              : `Enter the code sent to ${email}.`}
          </DialogDescription>
        </DialogHeader>
        {step === 'email' ? (
          <form onSubmit={send} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-email" className="text-xs font-medium text-gray-700">New email</Label>
              <Input id="new-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email-code" className="text-xs font-medium text-gray-700">6-digit code</Label>
              <Input id="email-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required autoFocus className="font-mono tracking-[0.3em] text-center" />
            </div>
            <button type="button" onClick={send} disabled={busy} className="text-[12px] text-indigo-600 hover:underline disabled:opacity-50">Send a new code</button>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('email')}>Back</Button>
              <Button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify & change'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
