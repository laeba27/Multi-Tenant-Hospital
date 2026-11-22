'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  FileText,
  LayoutList,
  Bookmark,
  BookmarkPlus,
  Edit2,
  Eye,
  Loader2,
  Lock,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  SectionBlock,
  emptyDraft,
  isFilledValue,
  presetToRows,
  rowsToPresetEntries,
  sectionPresetMatches,
} from '@/components/prescriptions/AppointmentCustomPrescriptionComposer'
import {
  addFieldOption,
  deletePrescriptionPreset,
  getMyPrescriptionPresets,
  savePrescriptionPreset,
} from '@/actions/prescriptions'

const isSavedTemplate = (t) =>
  typeof t?.id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id)

/**
 * The "Presets" tab of the doctor's Prescription Templates page: the doctor's
 * own saved prescriptions ("Common cold"), to load in the composer for the
 * next patient with the same problem. Only the doctor who made a preset can
 * see or use it.
 */
export function PrescriptionPresetsPanel({ templates = [] }) {
  const usableTemplates = useMemo(
    () => templates.filter((t) => isSavedTemplate(t) && (t.sections || []).length > 0),
    [templates]
  )

  const [presets, setPresets] = useState([])
  const [loading, setLoading] = useState(true)
  // null = list; { preset: null } = new; { preset } = editing
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    const res = await getMyPrescriptionPresets()
    if (res.success) setPresets(res.presets)
    else toast.error(res.error)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (editing) {
    return (
      <PresetEditor
        preset={editing.preset}
        templates={usableTemplates}
        onCancel={() => setEditing(null)}
        onSaved={() => { setEditing(null); load() }}
      />
    )
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    const res = await deletePrescriptionPreset(toDelete.id)
    setDeleting(false)
    if (!res.success) { toast.error(res.error); return }
    toast.success(res.message)
    setToDelete(null)
    load()
  }

  const canCreate = usableTemplates.length > 0

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-md p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-blue-600" />
            My presets
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5 flex items-start gap-1">
            <Lock className="w-3 h-3 mt-0.5 shrink-0" />
            <span>
              Personal to you. Other doctors can&apos;t see or use them. Load one while writing a
              prescription, then add or remove anything for that patient.
            </span>
          </p>
        </div>
        {canCreate && presets.length > 0 && (
          <Button
            onClick={() => setEditing({ preset: null })}
            size="sm"
            className="h-8 gap-1.5 text-[13px] font-semibold uppercase tracking-wide bg-blue-600 hover:bg-blue-700 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            New preset
          </Button>
        )}
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-md p-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : !canCreate ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-md p-8 text-center">
          <p className="text-[13px] text-slate-600">
            Save a prescription template with at least one section in the{' '}
            <span className="font-semibold">Customized</span> tab first. Presets are filled in on
            top of a template.
          </p>
        </div>
      ) : presets.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-md p-8 text-center space-y-3">
          <BookmarkPlus className="w-8 h-8 mx-auto text-blue-500" />
          <div>
            <h3 className="text-[14px] font-semibold text-slate-800">
              Would you like to create a preset for yourself?
            </h3>
            <p className="text-[13px] text-slate-500 mt-1 max-w-md mx-auto">
              Fill in a prescription you write often, like <span className="font-medium">Common cold</span>,
              once. Then load it for every patient with the same problem instead of typing it again.
            </p>
          </div>
          <Button
            onClick={() => setEditing({ preset: null })}
            size="sm"
            className="h-9 gap-1.5 text-[13px] font-semibold uppercase tracking-wide bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Create my first preset
          </Button>
        </div>
      ) : (
        [
          {
            key: 'full',
            title: 'Whole prescription',
            hint: 'Fill every section at once.',
            list: presets.filter((p) => p.scope !== 'section'),
          },
          {
            key: 'section',
            title: 'One section',
            hint: 'Add to just that section (e.g. Medications) while you write the rest yourself.',
            list: presets.filter((p) => p.scope === 'section'),
          },
        ]
          .filter((g) => g.list.length > 0)
          .map((g) => (
            <div key={g.key} className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-2 pt-1">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                  {g.title} <span className="text-slate-400">({g.list.length})</span>
                </h3>
                <span className="text-[12px] text-slate-400">{g.hint}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {g.list.map((p) => (
                  <PresetCard
                    key={p.id}
                    preset={p}
                    templates={templates}
                    onView={() => setViewing(p)}
                    onEdit={() => setEditing({ preset: p })}
                    onDelete={() => setToDelete(p)}
                  />
                ))}
              </div>
            </div>
          ))
      )}

      <PresetViewDialog
        preset={viewing}
        templates={templates}
        onClose={() => setViewing(null)}
        onEdit={() => { const p = viewing; setViewing(null); setEditing({ preset: p }) }}
      />

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{toDelete?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Prescriptions already issued from this preset are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete() }}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** What a preset holds, per section: "Medicines (3)". */
function presetSummary(preset, templates) {
  const template = templates.find((t) => t.id === preset.templateId)
  const sectionName = (entry) => {
    const s = (template?.sections || []).find(
      (x) => x.id === entry.sectionId || (entry.sectionKey && x.key === entry.sectionKey)
    )
    return s?.name || entry.sectionName || entry.sectionKey || 'Section'
  }
  const bySection = new Map()
  for (const e of preset.entries || []) {
    const name = sectionName(e)
    const rows = (e.value || []).filter(isFilledValue).length
    bySection.set(name, Math.max(bySection.get(name) || 0, rows))
  }
  return { template, sections: [...bySection.entries()] }
}

