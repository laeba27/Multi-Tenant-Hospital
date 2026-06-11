'use client'

import { useState } from 'react'
import { UserPlus, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSuperAdminAccount } from '@/actions/super-admin'

export default function AddMemberPage() {
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', registrationNo: '' })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await createSuperAdminAccount(form)
    setSaving(false)
    if (!res.success) { toast.error(res.error || 'Failed to create super admin'); return }
    toast.success(`Super admin created. Reg No: ${res.data?.registrationNo || 'Generated'}`)
    setForm({ name: '', email: '', mobile: '', password: '', registrationNo: '' })
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-indigo-600" /> Add Member
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Create another super admin to help manage the portal.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-indigo-600" /> New Super Admin
            </CardTitle>
            <CardDescription>This account gets full super-admin access on creation.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name *"><Input value={form.name} onChange={set('name')} required /></Field>
              <Field label="Email *"><Input type="email" value={form.email} onChange={set('email')} required /></Field>
              <Field label="Mobile *"><Input value={form.mobile} onChange={set('mobile')} required /></Field>
              <Field label="Password *"><Input type="password" value={form.password} onChange={set('password')} required /></Field>
              <Field label="Registration No (optional)"><Input value={form.registrationNo} onChange={set('registrationNo')} /></Field>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Super Admin'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      {children}
    </div>
  )
}
