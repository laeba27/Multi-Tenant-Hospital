'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Megaphone, Pin, Plus, Trash2, Pencil, Users, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  createNotice,
  updateNotice,
  deleteNotice,
  getHospitalNoticesForAdmin,
} from '@/actions/notices'
import {
  AUDIENCE_OPTIONS,
  CATEGORY_OPTIONS,
  AUDIENCE_LABEL,
  WILDCARD_AUDIENCES,
} from '@/lib/notices/options'

const CATEGORY_STYLE = {
  urgent: 'bg-rose-100 text-rose-800',
  health_alert: 'bg-rose-100 text-rose-800',
  closure: 'bg-amber-100 text-amber-800',
  advisory: 'bg-amber-100 text-amber-800',
  schedule: 'bg-blue-100 text-blue-800',
  policy: 'bg-purple-100 text-purple-800',
  event: 'bg-emerald-100 text-emerald-800',
  general: 'bg-gray-100 text-gray-700',
}

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const EMPTY = {
  title: '',
  body: '',
  category: 'general',
  audienceRoles: ['all'],
  isPinned: false,
  expiresAt: '',
}

export default function QuickUpdatesManager({ hospitalId }) {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    if (!hospitalId) return
    setLoading(true)
    const res = await getHospitalNoticesForAdmin(hospitalId)
    if (res.success) setNotices(res.notices)
    else toast.error(res.error || 'Could not load updates')
    setLoading(false)
  }, [hospitalId])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (n) => {
    setForm({
      title: n.title || '',
      body: n.body || '',
      category: n.category || 'general',
      audienceRoles: n.audience_roles?.length ? n.audience_roles : ['all'],
      isPinned: Boolean(n.is_pinned),
      expiresAt: n.expires_at ? n.expires_at.slice(0, 10) : '',
    })
    setEditingId(n.id)
    setShowForm(true)
  }

  // 'Everyone' and 'All staff' are wildcards -- ticking one clears the named
  // roles, and ticking a named role clears the wildcard. Otherwise the author
  // believes they narrowed the audience when they didn't.
  const toggleAudience = (value) => {
    setForm((prev) => {
      const current = prev.audienceRoles
      if (WILDCARD_AUDIENCES.includes(value)) {
        return { ...prev, audienceRoles: current.includes(value) ? [] : [value] }
      }
      const withoutWildcards = current.filter((r) => !WILDCARD_AUDIENCES.includes(r))
      const next = withoutWildcards.includes(value)
        ? withoutWildcards.filter((r) => r !== value)
        : [...withoutWildcards, value]
      return { ...prev, audienceRoles: next }
    })
  }

  const audienceSummary = useMemo(() => {
    if (form.audienceRoles.length === 0) return 'No one yet — pick an audience'
    if (form.audienceRoles.includes('all')) return 'Everyone: all patients and all staff'
    if (form.audienceRoles.includes('staff')) return 'All staff (patients will not see this)'
    return form.audienceRoles.map((r) => AUDIENCE_LABEL[r] || r).join(', ')
  }, [form.audienceRoles])

  const submit = async (e) => {
    e.preventDefault()
    if (form.audienceRoles.length === 0) {
      toast.error('Choose at least one audience.')
      return
    }
    setSaving(true)
    const payload = {
      title: form.title,
      body: form.body,
      category: form.category,
      audienceRoles: form.audienceRoles,
      isPinned: form.isPinned,
      expiresAt: form.expiresAt || null,
    }
    const res = editingId
      ? await updateNotice(editingId, payload)
      : await createNotice({ ...payload, hospitalId })
    setSaving(false)

    if (!res.success) {
      toast.error(res.error || 'Could not save that update')
      return
    }
    toast.success(editingId ? 'Update saved' : 'Update posted')
    setShowForm(false)
    setForm(EMPTY)
    setEditingId(null)
    load()
  }

  const doDelete = async () => {
    if (!confirmDelete) return
    const res = await deleteNotice(confirmDelete.id)
    if (!res.success) toast.error(res.error || 'Could not delete')
    else {
      toast.success('Update deleted')
      load()
    }
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quick Updates</h1>
          <p className="text-gray-600 mt-2">
            Post announcements to your patients and staff. Choose exactly who sees each one.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Update
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Posted Updates</CardTitle>
          <CardDescription>
            {loading ? 'Loading…' : `${notices.length} update${notices.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
          ) : notices.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No updates posted yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Post one and it appears in the Quick Updates feed of everyone you choose.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notices.map((n) => {
                const expired = n.expires_at && new Date(n.expires_at) < new Date()
                return (
                  <div
                    key={n.id}
                    className={`rounded-lg border p-4 ${expired ? 'border-gray-100 bg-gray-50 opacity-70' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {n.is_pinned && <Pin className="h-3.5 w-3.5 text-indigo-600" />}
                          <p className="font-semibold text-gray-900">{n.title}</p>
                          <Badge className={CATEGORY_STYLE[n.category] || CATEGORY_STYLE.general}>
                            {n.category.replace('_', ' ')}
                          </Badge>
                          {expired && <Badge variant="outline">Expired</Badge>}
                        </div>

                        {n.body && (
                          <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-wrap">{n.body}</p>
                        )}

                        <div className="flex items-center gap-3 mt-3 flex-wrap text-xs text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {(n.audience_roles || []).map((r) => AUDIENCE_LABEL[r] || r).join(', ')}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Posted {fmt(n.published_at)}
                          </span>
                          {n.expires_at && <span>Expires {fmt(n.expires_at)}</span>}
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(n)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => setConfirmDelete(n)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / edit */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Update' : 'New Update'}</DialogTitle>
            <DialogDescription>
              This appears in the Quick Updates feed of everyone in the audience you choose.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-5 mt-2">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. OPD closed on Saturday"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Add the details…"
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger id="category" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expiresAt">Expires on</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank to keep it up.</p>
              </div>
            </div>

            {/* Audience */}
            <div>
              <Label>Who can see this? *</Label>
              <div className="mt-2 rounded-lg border border-gray-200 p-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_OPTIONS.filter((o) => ['all', 'staff', 'patient'].includes(o.value)).map(
                    (o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => toggleAudience(o.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                          form.audienceRoles.includes(o.value)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        {o.label}
                      </button>
                    )
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    …or pick specific staff roles
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {AUDIENCE_OPTIONS.filter(
                      (o) => !['all', 'staff', 'patient'].includes(o.value)
                    ).map((o) => {
                      const disabled = form.audienceRoles.some((r) => WILDCARD_AUDIENCES.includes(r))
                      return (
                        <button
                          key={o.value}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleAudience(o.value)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                            disabled
                              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                              : form.audienceRoles.includes(o.value)
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                          }`}
                        >
                          {o.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <p className="text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-1.5">
                  {audienceSummary}
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPinned}
                onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                className="h-4 w-4"
              />
              Pin to the top of the feed
            </label>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Post Update'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this update?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{confirmDelete?.title}&rdquo; will be removed from everyone&apos;s feed. This
            cannot be undone.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-rose-600 hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