function PresetCard({ preset, templates, onView, onEdit, onDelete }) {
  const { template, sections } = presetSummary(preset, templates)
  const updated = preset.updatedAt
    ? new Date(preset.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onView() } }}
      title={`View ${preset.name}`}
      className="bg-white border border-slate-200 rounded-md hover:border-blue-300 hover:shadow-sm transition cursor-pointer flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="px-3 py-2.5 flex items-start justify-between gap-2 border-b border-slate-100">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-slate-900 wrap-anywhere">
            {preset.name}
            <span
              className={cn(
                'ml-2 align-middle inline-flex items-center rounded px-1.5 h-5 text-[10px] font-semibold uppercase tracking-wide',
                preset.scope === 'section'
                  ? 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200'
                  : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
              )}
            >
              {preset.scope === 'section' ? `${preset.section?.name || 'Section'} only` : 'Whole'}
            </span>
          </h3>
          {preset.description && (
            <p className="text-[12px] text-slate-500 wrap-anywhere">{preset.description}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onView}
            title="View preset"
            aria-label={`View ${preset.name}`}
            className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-500 hover:text-blue-700 hover:bg-blue-50"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            title="Edit preset"
            aria-label={`Edit ${preset.name}`}
            className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-500 hover:text-blue-700 hover:bg-blue-50"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete preset"
            aria-label={`Delete ${preset.name}`}
            className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="px-3 py-2 flex flex-wrap gap-1.5 flex-1">
        {sections.map(([name, count]) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[12px] text-slate-700"
          >
            <span className="font-medium uppercase tracking-tight">{name}</span>
            <span className="text-slate-400">{count}</span>
          </span>
        ))}
      </div>
      <div className="px-3 py-1.5 border-t border-slate-100 text-[11px] text-slate-400 flex flex-wrap gap-x-2">
        <span>{template ? template.name : 'Template since changed'}</span>
        {updated && <span>· Updated {updated}</span>}
      </div>
    </div>
  )
}

/**
 * A preset's contents, section by section, laid out the way the prescription
 * will be: one table per section, one row per entry (e.g. per medicine).
 * Entries are stored per field as a column of values, so row i is value[i] of
 * every field in that section.
 */
