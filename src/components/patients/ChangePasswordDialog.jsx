'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { changeMyPatientPassword } from '@/actions/patient-profile'

/**
 * Change password for a patient. Asks for the current password, except while
 * the account still has the temporary one it was created with.
 */
export default function ChangePasswordDialog({ open, onClose, onChanged, temporary = false }) {
  const [current, setCurrent] = useState('')
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setCurrent(''); setPw(''); setConfirm(''); setShow(false) }
  }, [open])

  const checks = [
    { ok: pw.length >= 8, label: 'At least 8 characters' },
    { ok: /[A-Za-z]/.test(pw) && /\d/.test(pw), label: 'Letters and numbers' },
    { ok: pw.length > 0 && pw === confirm, label: 'Both entries match' },
  ]

  const submit = async (e) => {
    e.preventDefault()
    if (!checks.every((c) => c.ok)) { toast.error('Check the password rules below'); return }
    setSaving(true)
    const res = await changeMyPatientPassword({ currentPassword: current, newPassword: pw })
    setSaving(false)
    if (!res.success) { toast.error(res.error); return }
    toast.success('Password updated')
    onChanged?.()
  }

  const type = show ? 'text' : 'password'
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-indigo-600" /> Change password</DialogTitle>
          <DialogDescription>
            {temporary
              ? 'Your account still uses its temporary password. Choose your own now.'
              : 'Enter your current password, then the new one twice.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {!temporary && (
            <div className="space-y-1.5">
              <Label htmlFor="pw-current" className="text-xs font-medium text-gray-700">Current password</Label>
              <Input id="pw-current" type={type} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="pw-new" className="text-xs font-medium text-gray-700">New password</Label>
            <div className="relative">
              <Input id="pw-new" type={type} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus={temporary} className="pr-10" required />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600" aria-label={show ? 'Hide passwords' : 'Show passwords'}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm" className="text-xs font-medium text-gray-700">Confirm new password</Label>
            <Input id="pw-confirm" type={type} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <ul className="space-y-0.5 text-[12px]">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? 'text-emerald-700' : 'text-gray-400'}>{c.ok ? '✓' : '•'} {c.label}</li>
            ))}
          </ul>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Update password'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
