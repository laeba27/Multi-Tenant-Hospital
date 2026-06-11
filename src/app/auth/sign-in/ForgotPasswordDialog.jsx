'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

/**
 * Forgot-password dialog. Sends a registration number to /api/auth/forgot-password,
 * which emails our own JWT reset link (no Supabase email reset).
 */
export function ForgotPasswordDialog({ open, onClose }) {
  const [registrationNo, setRegistrationNo] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const close = () => {
    setRegistrationNo('')
    setSent(false)
    onClose()
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!registrationNo.trim()) {
      toast.error('Enter your registration number')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNo: registrationNo.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Something went wrong')
        return
      }
      setSent(true)
    } catch (err) {
      console.error(err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forgot Password</DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="py-4 text-center">
            <MailCheck className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <p className="text-sm text-gray-700">
              If an account exists for that registration number, we&apos;ve emailed a
              password reset link. It is valid for 1 hour.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Check your inbox (and spam folder) for the email.
            </p>
            <Button onClick={close} className="mt-4 w-full">Done</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your registration number and we&apos;ll email you a secure link to
              reset your password.
            </p>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Registration Number</Label>
              <Input
                value={registrationNo}
                onChange={(e) => setRegistrationNo(e.target.value)}
                placeholder="e.g. HOSP00001"
                disabled={sending}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={sending}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending} className="flex items-center gap-2">
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                {sending ? 'Sending…' : 'Send Reset Link'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