function presetDetails(preset, templates) {
  const template = templates.find((t) => t.id === preset.templateId)
  const sections = new Map()
  for (const e of preset.entries || []) {
    const tSection = (template?.sections || []).find(
      (x) => x.id === e.sectionId || (e.sectionKey && x.key === e.sectionKey)
    )
    const sKey = tSection?.id || e.sectionId || e.sectionKey || e.sectionName
    if (!sections.has(sKey)) {
      sections.set(sKey, {
        key: sKey,
        name: tSection?.name || e.sectionName || e.sectionKey || 'Section',
        order: tSection ? template.sections.indexOf(tSection) : 999,
        tSection,
        fields: [],
      })
    }
    const tField = (tSection?.fields || []).find(
      (f) => f.id === e.fieldId || (e.fieldKey && f.key === e.fieldKey)
    )
    sections.get(sKey).fields.push({
      label: tField?.label || e.fieldLabel || e.fieldKey || 'Field',
      order: tField ? tSection.fields.indexOf(tField) : 999,
      values: Array.isArray(e.value) ? e.value : [e.value],
    })
  }
  return [...sections.values()]
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      const fields = [...s.fields].sort((a, b) => a.order - b.order)
      const rowCount = Math.max(0, ...fields.map((f) => f.values.length))
      const rows = Array.from({ length: rowCount }, (_, i) => fields.map((f) => f.values[i]))
        .filter((r) => r.some(isFilledValue))
      return { key: s.key, name: s.name, fields, rows }
    })
    .filter((s) => s.rows.length > 0)
}

const displayValue = (v) =>
  !isFilledValue(v) ? '—' : Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)

