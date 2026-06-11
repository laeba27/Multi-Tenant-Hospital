'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  Save,
  Edit2,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { saveDoctorTemplate } from '@/actions/prescriptions'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'multi_select', label: 'Multi Select' },
]

const emptyField = () => ({
  label: '',
  type: 'text',
  required: false,
  placeholder: '',
  dropdownOptions: [],
  notes: '',
})

export function PrescriptionTemplatesPage({ doctor, dbTemplates = [] }) {
  const [activeTab, setActiveTab] = useState('customized')
  const [templates, setTemplates] = useState(dbTemplates)
  const [currentTemplate, setCurrentTemplate] = useState(
    dbTemplates.length > 0 ? { ...dbTemplates[0] } : null
  )
  const [showAddSectionModal, setShowAddSectionModal] = useState(false)
  const [editingSectionIdx, setEditingSectionIdx] = useState(null)
  const [saving, setSaving] = useState(false)

  const departmentId = doctor?.departmentId || null
  const departmentName = doctor?.departmentName || 'Department'

  useEffect(() => {
    // If the doctor has no DB templates yet, start a blank one so the builder is usable.
    if (dbTemplates.length === 0) {
      createNewTemplate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createNewTemplate = () => {
    setCurrentTemplate({
      id: `template_${Date.now()}`,
      name: 'My Prescription',
      description: '',
      department_id: departmentId,
      visibility: 'department',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
      sections: [],
    })
  }

  const saveTemplate = async () => {
    try {
      setSaving(true)

      const result = await saveDoctorTemplate({
        ...currentTemplate,
        department_id: departmentId,
      })

      if (result?.templates) {
        setTemplates(result.templates)
      }
      if (result?.saved) {
        setCurrentTemplate({ ...result.saved })
      }
      toast.success('Prescription saved')
    } catch (error) {
      console.error('Error saving:', error)
      toast.error(error?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const upsertSection = (sectionData, sectionIdx) => {
    const updated = { ...currentTemplate }
    if (sectionIdx !== null && sectionIdx !== undefined) {
      updated.sections[sectionIdx] = {
        ...updated.sections[sectionIdx],
        ...sectionData,
      }
      toast.success('Section updated')
    } else {
      updated.sections.push({
        id: `section_${Date.now()}`,
        ...sectionData,
        sort_order: updated.sections.length,
      })
      toast.success('Section added')
    }
    setCurrentTemplate(updated)
    setShowAddSectionModal(false)
    setEditingSectionIdx(null)
  }

  const deleteSection = (sectionIdx) => {
    const updated = { ...currentTemplate }
    updated.sections.splice(sectionIdx, 1)
    setCurrentTemplate(updated)
    toast.success('Section deleted')
  }

  const moveSection = (fromIdx, toIdx) => {
    const updated = { ...currentTemplate }
    const [moved] = updated.sections.splice(fromIdx, 1)
    updated.sections.splice(toIdx, 0, moved)
    setCurrentTemplate(updated)
  }

  if (!currentTemplate) return null

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Compact header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[14px] font-semibold text-slate-900 tracking-tight uppercase">
              Prescription Templates
            </h1>
            <span className="text-slate-300">·</span>
            <Badge className="text-[11px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 border-0 px-2 py-0 h-5 gap-1">
              <Building2 className="w-3 h-3" />
              {departmentName}
            </Badge>
            {templates.length > 0 && (
              <Select
                value={currentTemplate?.id || ''}
                onValueChange={(id) => {
                  const next = templates.find((t) => t.id === id)
                  if (next) setCurrentTemplate({ ...next })
                }}
              >
                <SelectTrigger className="h-7 ml-1 text-[12px] border-slate-200 w-50">
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
            )}
          </div>
          <Button
            onClick={saveTemplate}
            disabled={saving}
            size="sm"
            className="h-8 gap-1.5 text-[13px] font-semibold uppercase tracking-wide bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex gap-0 border-t border-slate-100">
          <TabButton
            active={activeTab === 'customized'}
            onClick={() => setActiveTab('customized')}
          >
            Customized
          </TabButton>
          <TabButton
            active={activeTab === 'template'}
            onClick={() => setActiveTab('template')}
          >
            Presets
          </TabButton>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        {activeTab === 'customized' ? (
          <CustomizedView
            template={currentTemplate}
            onUpdateTemplate={setCurrentTemplate}
            onAddSection={() => {
              setEditingSectionIdx(null)
              setShowAddSectionModal(true)
            }}
            onEditSection={(idx) => {
              setEditingSectionIdx(idx)
              setShowAddSectionModal(true)
            }}
            onDeleteSection={deleteSection}
            onMoveSection={moveSection}
            departmentName={departmentName}
          />
        ) : (
          <TemplateView />
        )}
      </div>

      {showAddSectionModal && (
        <AddSectionModal
          section={editingSectionIdx !== null ? currentTemplate.sections[editingSectionIdx] : null}
          onSave={(sectionData) => upsertSection(sectionData, editingSectionIdx)}
          onClose={() => {
            setShowAddSectionModal(false)
            setEditingSectionIdx(null)
          }}
        />
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-[12px] font-semibold uppercase tracking-wide transition-colors border-b-2 ${
        active
          ? 'text-blue-600 border-blue-600'
          : 'text-slate-500 border-transparent hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

function CustomizedView({
  template,
  onUpdateTemplate,
  onAddSection,
  onEditSection,
  onDeleteSection,
  onMoveSection,
  departmentName,
}) {
  return (
    <div className="space-y-3">
      {/* Template name strip */}
      <div className="bg-white border border-slate-200 rounded-md p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Prescription Name
            </Label>
            <Input
              value={template.name}
              onChange={(e) => onUpdateTemplate({ ...template, name: e.target.value })}
              className="mt-1 h-9 text-[14px] border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
              placeholder="e.g., General Prescription"
            />
          </div>
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Scope
            </Label>
            <div className="mt-1 h-9 px-3 flex items-center gap-2 rounded border border-slate-200 bg-slate-50/60 text-[13px] text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-medium">{departmentName}</span>
              <span className="text-slate-400 text-[11px]">(department-wide)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sections header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-700">
            Sections
          </h2>
          <Badge
            variant="outline"
            className="text-[11px] bg-blue-50 text-blue-700 border-blue-200 h-5 px-1.5 uppercase tracking-wide"
          >
            {template.sections?.length || 0}
          </Badge>
        </div>
        <Button
          onClick={onAddSection}
          size="sm"
          className="h-8 gap-1.5 text-[13px] font-semibold uppercase tracking-wide bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Section
        </Button>
      </div>

      {/* Sections list */}
      {template.sections && template.sections.length > 0 ? (
        <div className="space-y-2">
          {template.sections.map((section, idx) => (
            <SectionCard
              key={section.id}
              section={section}
              index={idx}
              totalSections={template.sections.length}
              onEdit={() => onEditSection(idx)}
              onDelete={() => onDeleteSection(idx)}
              onMoveUp={() => idx > 0 && onMoveSection(idx, idx - 1)}
              onMoveDown={() => idx < template.sections.length - 1 && onMoveSection(idx, idx + 1)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-md p-8 text-center">
          <p className="text-[13px] text-slate-500">
            No sections yet. Click <span className="font-semibold text-blue-600">Add Section</span> to start.
          </p>
        </div>
      )}
    </div>
  )
}

function TemplateView() {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-md p-8 text-center">
      <h3 className="text-[14px] font-semibold uppercase tracking-wide text-slate-700">
        Preset Templates
      </h3>
      <p className="text-[12px] text-slate-500 mt-1">Coming soon.</p>
    </div>
  )
}

function SectionCard({ section, index, totalSections, onEdit, onDelete, onMoveUp, onMoveDown }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md hover:border-blue-200 transition-colors">
      <div className="px-3 py-2.5 flex items-center justify-between gap-2 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-mono text-slate-400 w-6 text-right">{index + 1}.</span>
          <h4 className="text-[14px] font-semibold text-slate-900 uppercase tracking-tight truncate">
            {section.name}
          </h4>
          {section.description && (
            <span className="text-[12px] text-slate-500 truncate">— {section.description}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Badge
            variant="outline"
            className="text-[11px] bg-blue-50 text-blue-700 border-blue-200 h-5 px-1.5 uppercase tracking-wide mr-1"
          >
            {section.fields?.length || 0} fields
          </Badge>
          <IconBtn onClick={onMoveUp} disabled={index === 0} title="Move up">
            <ChevronUp className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn
            onClick={onMoveDown}
            disabled={index >= totalSections - 1}
            title="Move down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn onClick={onEdit} title="Edit section" variant="blue">
            <Edit2 className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn onClick={onDelete} title="Delete section" variant="danger">
            <Trash2 className="w-3.5 h-3.5" />
          </IconBtn>
        </div>
      </div>

      {section.fields && section.fields.length > 0 && (
        <div className="px-3 py-2 flex flex-wrap gap-1.5">
          {section.fields.map((field, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[12px]"
            >
              <span className="font-medium text-slate-700 uppercase tracking-tight">{field.label}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                {field.type}
              </span>
              {field.required && (
                <span className="text-[10px] text-rose-600 font-semibold">*</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function IconBtn({ children, onClick, disabled, title, variant = 'default' }) {
  const styles =
    variant === 'danger'
      ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
      : variant === 'blue'
        ? 'text-slate-500 hover:text-blue-700 hover:bg-blue-50'
        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-7 w-7 inline-flex items-center justify-center rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 ${styles}`}
    >
      {children}
    </button>
  )
}

function AddSectionModal({ section, onSave, onClose }) {
  const [sectionName, setSectionName] = useState(section?.name || '')
  const [sectionDescription, setSectionDescription] = useState(section?.description || '')
  const [fields, setFields] = useState(section?.fields || [])
  const [draftField, setDraftField] = useState(emptyField())
  const [editingIdx, setEditingIdx] = useState(null) // null = not open, -1 = adding, >=0 = editing
  const isFieldFormOpen = editingIdx !== null

  const openAdd = () => {
    setDraftField(emptyField())
    setEditingIdx(-1)
  }

  const openEdit = (idx) => {
    const f = fields[idx]
    setDraftField({
      label: f.label || '',
      type: f.type || 'text',
      required: !!f.required,
      placeholder: f.placeholder || '',
      dropdownOptions: f.dropdownOptions || [],
      notes: f.notes || '',
    })
    setEditingIdx(idx)
  }

  const cancelField = () => {
    setDraftField(emptyField())
    setEditingIdx(null)
  }

  const commitField = () => {
    if (!draftField.label.trim()) {
      toast.error('Field label is required')
      return
    }

    if (editingIdx === -1) {
      setFields([...fields, { ...draftField, id: `field_${Date.now()}` }])
      toast.success('Field added')
    } else {
      const next = [...fields]
      next[editingIdx] = { ...next[editingIdx], ...draftField }
      setFields(next)
      toast.success('Field updated')
    }
    cancelField()
  }

  const removeField = (idx) => {
    setFields(fields.filter((_, i) => i !== idx))
    if (editingIdx === idx) cancelField()
  }

  const moveField = (from, to) => {
    if (to < 0 || to >= fields.length) return
    const next = [...fields]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setFields(next)
  }

  const handleSave = () => {
    if (!sectionName.trim()) {
      toast.error('Section name is required')
      return
    }
    onSave({ name: sectionName, description: sectionDescription, fields })
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-md shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 h-11 flex items-center justify-between border-b border-slate-200 shrink-0">
          <h2 className="text-[14px] font-semibold uppercase tracking-tight text-slate-900">
            {section ? 'Edit Section' : 'Add Section'}
          </h2>
          <button
            onClick={onClose}
            className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Section details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Section Name *
              </Label>
              <Input
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="e.g., Chief Complaints"
                className="mt-1 h-9 text-[14px] border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Description
              </Label>
              <Input
                value={sectionDescription}
                onChange={(e) => setSectionDescription(e.target.value)}
                placeholder="Optional"
                className="mt-1 h-9 text-[14px] border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          {/* Fields header */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2 pt-3">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-700">
                Fields
              </h3>
              <Badge
                variant="outline"
                className="text-[11px] bg-blue-50 text-blue-700 border-blue-200 h-5 px-1.5 uppercase tracking-wide"
              >
                {fields.length}
              </Badge>
            </div>
            {!isFieldFormOpen && (
              <Button
                onClick={openAdd}
                size="sm"
                className="h-8 gap-1.5 text-[13px] font-semibold uppercase tracking-wide bg-blue-600 hover:bg-blue-700 mt-3"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Field
              </Button>
            )}
          </div>

          {/* Fields list */}
          {fields.length > 0 && (
            <div className="space-y-1.5">
              {fields.map((field, idx) => (
                <FieldRow
                  key={field.id || idx}
                  field={field}
                  index={idx}
                  total={fields.length}
                  isEditing={editingIdx === idx}
                  onEdit={() => openEdit(idx)}
                  onRemove={() => removeField(idx)}
                  onMoveUp={() => moveField(idx, idx - 1)}
                  onMoveDown={() => moveField(idx, idx + 1)}
                />
              ))}
            </div>
          )}

          {/* Field form (add or edit) */}
          {isFieldFormOpen && (
            <FieldForm
              draft={draftField}
              setDraft={setDraftField}
              onCommit={commitField}
              onCancel={cancelField}
              mode={editingIdx === -1 ? 'add' : 'edit'}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="h-9 text-[13px] font-semibold uppercase tracking-wide"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            className="h-9 text-[13px] font-semibold uppercase tracking-wide bg-blue-600 hover:bg-blue-700"
          >
            {section ? 'Update Section' : 'Create Section'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function FieldRow({ field, index, total, isEditing, onEdit, onRemove, onMoveUp, onMoveDown }) {
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-2 rounded border ${
        isEditing
          ? 'border-blue-300 bg-blue-50/40'
          : 'border-slate-200 bg-white hover:border-blue-200'
      }`}
    >
      <span className="text-[11px] font-mono text-slate-400 w-6 text-right shrink-0">
        {index + 1}.
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="text-[13px] font-semibold text-slate-900 uppercase tracking-tight">
          {field.label}
        </span>
        <Badge
          variant="outline"
          className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 h-4 px-1.5 uppercase tracking-wide"
        >
          {field.type}
        </Badge>
        {field.required && (
          <Badge className="text-[10px] bg-rose-50 text-rose-700 border-0 ring-1 ring-inset ring-rose-200 h-4 px-1.5 uppercase tracking-wide">
            Required
          </Badge>
        )}
        {field.dropdownOptions?.length > 0 && (
          <span className="text-[11px] text-slate-500 truncate">
            {field.dropdownOptions.length} option{field.dropdownOptions.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <IconBtn onClick={onMoveUp} disabled={index === 0} title="Move up">
          <ChevronUp className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn onClick={onMoveDown} disabled={index >= total - 1} title="Move down">
          <ChevronDown className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn onClick={onEdit} title="Edit field" variant="blue">
          <Edit2 className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn onClick={onRemove} title="Delete field" variant="danger">
          <Trash2 className="w-3.5 h-3.5" />
        </IconBtn>
      </div>
    </div>
  )
}

function FieldForm({ draft, setDraft, onCommit, onCancel, mode }) {
  return (
    <div className="border border-blue-200 bg-blue-50/40 rounded-md p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-blue-700">
          {mode === 'add' ? 'New Field' : 'Edit Field'}
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Label *
          </Label>
          <Input
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            placeholder="e.g., Complaint"
            className="mt-1 h-9 text-[14px] border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
          />
        </div>
        <div>
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Type *
          </Label>
          <Select value={draft.type} onValueChange={(val) => setDraft({ ...draft, type: val })}>
            <SelectTrigger className="mt-1 h-9 text-[14px] border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Placeholder
          </Label>
          <Input
            value={draft.placeholder}
            onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })}
            placeholder="Hint text"
            className="mt-1 h-9 text-[14px] border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
          />
        </div>
      </div>

      {(draft.type === 'dropdown' || draft.type === 'multi_select') && (
        <DropdownOptionsEditor
          options={draft.dropdownOptions}
          onChange={(options) => setDraft({ ...draft, dropdownOptions: options })}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
        <div className="md:col-span-2">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </Label>
          <Input
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Internal notes (optional)"
            className="mt-1 h-9 text-[14px] border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer h-9 px-3 rounded border border-slate-200 bg-white">
          <input
            type="checkbox"
            checked={draft.required}
            onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
            className="accent-blue-600"
          />
          <span className="text-[13px] font-semibold uppercase tracking-wide text-slate-700">
            Required
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
          className="h-8 text-[13px] font-semibold uppercase tracking-wide"
        >
          Cancel
        </Button>
        <Button
          onClick={onCommit}
          size="sm"
          className="h-8 gap-1.5 text-[13px] font-semibold uppercase tracking-wide bg-blue-600 hover:bg-blue-700"
        >
          <Check className="w-3.5 h-3.5" />
          {mode === 'add' ? 'Add Field' : 'Save Field'}
        </Button>
      </div>
    </div>
  )
}

function DropdownOptionsEditor({ options, onChange }) {
  const [optionInput, setOptionInput] = useState('')

  const addOption = () => {
    // Split on commas (and newlines) so the doctor can paste/type many at once.
    const incoming = optionInput
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (incoming.length === 0) return

    const existingLower = new Set(options.map((o) => o.toLowerCase()))
    const added = []
    let duplicates = 0

    incoming.forEach((opt) => {
      const key = opt.toLowerCase()
      if (existingLower.has(key)) {
        duplicates += 1
        return
      }
      existingLower.add(key)
      added.push(opt)
    })

    if (added.length > 0) {
      onChange([...options, ...added])
    }
    if (added.length === 0 && duplicates > 0) {
      toast.error('Option already exists')
    } else if (duplicates > 0) {
      toast.success(`Added ${added.length}, skipped ${duplicates} duplicate${duplicates === 1 ? '' : 's'}`)
    }
    setOptionInput('')
  }

  const removeOption = (idx) => {
    onChange(options.filter((_, i) => i !== idx))
  }

  return (
    <div className="border border-blue-200 rounded p-2.5 bg-white">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Options
      </Label>
      <div className="flex gap-2 mt-1">
        <Input
          value={optionInput}
          onChange={(e) => setOptionInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              addOption()
            }
          }}
          placeholder="Type options separated by commas, then press Enter"
          className="flex-1 h-9 text-[14px] border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
        />
        <Button
          onClick={addOption}
          size="sm"
          className="h-9 text-[13px] font-semibold uppercase tracking-wide bg-blue-600 hover:bg-blue-700"
        >
          Add
        </Button>
      </div>
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {options.map((option, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[12px] text-blue-700"
            >
              {option}
              <button
                type="button"
                onClick={() => removeOption(idx)}
                className="text-blue-400 hover:text-rose-600"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default PrescriptionTemplatesPage
