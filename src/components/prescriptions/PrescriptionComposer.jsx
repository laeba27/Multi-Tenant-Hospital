'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  CalendarDays,
  Stethoscope,
  Save,
  FileText,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { cn, createClient } from '@/lib/utils'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'

const blankMedication = () => ({
  medicine: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
})

function buildInitialState(sections) {
  const state = {}

  sections.forEach((section) => {
    if (!section.is_enabled) return

    section.fields.forEach((field) => {
      if (field.type === 'medication_list') {
        state[field.key] = [blankMedication()]
        return
      }

      if (field.type === 'multi_select') {
        state[field.key] = []
        return
      }

      if (field.type === 'switch' || field.type === 'checkbox') {
        state[field.key] = false
        return
      }

      state[field.key] = ''
    })
  })

  return state
}

function isFilled(value) {
  if (Array.isArray(value)) {
    return value.some((item) => {
      if (item && typeof item === 'object') {
        return Object.values(item).some((nestedValue) => String(nestedValue || '').trim().length > 0)
      }
      return String(item || '').trim().length > 0
    })
  }

  if (typeof value === 'boolean') return value
  return String(value || '').trim().length > 0
}

export function PrescriptionComposer({
  appointment,
  doctor,
  hospital,
  templates,
  optionSets,
  selectedTemplate,
  presets,
  onTemplateChange,
  onSubmit,
  isLoading = false,
}) {
  const [sections, setSections] = useState([])
  const [formState, setFormState] = useState({})
  const [expandedSections, setExpandedSections] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const supabase = createSupabaseClient()

  useEffect(() => {
    loadDoctorTemplate()
  }, [])

  const loadDoctorTemplate = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('role', 'doctor')
        .single()

      if (!staff) return

      const { data: template } = await supabase
        .from('prescription_templates')
        .select('*')
        .eq('doctor_id', staff.id)
        .eq('is_default', true)
        .single()

      if (!template) {
        setLoading(false)
        return
      }

      const { data: version } = await supabase
        .from('prescription_template_versions')
        .select('snapshot')
        .eq('template_id', template.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .single()

      if (version?.snapshot?.sections) {
        const enabledSections = version.snapshot.sections.filter(s => s.is_enabled)
        setSections(enabledSections)

        const initialState = buildInitialState(enabledSections)
        setFormState(initialState)

        const expanded = {}
        enabledSections.forEach(s => expanded[s.key] = true)
        setExpandedSections(expanded)
      }
    } catch (error) {
      console.error('Error loading template:', error)
    } finally {
      setLoading(false)
    }
  }

  const completion = useMemo(() => {
    const requiredFields = sections.flatMap((section) =>
      section.fields.filter((field) => field.is_required)
    )
    const completedRequired = requiredFields.filter((field) => isFilled(formState[field.key])).length

    return {
      completedRequired,
      totalRequired: requiredFields.length,
      percentage: requiredFields.length > 0
        ? Math.round((completedRequired / requiredFields.length) * 100)
        : 0,
    }
  }, [sections, formState])

  const handleFieldChange = (fieldKey, value) => {
    setFormState((current) => ({
      ...current,
      [fieldKey]: value,
    }))
  }

  const handleMultiSelectToggle = (fieldKey, option) => {
    setFormState((current) => {
      const currentValues = current[fieldKey] || []
      const exists = currentValues.includes(option)

      return {
        ...current,
        [fieldKey]: exists
          ? currentValues.filter((value) => value !== option)
          : [...currentValues, option],
      }
    })
  }

  const handleMedicationChange = (index, fieldName, value) => {
    setFormState((current) => ({
      ...current,
      medications: (current.medications || []).map((row, rowIndex) =>
        rowIndex === index ? { ...row, [fieldName]: value } : row
      ),
    }))
  }

  const handleAddMedication = () => {
    setFormState((current) => ({
      ...current,
      medications: [...(current.medications || []), blankMedication()],
    }))
  }

  const handleRemoveMedication = (index) => {
    setFormState((current) => ({
      ...current,
      medications: (current.medications || []).filter((_, rowIndex) => rowIndex !== index),
    }))
  }

  const handleSaveDraft = () => {
    const draftKey = `prescription-draft:${appointment?.id || 'manual'}`
    localStorage.setItem(draftKey, JSON.stringify({
      values: formState,
      updatedAt: new Date().toISOString(),
    }))
    toast.success('Draft saved')
  }

  const handleSubmit = () => {
    if (completion.completedRequired < completion.totalRequired) {
      toast.error('Please complete required fields')
      return
    }

    const prescriptionValues = sections.flatMap((section) =>
      section.fields.map((field) => ({
        field_id: field.id,
        section_key: section.key,
        field_key: field.key,
        label: field.label,
        value: formState[field.key],
        rendered_value: JSON.stringify(formState[field.key]),
        sort_order: 0,
      }))
    )

    if (onSubmit) {
      onSubmit({
        values: prescriptionValues,
        clinicalSummary: formState.clinicalNotes || '',
        followUpDate: formState.follow_up_date || null,
      })
    }
  }

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading template...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Main Form Area */}
      <div className="flex-1 space-y-3">
        {sections.map((section) => {
          const isExpanded = expandedSections[section.key]
          const sectionHasRequired = section.fields.some(f => f.is_required)
          const sectionCompletion = section.fields.filter(f => isFilled(formState[f.key])).length

          return (
            <Card key={section.key} className={`${section.color} overflow-hidden`}>
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">{section.title}</span>
                      {section.is_required && (
                        <Badge variant="outline" className="h-5 px-1.5 text-xs bg-rose-50 text-rose-700 border-rose-200">
                          Required
                        </Badge>
                      )}
                    </div>
                    {section.description && (
                      <span className="text-xs text-slate-600">{section.description}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-white/50">
                    {sectionCompletion}/{section.fields.length} filled
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="grid gap-3">
                    {section.fields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={field.key} className="text-sm font-medium text-slate-700">
                            {field.label}
                          </Label>
                          {field.is_required && <span className="text-rose-500 text-xs">*</span>}
                        </div>
                        <FieldRenderer
                          field={field}
                          value={formState[field.key]}
                          onChange={handleFieldChange}
                          onToggleMultiSelect={handleMultiSelectToggle}
                          onMedicationChange={handleMedicationChange}
                          onMedicationAdd={handleAddMedication}
                          onMedicationRemove={handleRemoveMedication}
                          medications={formState.medications || []}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Action Sidebar */}
      <div className="w-full lg:w-72 space-y-3">
        {/* Completion Status */}
        <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Progress</span>
              <Badge variant="outline" className={cn(
                'text-xs',
                completion.percentage === 100 ? 'bg-green-50 text-green-700 border-green-200' : ''
              )}>
                {completion.percentage}%
              </Badge>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  completion.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'
                )}
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>{completion.completedRequired} required filled</span>
              <span>{completion.totalRequired} total</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 space-y-2">
            <Button
              onClick={handleSaveDraft}
              variant="outline"
              className="w-full h-10 gap-2"
              disabled={isLoading}
            >
              <Save className="w-4 h-4" />
              Save Draft
            </Button>
            <Button
              onClick={handleSubmit}
              className="w-full h-10 gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={isLoading || completion.percentage < 100}
            >
              <FileText className="w-4 h-4" />
              Issue Prescription
            </Button>
          </CardContent>
        </Card>

        {/* Quick Summary */}
        {appointment && (
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Visit Info</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-start gap-2">
                  <Stethoscope className="w-4 h-4 text-slate-500 mt-0.5" />
                  <span className="text-slate-700">{appointment.patient?.name || 'Patient'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDays className="w-4 h-4 text-slate-500 mt-0.5" />
                  <span className="text-slate-700">
                    {appointment.appointmentDate
                      ? new Date(appointment.appointmentDate).toLocaleDateString()
                      : 'Date'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function FieldRenderer({
  field,
  value,
  onChange,
  onToggleMultiSelect,
  onMedicationChange,
  onMedicationAdd,
  onMedicationRemove,
  medications,
}) {
  if (field.type === 'textarea') {
    return (
      <Textarea
        id={field.key}
        value={value || ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        className="min-h-20 resize-none"
      />
    )
  }

  if (field.type === 'select') {
    const options = field.options || []

    return (
      <Select value={value || undefined} onValueChange={(nextValue) => onChange(field.key, nextValue)}>
        <SelectTrigger className="w-full h-9">
          <SelectValue placeholder={field.placeholder || 'Select option'} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (field.type === 'multi_select') {
    const options = field.options || []

    return (
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 p-2 bg-white">
        {options.map((option) => {
          const isActive = (value || []).includes(option)

          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggleMultiSelect(field.key, option)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
              )}
            >
              {option}
            </button>
          )
        })}
      </div>
    )
  }

  if (field.type === 'medication_list') {
    const meds = value || medications || []

    return (
      <div className="space-y-2">
        {meds.map((row, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="mb-1 block text-xs text-slate-600">Medicine</Label>
                <Input
                  value={row.medicine || ''}
                  onChange={(e) => onMedicationChange(index, 'medicine', e.target.value)}
                  placeholder="Medicine name"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-slate-600">Dosage</Label>
                <Input
                  value={row.dosage || ''}
                  onChange={(e) => onMedicationChange(index, 'dosage', e.target.value)}
                  placeholder="e.g., 1 tablet"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-slate-600">Timing</Label>
                <Input
                  value={row.frequency || ''}
                  onChange={(e) => onMedicationChange(index, 'frequency', e.target.value)}
                  placeholder="Morning/Night/BD"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-slate-600">Duration</Label>
                <Input
                  value={row.duration || ''}
                  onChange={(e) => onMedicationChange(index, 'duration', e.target.value)}
                  placeholder="e.g., 5 days"
                  className="h-9"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-9 border-rose-200 text-rose-700"
                  onClick={() => onMedicationRemove(index)}
                  disabled={meds.length === 1}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-slate-600">Instructions</Label>
              <Input
                value={row.instructions || ''}
                onChange={(e) => onMedicationChange(index, 'instructions', e.target.value)}
                placeholder="After meals, before food, etc."
                className="h-9"
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-9 gap-2 border-dashed"
          onClick={onMedicationAdd}
        >
          <Plus className="w-4 h-4" />
          Add Medication
        </Button>
      </div>
    )
  }

  return (
    <Input
      id={field.key}
      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
      value={value || ''}
      onChange={(e) => onChange(field.key, e.target.value)}
      placeholder={field.placeholder}
      className="h-9"
    />
  )
}