function PresetViewDialog({ preset, templates, onClose, onEdit }) {
  const sections = preset ? presetDetails(preset, templates) : []
  const template = preset ? templates.find((t) => t.id === preset.templateId) : null
  const updated = preset?.updatedAt
    ? new Date(preset.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <Dialog open={Boolean(preset)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-left">
            <Bookmark className="w-4 h-4 text-blue-600" />
            <span className="wrap-anywhere">{preset?.name}</span>
            <span
              className={cn(
                'inline-flex items-center rounded px-1.5 h-5 text-[10px] font-semibold uppercase tracking-wide',
                preset?.scope === 'section'
                  ? 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200'
                  : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
              )}
            >
              {preset?.scope === 'section' ? `${preset?.section?.name || 'Section'} only` : 'Whole prescription'}
            </span>
          </DialogTitle>
          <DialogDescription className="text-left">
            {preset?.description ? <span className="block text-slate-700">{preset.description}</span> : null}
            <span className="block text-[12px] text-slate-400">
              {template ? `Template: ${template.name}` : 'Its template has since changed'}
              {updated ? ` · Updated ${updated}` : ''}
            </span>
          </DialogDescription>
        </DialogHeader>

        {sections.length === 0 ? (
          <p className="text-[13px] text-slate-500 py-4 text-center">This preset has nothing filled in.</p>
        ) : (
          <div className="space-y-4">
            {sections.map((s) => (
              <div key={s.key} className="space-y-1.5">
                <h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                  {s.name} <span className="text-slate-400">({s.rows.length})</span>
                </h4>
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full text-[13px]">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-2.5 py-1.5 text-left font-semibold w-8">#</th>
                        {s.fields.map((f, i) => (
                          <th key={i} className="px-2.5 py-1.5 text-left font-semibold whitespace-nowrap">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {s.rows.map((row, r) => (
                        <tr key={r}>
                          <td className="px-2.5 py-1.5 text-slate-400">{r + 1}</td>
                          {row.map((v, c) => (
                            <td key={c} className="px-2.5 py-1.5 text-slate-800 wrap-anywhere">{displayValue(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="h-9">Close</Button>
          <Button onClick={onEdit} className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Edit2 className="w-3.5 h-3.5" />
            Edit preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PresetEditor({ preset, templates, onCancel, onSaved }) {
  const isNew = !preset
  const [name, setName] = useState(preset?.name || '')
  const [description, setDescription] = useState(preset?.description || '')
  const [template, setTemplate] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [rows, setRows] = useState({})
  const [expanded, setExpanded] = useState({})
  const [saving, setSaving] = useState(false)
  // 'full' = whole prescription; 'section' = only `sectionId` (e.g. Medications)
  const [scope, setScope] = useState(preset?.scope === 'section' ? 'section' : 'full')
  const [sectionId, setSectionId] = useState(null)

  const open = (tpl, seedRows = null) => {
    const d = {}
    const r = {}
    const e = {}
    ;(tpl.sections || []).forEach((s) => {
      d[s.id] = emptyDraft(s)
      r[s.id] = Array.isArray(seedRows?.[s.id]) ? seedRows[s.id] : []
      e[s.id] = true
    })
    setTemplate(tpl)
    setDrafts(d)
    setRows(r)
    setExpanded(e)
  }

  useEffect(() => {
    // An existing preset opens on its own template if it still exists;
    // otherwise on the first one, matched by section and field keys.
    const start =
      (preset && templates.find((t) => t.id === preset.templateId)) ||
      (preset?.scope === 'section' &&
        templates.find((t) => (t.sections || []).some((s) => sectionPresetMatches(preset, s)))) ||
      templates[0]
    if (!start) return
    const seeded = preset ? presetToRows(preset, start) : null
    open(start, seeded?.seedRows || null)
    setSectionId(seeded?.section?.id || start.sections?.[0]?.id || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rowsWithDrafts = () => {
    const out = {}
    ;(template?.sections || []).forEach((s) => {
      const draft = drafts[s.id] || {}
      const filled = (s.fields || []).some((f) => isFilledValue(draft[f.id]))
      out[s.id] = filled ? [...(rows[s.id] || []), draft] : rows[s.id] || []
    })
    return out
  }

  const switchTemplate = (id) => {
    const next = templates.find((t) => t.id === id)
    if (!next || next.id === template?.id) return
    const hasData = Object.values(rowsWithDrafts()).some((l) => l.length > 0)
    if (hasData) {
      // Carry over what matches the other template's fields.
      const carried = presetToRows({ entries: rowsToPresetEntries(template, rowsWithDrafts()) }, next)
      open(next, carried.seedRows)
    } else {
      open(next)
    }
    // Keep the same section if the other template has one of that name.
    const current = template?.sections?.find((x) => x.id === sectionId)
    const same = current && next.sections.find((x) => x.name.trim().toLowerCase() === current.name.trim().toLowerCase())
    setSectionId(same?.id || next.sections?.[0]?.id || null)
  }

  const currentSection =
    scope === 'section' ? (template?.sections || []).find((x) => x.id === sectionId) || null : null
  const visibleSections =
    scope === 'section' ? (currentSection ? [currentSection] : []) : template?.sections || []

  const setDraft = (sectionId, fieldId, value) =>
    setDrafts((prev) => ({ ...prev, [sectionId]: { ...prev[sectionId], [fieldId]: value } }))

  const toggleMulti = (sectionId, fieldId, option) =>
    setDrafts((prev) => {
      const current = prev[sectionId]?.[fieldId] || []
      const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option]
      return { ...prev, [sectionId]: { ...prev[sectionId], [fieldId]: next } }
    })

  const addOption = async (sectionId, fieldId, option) => {
    const value = (option || '').trim()
    if (!value) return
    setTemplate((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              fields: s.fields.map((f) => {
                if (f.id !== fieldId) return f
                const opts = f.dropdownOptions || []
                return opts.some((o) => o.toLowerCase() === value.toLowerCase())
                  ? f
                  : { ...f, dropdownOptions: [...opts, value] }
              }),
            }
      ),
    }))
    const res = await addFieldOption(fieldId, value).catch(() => null)
    if (!res?.success) toast.error(res?.error || 'Could not save option to template')
  }

  const addRow = (section) => {
    const draft = drafts[section.id] || {}
    if (!(section.fields || []).some((f) => isFilledValue(draft[f.id]))) {
      toast.error('Fill at least one field before adding')
      return
    }
    const missing = (section.fields || [])
      .filter((f) => f.required && !isFilledValue(draft[f.id]))
      .map((f) => f.label)
    if (missing.length) {
      toast.error(`Required: ${missing.join(', ')}`)
      return
    }
    setRows((prev) => ({ ...prev, [section.id]: [...(prev[section.id] || []), draft] }))
    setDrafts((prev) => ({ ...prev, [section.id]: emptyDraft(section) }))
  }

  const removeRow = (sectionId, idx) =>
    setRows((prev) => ({ ...prev, [sectionId]: (prev[sectionId] || []).filter((_, i) => i !== idx) }))

  const renderCellValue = (v) => (Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v))

  const save = async () => {
    if (name.trim().length < 2) {
      toast.error('Give the preset a name, e.g. Common cold.')
      return
    }
    if (scope === 'section' && !currentSection) {
      toast.error('Choose the section this preset is for.')
      return
    }
    const entries = rowsToPresetEntries(template, rowsWithDrafts(), currentSection?.id || null)
    if (entries.length === 0) {
      toast.error(
        currentSection
          ? `Add at least one entry to ${currentSection.name} before saving.`
          : 'Fill in at least one section before saving.'
      )
      return
    }
    setSaving(true)
    const res = await savePrescriptionPreset({
      name,
      description,
      templateId: template.id,
      templateVersionId: template.version_id || null,
      entries,
      presetId: preset?.id || null,
      section: currentSection
        ? { id: currentSection.id, key: currentSection.key || '', name: currentSection.name }
        : null,
    })
    setSaving(false)
    if (!res.success) { toast.error(res.error); return }
    toast.success(res.message)
    onSaved()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 gap-1.5 text-[13px] text-slate-600 -ml-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          My presets
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-3 space-y-3">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-700">
            {isNew ? 'New preset' : `Edit "${preset.name}"`}
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Only you will see this preset.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="preset-name" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Preset name *
            </Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Common cold"
              autoFocus={isNew}
              className="mt-1 h-9 text-[14px] border-slate-200"
            />
          </div>
          <div>
            <Label htmlFor="preset-note" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Note
            </Label>
            <Input
              id="preset-note"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional, e.g. Adults, no fever"
              className="mt-1 h-9 text-[14px] border-slate-200"
            />
          </div>
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Template
            </Label>
            <Select value={template?.id || ''} onValueChange={switchTemplate} disabled={templates.length < 2}>
              <SelectTrigger className="mt-1 h-9 text-[14px] border-slate-200">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-[13px]">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            This preset fills
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                value: 'full',
                icon: FileText,
                title: 'Whole prescription',
                hint: 'Every section at once, e.g. a full Common cold prescription.',
              },
              {
                value: 'section',
                icon: LayoutList,
                title: 'One section',
                hint: 'Just one part, e.g. only Medications. You write the rest yourself.',
              },
            ].map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setScope(o.value)}
                className={cn(
                  'rounded-md border px-3 py-2 text-left transition-colors flex gap-2',
                  scope === o.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <o.icon className={cn('w-4 h-4 mt-0.5 shrink-0', scope === o.value ? 'text-blue-600' : 'text-slate-400')} />
                <span>
                  <span className={cn('block text-[13px] font-semibold', scope === o.value ? 'text-blue-700' : 'text-slate-800')}>
                    {o.title}
                  </span>
                  <span className="block text-[12px] text-slate-500">{o.hint}</span>
                </span>
              </button>
            ))}
          </div>
          {scope === 'section' && template && (
            <div className="sm:max-w-xs">
              <Select value={sectionId || ''} onValueChange={setSectionId}>
                <SelectTrigger className="h-9 text-[14px] border-slate-200">
                  <SelectValue placeholder="Choose a section" />
                </SelectTrigger>
                <SelectContent>
                  {(template.sections || []).map((x) => (
                    <SelectItem key={x.id} value={x.id} className="text-[13px]">
                      {x.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {template && (
        <div className="space-y-3">
          {visibleSections.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              draft={drafts[section.id] || {}}
              rows={rows[section.id] || []}
              expanded={!!expanded[section.id]}
              onToggle={() => setExpanded((p) => ({ ...p, [section.id]: !p[section.id] }))}
              onDraftChange={(fieldId, v) => setDraft(section.id, fieldId, v)}
              onMultiSelectToggle={(fieldId, opt) => toggleMulti(section.id, fieldId, opt)}
              onAddOption={(fieldId, opt) => addOption(section.id, fieldId, opt)}
              onAdd={() => addRow(section)}
              onRemoveRow={(idx) => removeRow(section.id, idx)}
              renderCellValue={renderCellValue}
            />
          ))}
        </div>
      )}

      <div className="sticky bottom-3 z-10">
        <div className="bg-white border border-slate-200 rounded-md shadow-sm flex gap-2 p-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="h-10 px-4 text-[13px] font-semibold uppercase tracking-wide"
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving || !template}
            className="flex-1 h-10 gap-1.5 text-[13px] font-semibold uppercase tracking-wide bg-blue-600 hover:bg-blue-700"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? 'Save preset' : 'Update preset'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PrescriptionPresetsPanel
