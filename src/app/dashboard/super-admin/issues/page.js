'use client'

import { useEffect, useMemo, useState } from 'react'
import { TriangleAlert, Search, Building2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getAllIssues, updateIssue } from '@/actions/issues'

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
const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

function fmt(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return d }
}

export default function SuperAdminIssuesPage() {
  const [loading, setLoading] = useState(true)
  const [issues, setIssues] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [response, setResponse] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const data = await getAllIssues()
    setIssues(data)
    setSelectedId((prev) => prev || data[0]?.id || null)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return i.title.toLowerCase().includes(q) || (i.hospital_name || '').toLowerCase().includes(q)
    })
  }, [issues, query, statusFilter])

  const selected = issues.find((i) => i.id === selectedId) || null

  useEffect(() => { setResponse(selected?.admin_response || '') }, [selectedId]) // eslint-disable-line

  const changeStatus = async (status) => {
    if (!selected) return
    setSaving(true)
    const r = await updateIssue(selected.id, { status })
    r.success ? toast.success('Status updated') : toast.error(r.error || 'Failed')
    await load(); setSaving(false)
  }
  const saveResponse = async () => {
    if (!selected) return
    setSaving(true)
    const r = await updateIssue(selected.id, { response })
    r.success ? toast.success('Response saved') : toast.error(r.error || 'Failed')
    await load(); setSaving(false)
  }

  const counts = useMemo(() => ({
    open: issues.filter((i) => i.status === 'open').length,
    in_progress: issues.filter((i) => i.status === 'in_progress').length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
  }), [issues])

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TriangleAlert className="h-6 w-6 text-indigo-600" /> Issues
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {counts.open} open · {counts.in_progress} in progress · {counts.resolved} resolved
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
          {/* List */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search issue or hospital…" className="pl-8 h-9 text-[13px]" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-y-auto max-h-[560px]">
              {loading ? <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
                : filtered.length === 0 ? <p className="p-8 text-center text-sm text-gray-400">No issues.</p>
                : filtered.map((i) => {
                  const active = i.id === selectedId
                  return (
                    <button key={i.id} onClick={() => setSelectedId(i.id)}
                      className={cn('w-full text-left px-3 py-2.5 border-b border-gray-50', active ? 'bg-indigo-50' : 'hover:bg-slate-50')}>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded', PRIORITY[i.priority])}>{i.priority}</span>
                        <p className="text-[13px] font-semibold text-gray-900 truncate flex-1">{i.title}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-gray-500 inline-flex items-center gap-1 truncate"><Building2 className="h-3 w-3" />{i.hospital_name}</span>
                        <Badge className={cn('text-[9px] uppercase border ml-auto', STATUS[i.status])}>{i.status.replace('_', ' ')}</Badge>
                      </div>
                    </button>
                  )
                })}
            </div>
          </div>

          {/* Detail */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[400px]">
            {!selected ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Select an issue.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selected.title}</h2>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      {selected.hospital_name} · by {selected.raiser_name} · {fmt(selected.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded', PRIORITY[selected.priority])}>{selected.priority}</span>
                    <Badge variant="outline" className="capitalize">{selected.category.replace('_', ' ')}</Badge>
                  </div>
                </div>

                {selected.description && (
                  <p className="text-[14px] text-gray-700 whitespace-pre-line bg-slate-50 rounded-lg p-3 border border-gray-100">{selected.description}</p>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Status:</span>
                  <Select value={selected.status} onValueChange={changeStatus} disabled={saving}>
                    <SelectTrigger className="h-8 w-44 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Response to hospital</p>
                  <Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={4} placeholder="Write a response…" className="text-[14px]" />
                  <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={saveResponse} disabled={saving}>{saving ? 'Saving…' : 'Save Response'}</Button>
                  </div>
                  {selected.responded_at && <p className="text-[11px] text-gray-400 mt-1">Last responded {fmt(selected.responded_at)}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
