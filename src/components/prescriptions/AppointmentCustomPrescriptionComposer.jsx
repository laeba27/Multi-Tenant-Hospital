'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { ChevronDown, ChevronUp, Plus, Trash2, Save, FileText, Eye, Printer, X, Check, Download, Share2, Mail, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPrescriptionFromAppointment, addFieldOption } from '@/actions/prescriptions'

const emptyDraft = (section) => {
  const draft = {}
  ;(section.fields || []).forEach((field) => {
    draft[field.id] = field.type === 'multi_select' ? [] : ''
  })
  return draft
}

export function AppointmentCustomPrescriptionComposer({
  appointment,
  patient,
  patientId,
  appointmentId,
  doctor,
  hospital,
  dbTemplates = [],
  hasExistingPrescription = false,
  existingRows = null,
  existingTemplateId = null,
  onSubmit,
  isLoading = false,
}) {
  const [templates] = useState(dbTemplates)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  // drafts: { [sectionId]: { [fieldId]: value } } — the live input row
  const [drafts, setDrafts] = useState({})
  // rows: { [sectionId]: [ { [fieldId]: value }, ... ] } — committed rows
  const [rows, setRows] = useState({})
  const [expandedSections, setExpandedSections] = useState({})
  const [showPreview, setShowPreview] = useState(false)
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (dbTemplates.length > 0) {
      // Prefer the template the existing prescription used (for updates).
      const startTemplate =
        (existingTemplateId && dbTemplates.find((t) => t.id === existingTemplateId)) ||
        dbTemplates[0]
      initializeTemplate(startTemplate, existingRows)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initializeTemplate = (template, seedRows = null) => {
    setSelectedTemplate(template)

    const initialDrafts = {}
    const initialRows = {}
    const expanded = {}

    if (template.sections) {
      template.sections.forEach((section) => {
        expanded[section.id] = true
        initialDrafts[section.id] = emptyDraft(section)
        // Pre-fill committed rows from the existing prescription, if provided.
        const seeded = seedRows?.[section.id]
        initialRows[section.id] = Array.isArray(seeded) ? seeded.filter(Boolean) : []
      })
    }

    setDrafts(initialDrafts)
    setRows(initialRows)
    setExpandedSections(expanded)
  }

  const handleDraftChange = (sectionId, fieldId, value) => {
    setDrafts((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [fieldId]: value },
    }))
  }

  // Persist a newly typed option back into the template field's option list,
  // and reflect it immediately in the on-screen template.
  const handleAddOption = async (sectionId, fieldId, option) => {
    const value = (option || '').trim()
    if (!value) return

    // Optimistically add to the local template so it shows up right away.
    setSelectedTemplate((prev) => {
      if (!prev) return prev
      return {
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
      }
    })

    try {
      const res = await addFieldOption(fieldId, value)
      if (!res?.success) {
        toast.error(res?.error || 'Could not save option to template')
      } else if (!res.alreadyExisted) {
        toast.success(`Added "${value}" to options`)
      }
    } catch (err) {
      console.error('addFieldOption failed:', err)
      toast.error('Could not save option to template')
    }
  }

  const handleMultiSelectToggle = (sectionId, fieldId, option) => {
    setDrafts((prev) => {
      const current = prev[sectionId]?.[fieldId] || []
      const exists = current.includes(option)
      return {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [fieldId]: exists ? current.filter((v) => v !== option) : [...current, option],
        },
      }
    })
  }

  const isFilled = (v) =>
    v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== '')

  const addRow = (section) => {
    const draft = drafts[section.id] || {}
    const anyFilled = (section.fields || []).some((f) => isFilled(draft[f.id]))
    if (!anyFilled) {
      toast.error('Fill at least one field before adding')
      return
    }

    const missingRequired = (section.fields || [])
      .filter((f) => f.required && !isFilled(draft[f.id]))
      .map((f) => f.label)
    if (missingRequired.length > 0) {
      toast.error(`Required: ${missingRequired.join(', ')}`)
      return
    }

    setRows((prev) => ({
      ...prev,
      [section.id]: [...(prev[section.id] || []), draft],
    }))
    setDrafts((prev) => ({ ...prev, [section.id]: emptyDraft(section) }))
  }

  const removeRow = (sectionId, rowIndex) => {
    setRows((prev) => {
      const next = [...(prev[sectionId] || [])]
      next.splice(rowIndex, 1)
      return { ...prev, [sectionId]: next }
    })
  }

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const renderCellValue = (value) => {
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
  }

  const handleSaveDraft = () => {
    const draftKey = `prescription-draft:${appointmentId}`
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        templateId: selectedTemplate?.id,
        drafts,
        rows,
        updatedAt: new Date().toISOString(),
      })
    )
    toast.success('Draft saved')
  }

  const handleSubmit = (confirmed = false) => {
    if (!selectedTemplate) {
      toast.error('Please select a template')
      return
    }

    // If a prescription already exists for this appointment, confirm first that
    // the doctor intends to UPDATE it (rather than silently overwriting).
    if (hasExistingPrescription && !confirmed) {
      setShowUpdateConfirm(true)
      return
    }

    // Auto-commit any pending draft rows that have values
    const finalRows = { ...rows }
    ;(selectedTemplate.sections || []).forEach((section) => {
      const draft = drafts[section.id] || {}
      const anyFilled = (section.fields || []).some((f) => isFilled(draft[f.id]))
      if (anyFilled) {
        const missing = (section.fields || [])
          .filter((f) => f.required && !isFilled(draft[f.id]))
          .map((f) => f.label)
        if (missing.length > 0) {
          toast.error(`${section.name}: required ${missing.join(', ')}`)
          throw new Error('validation')
        }
        finalRows[section.id] = [...(finalRows[section.id] || []), draft]
      }
    })

    const prescriptionValues = (selectedTemplate.sections || []).flatMap((section) => {
      const sectionRows = finalRows[section.id] || []
      if (sectionRows.length === 0) return []

      return (section.fields || [])
        .map((field) => {
          const columnValues = sectionRows.map((row) => row[field.id])
          if (!columnValues.some(isFilled)) return null

          const rendered = columnValues
            .map((v) => (isFilled(v) ? withUnit(renderCellValue(v), field) : '—'))
            .join(' | ')

          return {
            field_id: field.id,
            section_key: section.id,
            field_key: field.id,
            label: field.label,
            value: columnValues,
            rendered_value: rendered,
          }
        })
        .filter(Boolean)
    })

    const clinicalSummaryParts = []
    if (appointment?.reason) clinicalSummaryParts.push(`Complaint: ${appointment.reason}`)

    ;(selectedTemplate.sections || []).forEach((section) => {
      const sectionRows = finalRows[section.id] || []
      if (sectionRows.length === 0) return

      const lines = sectionRows.map((row) =>
        (section.fields || [])
          .map((f) =>
            isFilled(row[f.id]) ? `${f.label}: ${withUnit(renderCellValue(row[f.id]), f)}` : null
          )
          .filter(Boolean)
          .join(', ')
      )
      clinicalSummaryParts.push(`${section.name}:\n  - ${lines.join('\n  - ')}`)
    })

    const clinicalSummary = clinicalSummaryParts.join('\n')

    // Find a follow-up date anywhere in the template (field key/label or type 'date').
    let followUpDate = ''
    ;(selectedTemplate.sections || []).forEach((section) => {
      const dateField = (section.fields || []).find(
        (f) =>
          f.type === 'date' ||
          /follow.?up/i.test(f.key || '') ||
          /follow.?up/i.test(f.label || '')
      )
      if (!dateField) return
      const firstRow = (finalRows[section.id] || [])[0] || {}
      const v = firstRow[dateField.id]
      if (isFilled(v)) followUpDate = Array.isArray(v) ? v[0] : v
    })

    startTransition(async () => {
      try {
        const result = await createPrescriptionFromAppointment({
          appointmentId,
          patientId,
          templateId: selectedTemplate.id,
          templateVersionId: selectedTemplate.versionId || selectedTemplate.version_id || null,
          prescriptionValues,
          clinicalSummary,
          followUpDate: followUpDate || null,
          status: 'issued',
        })

        toast.success(
          result?.wasUpdate
            ? 'Prescription updated successfully'
            : 'Prescription issued successfully'
        )

        if (onSubmit) {
          onSubmit({
            templateId: selectedTemplate.id,
            template: selectedTemplate,
            rows: finalRows,
            prescriptionValues,
            clinicalSummary,
            prescriptionId: result.prescription_id,
            status: result.status,
          })
        }
      } catch (error) {
        if (error?.message !== 'validation') {
          console.error('Error creating prescription:', error)
          toast.error('Failed to issue prescription', { description: error.message })
        }
      }
    })
  }

  if (templates.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <p className="text-sm text-amber-800">
            ℹ️ No prescription templates found. Please create one in the Prescription Templates section.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {templates.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-md p-2 flex items-center gap-2">
          <Label className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 shrink-0">
            Template
          </Label>
          <Select
            value={selectedTemplate?.id || ''}
            onValueChange={(id) => {
              const next = templates.find((t) => t.id === id)
              if (next) initializeTemplate(next)
            }}
          >
            <SelectTrigger className="h-8 text-[13px] border-slate-200">
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-[13px]">
                  {t.name}
                  {t.is_default ? ' (default)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {selectedTemplate && (
        <>
          <div className="space-y-3">
            {selectedTemplate.sections && selectedTemplate.sections.length > 0 ? (
              selectedTemplate.sections.map((section) => (
                <SectionBlock
                  key={section.id}
                  section={section}
                  draft={drafts[section.id] || {}}
                  rows={rows[section.id] || []}
                  expanded={!!expandedSections[section.id]}
                  onToggle={() => toggleSection(section.id)}
                  onDraftChange={(fieldId, value) => handleDraftChange(section.id, fieldId, value)}
                  onMultiSelectToggle={(fieldId, opt) =>
                    handleMultiSelectToggle(section.id, fieldId, opt)
                  }
                  onAddOption={(fieldId, opt) => handleAddOption(section.id, fieldId, opt)}
                  onAdd={() => addRow(section)}
                  onRemoveRow={(idx) => removeRow(section.id, idx)}
                  renderCellValue={renderCellValue}
                />
              ))
            ) : (
              <Card className="border-slate-200">
                <CardContent className="p-6 text-center">
                  <p className="text-slate-600">This template has no sections configured.</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="sticky bottom-3 z-10">
            <div className="bg-white border border-slate-200 rounded-md shadow-sm flex gap-2 p-2">
              <Button
                onClick={() => setShowPreview(true)}
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 h-10 text-[14px] font-semibold uppercase tracking-wide"
                disabled={isLoading || isPending || !selectedTemplate}
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button
                onClick={handleSaveDraft}
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 h-10 text-[14px] font-semibold uppercase tracking-wide"
                disabled={isLoading || isPending}
              >
                <Save className="w-4 h-4" />
                Save Draft
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                size="sm"
                className="flex-1 gap-1.5 h-10 text-[14px] font-semibold uppercase tracking-wide bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || isPending || !selectedTemplate}
              >
                <FileText className="w-4 h-4" />
                {isPending
                  ? hasExistingPrescription
                    ? 'Updating...'
                    : 'Issuing...'
                  : hasExistingPrescription
                    ? 'Update Prescription'
                    : 'Issue Prescription'}
              </Button>
            </div>
          </div>
        </>
      )}

      {showPreview && selectedTemplate && (
        <PrescriptionPreviewModal
          onClose={() => setShowPreview(false)}
          template={selectedTemplate}
          previewSections={buildPreviewSections(selectedTemplate, rows, drafts)}
          hospital={hospital}
          doctor={doctor}
          patient={patient}
          appointment={appointment}
          appointmentId={appointmentId}
        />
      )}

      <AlertDialog open={showUpdateConfirm} onOpenChange={setShowUpdateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update existing prescription?</AlertDialogTitle>
            <AlertDialogDescription>
              A prescription already exists for this appointment. Continuing will
              update it with the current details and replace its previous entries.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUpdateConfirm(false)
                handleSubmit(true)
              }}
            >
              Update Prescription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/**
 * Assemble the data the preview should render: for each section, the committed
 * rows plus any in-progress draft row that has at least one filled field.
 * Each row is normalised to a list of { label, value } using the unit rules.
 */
function buildPreviewSections(template, rows, drafts) {
  return (template.sections || [])
    .map((section) => {
      const fields = section.fields || []
      const committed = rows[section.id] || []
      const draft = drafts[section.id] || {}
      const draftFilled = fields.some((f) => isFilledValue(draft[f.id]))
      const allRows = draftFilled ? [...committed, draft] : committed

      // Only keep rows that have at least one filled value.
      const liveRows = allRows.filter((row) => fields.some((f) => isFilledValue(row[f.id])))
      if (liveRows.length === 0) return null

      // Columns = fields that have a value in at least one row (drop empty columns).
      const columns = fields
        .filter((f) => liveRows.some((row) => isFilledValue(row[f.id])))
        .map((f) => ({ id: f.id, label: f.label }))

      const tableRows = liveRows.map((row) =>
        columns.map((col) => {
          const f = fields.find((x) => x.id === col.id)
          const raw = row[col.id]
          if (!isFilledValue(raw)) return ''
          return withUnit(Array.isArray(raw) ? raw.join(', ') : String(raw), f)
        })
      )

      return {
        id: section.id,
        key: section.key || section.section_key || '',
        name: section.name,
        columns,
        rows: tableRows,
      }
    })
    .filter(Boolean)
}

function SectionBlock({
  section,
  draft,
  rows,
  expanded,
  onToggle,
  onDraftChange,
  onMultiSelectToggle,
  onAddOption,
  onAdd,
  onRemoveRow,
  renderCellValue,
}) {
  const fields = section.fields || []

  return (
    <div className="bg-white border border-slate-200 rounded-md">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-blue-50/40 transition-colors text-left border-b border-slate-200 rounded-t-md"
      >
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-slate-900 text-[14px] tracking-tight uppercase">
            {section.name}
          </h3>
          {section.description && (
            <span className="text-[12px] text-slate-500 truncate normal-case">
              {section.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <Badge
            variant="outline"
            className="text-[11px] bg-blue-50 text-blue-700 border-blue-200 h-5 px-1.5 uppercase tracking-wide"
          >
            {rows.length} {rows.length === 1 ? 'Entry' : 'Entries'}
          </Badge>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {expanded && fields.length > 0 && (
        <div className="p-3 space-y-3">
          {/* Composer row — labeled inputs share the row equally */}
          <div className="flex items-end gap-2">
            {fields.map((field) => (
              <div key={field.id} className="space-y-1 flex-1 min-w-0">
                <Label className="text-[12px] font-semibold text-slate-700 flex items-center gap-0.5 uppercase tracking-wide">
                  {field.label}
                  {field.required && <span className="text-rose-500">*</span>}
                </Label>
                <FieldInput
                  field={field}
                  value={draft[field.id]}
                  onChange={(v) => onDraftChange(field.id, v)}
                  onMultiToggle={(opt) => onMultiSelectToggle(field.id, opt)}
                  onAddOption={(opt) => onAddOption(field.id, opt)}
                />
              </div>
            ))}
            <Button
              type="button"
              onClick={onAdd}
              className="h-9 shrink-0 gap-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white shadow-none text-[13px] font-semibold uppercase tracking-wide"
              title="Add entry to table"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
          </div>

          {/* Committed rows table */}
          {rows.length > 0 && (
            <div className="border border-blue-100 rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[14px] border-collapse">
                  <thead>
                    <tr className="bg-blue-50/60 border-b border-blue-100">
                      <th className="w-10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-blue-700 text-left">
                        #
                      </th>
                      {fields.map((field) => (
                        <th
                          key={field.id}
                          className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-blue-700 text-left whitespace-nowrap"
                        >
                          {field.label}
                        </th>
                      ))}
                      <th className="w-10 px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="border-b border-blue-50 last:border-b-0 hover:bg-blue-50/30"
                      >
                        <td className="px-3 py-2 text-[12px] font-mono text-slate-400 align-middle">
                          {rowIndex + 1}
                        </td>
                        {fields.map((field) => (
                          <td
                            key={field.id}
                            className="px-3 py-2 align-middle text-slate-800 capitalize"
                          >
                            {isFilledValue(row[field.id]) ? (
                              withUnit(renderCellValue(row[field.id]), field)
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        ))}
                        <td className="px-2 py-2 align-middle">
                          <button
                            type="button"
                            onClick={() => onRemoveRow(rowIndex)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function isFilledValue(v) {
  return v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== '')
}

// Default units for common vitals, matched by field key or label.
const UNIT_RULES = [
  { match: ['blood_pressure', 'bp'], unit: 'mmHg' },
  { match: ['pulse', 'heart_rate', 'hr'], unit: 'bpm' },
  { match: ['temperature', 'temp'], unit: '°F' },
  { match: ['spo2', 'oxygen', 'o2'], unit: '%' },
  { match: ['respiratory_rate', 'resp_rate', 'rr'], unit: '/min' },
  { match: ['weight'], unit: 'kg' },
  { match: ['height'], unit: 'cm' },
]

function unitForField(field) {
  if (!field) return ''
  // Explicit unit on the field wins.
  if (field.unit) return field.unit
  const haystack = `${field.key || ''} ${field.label || ''}`.toLowerCase()
  const rule = UNIT_RULES.find((r) => r.match.some((m) => haystack.includes(m)))
  return rule ? rule.unit : ''
}

// Append the field's unit to a rendered value unless it's already present
// (e.g. the doctor typed "120/80 mmHg" themselves).
function withUnit(rendered, field) {
  const unit = unitForField(field)
  if (!unit) return rendered
  const text = String(rendered).trim()
  if (!text || text === '—') return rendered
  // Skip if the doctor already typed the unit (ignoring the degree symbol/case).
  const unitToken = unit.replace('°', '').toLowerCase()
  const textLower = text.toLowerCase()
  const alreadyHasUnit =
    textLower.includes(unit.toLowerCase()) ||
    new RegExp(`\\d\\s*${unitToken.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\b`).test(textLower)
  if (alreadyHasUnit) return rendered
  return `${text} ${unit}`
}

function FieldInput({ field, value, onChange, onMultiToggle, onAddOption }) {
  const baseInput =
    'h-9 text-[14px] border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0'

  if (field.type === 'textarea') {
    return (
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || ''}
        rows={1}
        className="text-[14px] border-slate-200 min-h-9 resize-y py-1.5 focus-visible:ring-1 focus-visible:ring-blue-500"
      />
    )
  }

  if (field.type === 'number') {
    return (
      <Input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || ''}
        className={baseInput}
      />
    )
  }

  if (field.type === 'date') {
    return (
      <Input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={baseInput}
      />
    )
  }

  if (
    (field.type === 'dropdown' || field.type === 'select') &&
    field.dropdownOptions?.length > 0
  ) {
    return (
      <SearchableSelect
        value={value || ''}
        options={field.dropdownOptions}
        placeholder={field.placeholder || 'Select or type...'}
        onChange={onChange}
        onAddOption={onAddOption}
        canAddToTemplate={Boolean(field.id)}
      />
    )
  }

  if (field.type === 'multi_select' && field.dropdownOptions?.length > 0) {
    return (
      <MultiSelectDropdown
        value={value || []}
        options={field.dropdownOptions}
        placeholder={field.placeholder || 'Select...'}
        onToggle={onMultiToggle}
      />
    )
  }

  return (
    <Input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder || ''}
      className={baseInput}
    />
  )
}

/**
 * Type-to-search dropdown that also lets the user add a brand-new value.
 * - Typing filters the option list.
 * - If the typed text matches no option, an "Add <text>" row appears.
 * - An explicit "Other…" row clears the box so the user can free-type.
 * The chosen/typed value is committed via onChange (free text allowed).
 */
function SearchableSelect({ value, options, placeholder, onChange, onAddOption, canAddToTemplate }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const normalized = query.trim().toLowerCase()
  const filtered = normalized
    ? options.filter((o) => o.toLowerCase().includes(normalized))
    : options

  const exactExists = options.some((o) => o.toLowerCase() === normalized)
  const canAddNew = normalized.length > 0 && !exactExists

  const choose = (val) => {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  // Add a brand-new value: persist it to the template (if possible) then select it.
  const addAndChoose = (val) => {
    const v = (val || '').trim()
    if (!v) return
    if (canAddToTemplate && onAddOption) {
      onAddOption(v)
    }
    choose(v)
  }

  const baseInput =
    'h-9 text-[14px] border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0'

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Input
          value={open ? query : value}
          placeholder={value ? value : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (canAddNew) addAndChoose(query.trim())
              else if (filtered.length === 1) choose(filtered[0])
            } else if (e.key === 'Escape') {
              setOpen(false)
              setQuery('')
            }
          }}
          className={cn(baseInput, 'pr-14')}
        />
        {value && !open && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              choose('')
            }}
            className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          tabIndex={-1}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.length > 0 ? (
            filtered.map((option, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => choose(option)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-blue-50"
              >
                <span className="truncate">{option}</span>
                {value === option && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </button>
            ))
          ) : (
            !canAddNew && (
              <div className="px-3 py-2 text-[12px] text-slate-400">No matches</div>
            )
          )}

          {canAddNew && (
            <button
              type="button"
              onClick={() => addAndChoose(query.trim())}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left text-[13px] text-blue-700 hover:bg-blue-50 border-t border-slate-100"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Add &ldquo;{query.trim()}&rdquo;{canAddToTemplate ? ' to options' : ''}
              </span>
            </button>
          )}

          {!query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setOpen(true)
              }}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left text-[12px] text-slate-500 hover:bg-slate-50 border-t border-slate-100"
            >
              <span>Other… (type to add a new value)</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Multi-select rendered as a dropdown with checkboxes. The trigger shows the
 * selected values (or count); the popup lists options with a checkbox each.
 */
function MultiSelectDropdown({ value, options, placeholder, onToggle }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const selected = value || []

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const baseInput =
    'h-9 text-[14px] border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-500'

  const summary =
    selected.length === 0
      ? ''
      : selected.length <= 2
        ? selected.join(', ')
        : `${selected.length} selected`

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          baseInput,
          'w-full flex items-center justify-between gap-2 px-3 text-left'
        )}
      >
        <span className={cn('truncate', summary ? 'text-slate-800' : 'text-slate-400')}>
          {summary || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg p-1">
          {options.map((option, idx) => {
            const isSelected = selected.includes(option)
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  onToggle(option)
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-blue-50 group"
              >
                <span
                  className={cn(
                    'h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors',
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-300 group-hover:border-blue-400'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                </span>
                <span className="text-[13px] text-slate-700 truncate">{option}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatDate(dateStr, withTime = false) {
  if (!dateStr) return ''
  const opts = withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' }
  return new Date(dateStr).toLocaleDateString('en-IN', opts)
}

function PrescriptionPreviewModal({
  onClose,
  previewSections,
  hospital,
  doctor,
  patient,
  appointment,
  appointmentId,
}) {
  const today = new Date()
  const issuedDate = today.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const apptDate = formatDate(appointment?.appointmentDate)
  const doctorName = doctor?.name || 'N/A'
  const departmentName = doctor?.departmentName || appointment?.department || 'N/A'

  const html = buildPrescriptionHtml({
    previewSections,
    hospital,
    doctor: { name: doctorName, departmentName },
    patient,
    appointment,
    appointmentId,
    issuedDate,
    apptDate,
  })

  // Auto filename: "Prescription_<PatientName>_<AppointmentId>" (sanitized).
  const fileBase = buildPrescriptionFileName(patient?.name, appointmentId)

  const [busy, setBusy] = useState(false)
  const [showShareFallback, setShowShareFallback] = useState(false)

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=900,height=1100')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.focus()
    // Give the new document a tick to lay out before printing.
    w.onload = () => {
      w.print()
    }
    // Fallback if onload doesn't fire.
    setTimeout(() => {
      try {
        w.print()
      } catch (_) {}
    }, 400)
  }

  // Render the prescription HTML to a PDF Blob (paginated to A4).
  const generatePdfBlob = async () => {
    const [{ jsPDF }, html2canvasMod] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ])
    const html2canvas = html2canvasMod.default

    // Render inside an isolated iframe so html2canvas only sees the prescription's
    // own inline (hex/rgb) styles. This avoids inheriting the app's Tailwind v4
    // colors, which use lab()/oklch() that html2canvas can't parse.
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.left = '-10000px'
    iframe.style.top = '0'
    iframe.style.width = '794px' // ~A4 width at 96dpi
    iframe.style.height = '1123px'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    doc.open()
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8">` +
        `<style>html,body{margin:0;padding:0;background:#fff;color:#000;` +
        `font-family:Arial,Helvetica,sans-serif}</style></head>` +
        `<body><div style="width:794px;background:#fff">${html}</div></body></html>`
    )
    doc.close()

    // Wait for the iframe document (fonts/layout) to settle before capturing.
    await new Promise((resolve) => {
      if (doc.readyState === 'complete') resolve()
      else iframe.onload = () => resolve()
    })

    // Grow the iframe to the full content height so nothing is clipped and
    // every block measures its true position.
    iframe.style.height = `${doc.documentElement.scrollHeight + 40}px`

    try {
      const scale = 2
      const snap = (el) =>
        el
          ? html2canvas(el, { scale, backgroundColor: '#ffffff', useCORS: true, windowWidth: 794 })
          : null

      // Capture the header, footer and each body block as SEPARATE canvases so
      // we can pin the footer to the bottom of every page and break only between
      // whole blocks — the body image is never sliced through a section/signature.
      const headEl = doc.querySelector('.rx-head-inner')
      const footEl = doc.querySelector('.rx-foot-inner')
      const blockEls = Array.from(doc.querySelectorAll('.rx-body-cell > .rx-block'))

      const [headCanvas, footCanvas, ...blockCanvases] = await Promise.all([
        snap(headEl),
        snap(footEl),
        ...blockEls.map(snap),
      ])

      const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const sideMargin = 16
      const topMargin = 14
      const bottomMargin = 12
      const contentW = pageW - sideMargin * 2

      const ptH = (cv) => (cv ? (cv.height * contentW) / cv.width : 0)
      const place = (cv, y) => {
        if (!cv) return 0
        const h = ptH(cv)
        pdf.addImage(cv.toDataURL('image/jpeg', 0.95), 'JPEG', sideMargin, y, contentW, h)
        return h
      }

      const headH = ptH(headCanvas)
      const footH = ptH(footCanvas)
      const gap = 8 // gap above the footer

      // Vertical band available for body content on each page.
      const bodyTopY = topMargin + headH + 6
      const bodyBottomY = pageH - bottomMargin - footH - gap
      const bodyBandH = bodyBottomY - bodyTopY

      const drawFrameAndChrome = () => {
        // Page border frame in the prescription accent color.
        const [fr, fg, fb] = hexToRgb('#1d4ed8')
        pdf.setDrawColor(fr, fg, fb)
        pdf.setLineWidth(1)
        pdf.roundedRect(
          sideMargin - 6,
          topMargin - 6,
          contentW + 12,
          pageH - topMargin - bottomMargin + 12,
          6,
          6
        )
        place(headCanvas, topMargin)
        if (footCanvas) place(footCanvas, pageH - bottomMargin - footH)
      }

      // The signature is the last block — pin it to the bottom of the page
      // (just above the footer) instead of letting it float with a large gap.
      const sigCanvas = blockCanvases.length ? blockCanvases[blockCanvases.length - 1] : null
      const contentCanvases = blockCanvases.slice(0, -1).filter(Boolean)
      const sigH = ptH(sigCanvas)

      let y = bodyTopY
      drawFrameAndChrome()

      for (const cv of contentCanvases) {
        const h = ptH(cv)

        // If this block doesn't fit in the remaining band, start a new page.
        if (y + h > bodyBottomY && y > bodyTopY) {
          pdf.addPage()
          y = bodyTopY
          drawFrameAndChrome()
        }

        // A single block taller than a full band: scale it down to fit so it is
        // never clipped by the footer (rare — only huge free-text blocks).
        if (h > bodyBandH) {
          const fitW = contentW * (bodyBandH / h)
          pdf.addImage(
            cv.toDataURL('image/jpeg', 0.95),
            'JPEG',
            sideMargin + (contentW - fitW) / 2,
            y,
            fitW,
            bodyBandH
          )
          y += bodyBandH
        } else {
          place(cv, y)
          y += h + 6
        }
      }

      // Place the signature pinned just above the footer. If it can't fit below
      // the last content on this page, move it to a fresh page first.
      if (sigCanvas) {
        if (y + 8 > bodyBottomY - sigH) {
          pdf.addPage()
          drawFrameAndChrome()
        }
        place(sigCanvas, Math.max(y, bodyBottomY - sigH))
      }

      return pdf.output('blob')
    } finally {
      document.body.removeChild(iframe)
    }
  }

  const handleDownload = async () => {
    setBusy(true)
    try {
      const blob = await generatePdfBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileBase}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Revoke after the click has had a chance to start the download.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error('Prescription download failed:', err)
      toast.error('Could not generate the PDF. Try the Print option instead.')
    } finally {
      setBusy(false)
    }
  }

  // Share message used for WhatsApp / Email fallbacks.
  const shareTitle = `Prescription — ${patient?.name || 'Patient'}`
  const shareText =
    `Prescription for ${patient?.name || 'patient'}` +
    (appointmentId ? ` (Appointment ${appointmentId})` : '') +
    ` from ${hospital?.name || 'the clinic'}.`

  const handleShare = async () => {
    setBusy(true)
    try {
      const blob = await generatePdfBlob()
      const file = new File([blob], `${fileBase}.pdf`, { type: 'application/pdf' })

      // Native share with file attachment where supported (mobile / modern browsers).
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle, text: shareText })
        return
      }

      // Fallback: download the file, then let the doctor pick WhatsApp / Email.
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileBase}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.info('PDF downloaded — attach it in WhatsApp or Email below.')
      setShowShareFallback(true)
    } catch (err) {
      if (err?.name === 'AbortError') return // user cancelled the share sheet
      console.error('Prescription share failed:', err)
      toast.error('Could not share the prescription.')
    } finally {
      setBusy(false)
    }
  }

  const openWhatsApp = () => {
    const phone = String(patient?.mobile || '').replace(/[^\d]/g, '')
    const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/'
    window.open(`${base}?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener')
  }

  const openEmail = () => {
    const to = patient?.email || ''
    const subject = encodeURIComponent(shareTitle)
    const body = encodeURIComponent(`${shareText}\n\n(Please find the prescription PDF attached.)`)
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md shadow-xl w-full max-w-3xl my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-slate-200 sticky top-0 bg-white rounded-t-md z-10">
          <h2 className="text-[14px] font-semibold uppercase tracking-tight text-slate-900">
            Prescription Preview
          </h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownload}
              size="sm"
              disabled={busy}
              className="h-8 gap-1.5 text-[13px] font-semibold uppercase tracking-wide bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              {busy ? 'Preparing…' : 'Download'}
            </Button>
            <Button
              onClick={handleShare}
              size="sm"
              variant="outline"
              disabled={busy}
              className="h-8 gap-1.5 text-[13px] font-semibold uppercase tracking-wide"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button
              onClick={handlePrint}
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-[13px] font-semibold uppercase tracking-wide"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <button
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Share fallback — shown when the browser can't attach the file natively */}
        {showShareFallback && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-slate-50">
            <span className="text-[12px] text-slate-600 mr-1">Share the downloaded PDF via:</span>
            <Button
              onClick={openWhatsApp}
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-[12px] font-semibold text-green-700 border-green-200 hover:bg-green-50"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </Button>
            <Button
              onClick={openEmail}
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-[12px] font-semibold"
            >
              <Mail className="w-3.5 h-3.5" />
              Email
            </Button>
            <button
              onClick={() => setShowShareFallback(false)}
              className="ml-auto text-[12px] text-slate-400 hover:text-slate-600"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* On-screen preview (the print uses the same HTML in a new window) */}
        <div className="bg-slate-100 p-4">
          <div
            className="bg-white shadow-sm mx-auto"
            style={{ maxWidth: '794px' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Auto download filename from the patient name + appointment id, e.g.
 * "Prescription_John_Doe_APT-123". Strips characters that are unsafe in
 * filenames and collapses whitespace to underscores.
 */
function buildPrescriptionFileName(patientName, appointmentId) {
  const clean = (s) =>
    String(s ?? '')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '') // illegal filename chars
      .replace(/\s+/g, '_')
  const name = clean(patientName) || 'Patient'
  const appt = clean(appointmentId)
  return ['Prescription', name, appt].filter(Boolean).join('_')
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Parse a #rrggbb hex into an [r, g, b] tuple for jsPDF drawing colors.
function hexToRgb(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || ''))
  if (!m) return [29, 78, 216] // blue-700 fallback
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Build a full, self-contained HTML document for the prescription.
 *
 * Print layout strategy:
 *  - A fixed-position header and footer repeat on every printed page.
 *  - A fixed full-page border box repeats on every page.
 *  - @page margins reserve the header/footer band so flowing content never
 *    overlaps them; long content paginates automatically.
 *  - The signature block sits at the end of the flow, so it lands at the
 *    bottom of the last page just above the footer.
 */
function buildPrescriptionHtml({
  previewSections,
  hospital,
  doctor,
  patient,
  appointment,
  appointmentId,
  issuedDate,
  apptDate,
}) {
  const accent = '#1d4ed8' // blue-700
  const soft = '#eff6ff' // blue-50
  const line = '#e2e8f0' // slate-200
  const muted = '#64748b' // slate-500

  const hospAddr = [hospital?.address, hospital?.city, hospital?.state]
    .filter(Boolean)
    .join(', ')
  const hospAddrFull = hospAddr + (hospital?.postal_code ? ` - ${hospital.postal_code}` : '')
  const hospContact = [
    hospital?.phone ? `Phone: ${hospital.phone}` : '',
    hospital?.email ? `Email: ${hospital.email}` : '',
  ]
    .filter(Boolean)
    .join('  |  ')

  const patientAddr = [patient?.address, patient?.city, patient?.state, patient?.pincode]
    .filter(Boolean)
    .join(', ')
  const ageGender = [patient?.age ? `${patient.age} yrs` : '', patient?.gender || '']
    .filter(Boolean)
    .join(' / ')

  // ---- HEADER (repeats every page via <thead>) ----------------------------
  const headerCell = `
    <div style="text-align:center;padding:6px 0 8px">
      <div style="font-size:19px;font-weight:800;letter-spacing:.02em;color:${accent};text-transform:uppercase">${esc(
    hospital?.name || 'Hospital Name'
  )}</div>
      <div style="font-size:10px;color:#475569;margin-top:2px">${esc(hospAddrFull)}</div>
      <div style="font-size:10px;color:#475569">${esc(hospContact)}</div>
    </div>
    <div style="height:3px;background:${accent}"></div>`

  // ---- FOOTER (repeats every page via <tfoot>) ----------------------------
  const footerCell = `
    <div style="height:2px;background:${accent};margin:6px 0 4px"></div>
    <div style="text-align:center">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:${accent}">${esc(
    hospital?.name || 'Hospital'
  )}</div>
      <div style="font-size:8px;color:${muted}">${esc(hospAddr)}${
    hospital?.phone ? ' · ' + esc(hospital.phone) : ''
  }</div>
      <div style="font-size:8px;color:#94a3b8;font-style:italic">Computer-generated prescription · valid without physical signature.</div>
    </div>`

  // ---- PATIENT / DOCTOR band (prints once, top of page 1) -----------------
  const kv = (label, value) =>
    value
      ? `<div style="margin:2px 0;font-size:11px"><span style="color:${muted}">${esc(
          label
        )}:</span> <strong>${esc(value)}</strong></div>`
      : ''

  const detailsBand = `
    <table style="width:100%;border-collapse:separate;border-spacing:0;margin-bottom:10px;border:1px solid ${line};border-radius:6px;overflow:hidden">
      <tr>
        <td style="width:58%;vertical-align:top;padding:8px 12px;background:#f8fafc;border-right:1px solid ${line}">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${accent};margin-bottom:3px">Patient</div>
          ${kv('Name', patient?.name)}
          ${kv('Patient ID', patient?.registrationNo || patient?.id)}
          ${kv('Age / Sex', ageGender)}
          ${kv('Phone', patient?.mobile)}
          ${kv('Email', patient?.email)}
          ${kv('Address', patientAddr)}
        </td>
        <td style="width:42%;vertical-align:top;padding:8px 12px;background:#f8fafc">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${accent};margin-bottom:3px">Doctor</div>
          ${kv('Name', `Dr. ${doctor?.name || 'N/A'}`)}
          ${kv('Department', doctor?.departmentName)}
          ${kv('Date', apptDate || issuedDate)}
          ${kv('Appointment', appointmentId)}
          ${kv('Complaint', appointment?.reason)}
        </td>
      </tr>
    </table>
    <div style="display:flex;align-items:center;gap:6px;margin:2px 0 8px">
      <span style="font-size:20px;font-weight:800;font-style:italic;color:${accent}">℞</span>
      <span style="flex:1;height:1px;background:${line}"></span>
    </div>`

  // ---- One section = one titled column table ------------------------------
  const sectionTable = (section) => {
    const cols = section.columns
    const isWide = cols.length > 3 // medicines etc. → keep tight column widths
    const th = cols
      .map(
        (c) =>
          `<th style="text-align:left;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:${accent};padding:5px 8px;border-bottom:1px solid ${accent}33;white-space:nowrap">${esc(
            c.label
          )}</th>`
      )
      .join('')

    const body = section.rows
      .map(
        (row, ri) =>
          `<tr style="break-inside:avoid;background:${ri % 2 ? '#fbfdff' : '#fff'}">${row
            .map(
              (cell) =>
                `<td style="font-size:11px;padding:5px 8px;border-bottom:1px solid ${line};vertical-align:top">${
                  cell ? `<strong style="font-weight:600">${esc(cell)}</strong>` : '<span style="color:#cbd5e1">—</span>'
                }</td>`
            )
            .join('')}</tr>`
      )
      .join('')

    return `
      <div class="rx-block" style="break-inside:avoid;margin-bottom:11px">
        <div style="background:${soft};color:${accent};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:5px 10px;border:1px solid ${accent}26;border-bottom:none;border-radius:5px 5px 0 0">${esc(
      section.name
    )}</div>
        <table style="width:100%;border-collapse:collapse;table-layout:${isWide ? 'fixed' : 'auto'};border:1px solid ${line};border-top:none;border-radius:0 0 5px 5px;overflow:hidden">
          <thead style="display:table-header-group"><tr>${th}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`
  }

  const bodyContent =
    previewSections.length === 0
      ? `<div style="padding:24px 8px;color:#94a3b8;font-style:italic;font-size:11px">No prescription details entered yet.</div>`
      : previewSections.map(sectionTable).join('')

  // ---- Signature (end of flow → bottom of last page, above footer) --------
  const signature = `
    <table style="width:100%;border-collapse:collapse;margin-top:22px;break-inside:avoid">
      <tr>
        <td style="vertical-align:bottom;font-size:10px;color:${muted}">Issued on ${esc(issuedDate)}</td>
        <td style="vertical-align:bottom;text-align:center;width:230px">
          <div style="font-family:'Brush Script MT','Segoe Script',cursive;font-size:24px;line-height:1;color:${accent}">Dr. ${esc(
    doctor?.name || ''
  )}</div>
          <div style="border-top:1px solid #000;margin-top:3px;padding-top:3px;font-size:11px">
            <strong>Dr. ${esc(doctor?.name || '')}</strong><br/>
            <span style="font-size:10px;color:${muted}">${esc(doctor?.departmentName || '')}</span><br/>
            <span style="font-size:9px;color:#94a3b8">Digitally signed · ${esc(issuedDate)}</span>
          </div>
        </td>
      </tr>
    </table>`

  // The whole document is ONE table: thead/tfoot auto-repeat on every printed
  // page and the browser reserves their height, so flowing tbody content never
  // overlaps them and the footer is never dropped.
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Prescription</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #0f172a; font-size: 12px; line-height: 1.45;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .rx-doc { width: 100%; border-collapse: collapse; }
  .rx-head-cell, .rx-foot-cell { padding: 0 16px; }
  .rx-body-cell { padding: 6px 16px 10px; vertical-align: top; }
  .rx-frame { border: 1.5px solid ${accent}; border-radius: 6px; }

  @media screen {
    body { background: #fff; padding: 8px; }
  }
  @media print {
    @page { size: A4; margin: 12mm 10mm; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr, .rx-frame > table > tbody > tr > td > div { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="rx-frame">
    <table class="rx-doc">
      <thead>
        <tr><td class="rx-head-cell"><div class="rx-head-inner">${headerCell}</div></td></tr>
      </thead>
      <tfoot>
        <tr><td class="rx-foot-cell"><div class="rx-foot-inner">${footerCell}</div></td></tr>
      </tfoot>
      <tbody>
        <tr><td class="rx-body-cell">
          <div class="rx-block">${detailsBand}</div>
          ${bodyContent}
          <div class="rx-block">${signature}</div>
        </td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`
}
