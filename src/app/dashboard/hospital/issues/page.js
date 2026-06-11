'use client'

import { useEffect, useState } from 'react'
import { TriangleAlert, Plus, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createIssue, getHospitalIssues } from '@/actions/issues'

const STATUS = {
  open: 'bg-amber-100 text-amber-800 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
}
const PRIORITY = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-sky-100 text-sky-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-rose-100 text-rose-700',
}
const CATEGORIES = ['general', 'technical', 'billing', 'access', 'feature_request', 'other']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']

function fmt(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return d }
}

export default function HospitalIssuesPage() {
  const [loading, setLoading] = useState(true)
  const [issues, setIssues] = useState([])
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    setIssues(await getHospitalIssues())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TriangleAlert className="h-6 w-6 text-indigo-600" /> Issues
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Raise issues to the portal super admin and track responses.</p>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Raise Issue</Button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : issues.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400">
            No issues raised yet. Click <span className="font-semibold text-indigo-600">Raise Issue</span> to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((i) => (
              <div key={i.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded', PRIORITY[i.priority])}>{i.priority}</span>
                      <h3 className="text-[15px] font-semibold text-gray-900">{i.title}</h3>
                      <Badge variant="outline" className="capitalize text-[11px]">{i.category.replace('_', ' ')}</Badge>
                    </div>
                    {i.description && <p className="text-[13px] text-gray-600 mt-1.5 whitespace-pre-line">{i.description}</p>}
                  </div>
                  <Badge className={cn('border capitalize shrink-0', STATUS[i.status])}>{i.status.replace('_', ' ')}</Badge>
                </div>

                {i.admin_response && (
                  <div className="mt-3 pt-3 border-t border-gray-100 bg-indigo-50/40 rounded-lg p-3">
                    <p className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1 mb-1"><MessageSquare className="h-3.5 w-3.5" /> Super admin response</p>
                    <p className="text-[13px] text-gray-700 whitespace-pre-line">{i.admin_response}</p>
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-2">Raised {fmt(i.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <RaiseIssueDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
    </DashboardLayout>
  )
}

function RaiseIssueDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'general', priority: 'medium' })
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await createIssue(form)
    setSaving(false)
    if (!res.success) { toast.error(res.error || 'Failed'); return }
    toast.success('Issue raised')
    onClose()
    setForm({ title: '', description: '', category: 'general', priority: 'medium' })
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Raise an Issue</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="Short summary" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={4} placeholder="Describe the issue…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger className="h-9 text-[13px] capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger className="h-9 text-[13px] capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit Issue'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
