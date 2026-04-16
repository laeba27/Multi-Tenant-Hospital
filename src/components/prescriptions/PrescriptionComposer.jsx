'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  CalendarDays,
  ClipboardCheck,
  FileStack,
  Pill,
  Stethoscope,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatDate } from '@/lib/utils'

const blankMedication = () => ({
  medicine: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
})

function buildInitialState(template) {
  const state = {}

  template.sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === 'medication_list') {
        state[field.key] = field.defaultValue || [blankMedication()]
        return
      }

      if (field.type === 'multi_select') {
        state[field.key] = field.defaultValue || []
        return
      }

      if (field.type === 'switch' || field.type === 'checkbox') {
        state[field.key] = field.defaultValue ?? false
        return
      }

      state[field.key] = field.defaultValue ?? ''
    })
  })

  return state
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
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

function getOptionsForField(field, optionSetMap) {
  if (field.options) return field.options
  if (field.optionSetKey) return optionSetMap[field.optionSetKey] || []
  return []
}

export function PrescriptionComposer({
  appointment,
  doctor,
  hospital,
  templates,
  optionSets,
  selectedTemplate,
  presets,
}) {
  const [activeTemplateId, setActiveTemplateId] = useState(selectedTemplate.id)
  const [formState, setFormState] = useState(() => buildInitialState(selectedTemplate))
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [isPending, startTransition] = useTransition()

  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === activeTemplateId) || selectedTemplate,
    [activeTemplateId, selectedTemplate, templates]
  )

  const optionSetMap = useMemo(
    () => optionSets.reduce((map, optionSet) => {
      map[optionSet.key] = optionSet.items
      return map
    }, {}),
    [optionSets]
  )

  const draftKey = useMemo(
    () => `prescription-draft:${appointment?.id || 'manual'}:${activeTemplateId}`,
    [activeTemplateId, appointment?.id]
  )

  const templatePresets = useMemo(
    () => presets.filter((preset) => preset.templateId === activeTemplate.id),
    [activeTemplate.id, presets]
  )

  const completion = useMemo(() => {
    const requiredFields = activeTemplate.sections.flatMap((section) => section.fields.filter((field) => field.required))
    const completedRequired = requiredFields.filter((field) => isFilled(formState[field.key])).length

    return {
      completedRequired,
      totalRequired: requiredFields.length,
    }
  }, [activeTemplate.sections, formState])

  useEffect(() => {
    const nextState = buildInitialState(activeTemplate)

    try {
      const savedDraft = window.localStorage.getItem(draftKey)

      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft)
        setFormState(parsedDraft.values || nextState)
        setLastSavedAt(parsedDraft.updatedAt || null)
        return
      }
    } catch (_error) {
      // Ignore malformed draft data and fall back to template defaults.
    }

    setFormState(nextState)
    setLastSavedAt(null)
  }, [activeTemplate, draftKey])

  const medicationSuggestions = optionSetMap.common_medicines || []

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
      medications: (current.medications || []).map((row, rowIndex) => (
        rowIndex === index ? { ...row, [fieldName]: value } : row
      )),
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

  const handleTemplateChange = (templateId) => {
    setActiveTemplateId(templateId)
    toast.success('Prescription layout changed. Fields are now aligned to the selected template.')
  }

  const handleApplyPreset = (preset) => {
    startTransition(() => {
      const nextState = clone(formState)

      Object.entries(preset.values).forEach(([key, value]) => {
        nextState[key] = clone(value)
      })

      setFormState(nextState)
      toast.success(`${preset.name} applied. You can edit anything before issuing.`)
    })
  }

  const handleSaveDraft = () => {
    const payload = {
      templateId: activeTemplateId,
      values: formState,
      updatedAt: new Date().toISOString(),
    }

    window.localStorage.setItem(draftKey, JSON.stringify(payload))
    setLastSavedAt(payload.updatedAt)
    toast.success('Draft saved locally for this appointment and template.')
  }

  const handleIssue = () => {
    if (completion.completedRequired < completion.totalRequired) {
      toast.error('Please complete the required fields before issuing the prescription.')
      return
    }

    toast.success('Prescription UI is ready. Connect this action to the new schema to persist records.')
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50">
        <CardContent className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-slate-900 text-white">Prescription Composer</Badge>
              <Badge variant="outline">{doctor.specialization}</Badge>
              <Badge variant="outline">{hospital.name}</Badge>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">New Prescription</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Compact, column-based prescription entry for fast consultations. The fields come from the selected
                template so the same page can work for dental, neurology, or general OPD flows.
              </p>
            </div>

            {appointment ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <QuickSummary icon={Stethoscope} label="Patient" value={appointment.patient.name} />
                <QuickSummary icon={ClipboardCheck} label="Department" value={appointment.department} />
                <QuickSummary icon={CalendarDays} label="Visit Date" value={formatDate(appointment.appointmentDate)} />
                <QuickSummary icon={FileStack} label="Appointment" value={appointment.id} />
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No appointment context was found for this URL. The page is still usable for manual composition, but
                you should open it from the appointment board to preload patient details.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Active template</Label>
                <Select value={activeTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Required</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {completion.completedRequired}/{completion.totalRequired}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Last saved</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString() : 'Not yet'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full bg-slate-900 text-white hover:bg-slate-800"
                  onClick={handleSaveDraft}
                  disabled={isPending}
                >
                  Save Draft
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={handleIssue}
                  disabled={isPending}
                >
                  Issue Prescription
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
        <div className="grid gap-4 lg:grid-cols-2">
          {activeTemplate.sections.map((section) => {
            const isWideSection = section.fields.some((field) => field.type === 'medication_list')

            return (
              <Card
                key={section.id}
                className={cn(
                  'border-slate-200 bg-white',
                  isWideSection ? 'lg:col-span-2' : ''
                )}
              >
                <CardHeader className="border-b">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle>{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {section.isRequired ? (
                        <Badge className="bg-rose-100 text-rose-700">Required</Badge>
                      ) : null}
                      <Badge variant="outline">{section.columns} columns</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className={cn('grid gap-4', section.columns === 2 ? 'md:grid-cols-2' : 'grid-cols-1')}>
                    {section.fields.map((field) => (
                      <div
                        key={field.id}
                        className={cn(
                          'space-y-2',
                          field.width === 2 && section.columns > 1 ? 'md:col-span-2' : ''
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Label htmlFor={field.id}>{field.label}</Label>
                          {field.required ? <Badge className="bg-rose-100 text-rose-700">Required</Badge> : null}
                        </div>
                        <FieldRenderer
                          field={field}
                          value={formState[field.key]}
                          optionSetMap={optionSetMap}
                          onChange={handleFieldChange}
                          onToggleMultiSelect={handleMultiSelectToggle}
                          medicationSuggestions={medicationSuggestions}
                          onMedicationChange={handleMedicationChange}
                          onMedicationAdd={handleAddMedication}
                          onMedicationRemove={handleRemoveMedication}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Patient Snapshot</CardTitle>
              <CardDescription>Keep the important context visible while writing the prescription.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SnapshotItem label="Patient" value={appointment?.patient?.name || 'Walk-in / manual mode'} />
              <SnapshotItem label="Registration No" value={appointment?.patient?.registrationNo || 'N/A'} />
              <SnapshotItem label="Mobile" value={appointment?.patient?.mobile || 'N/A'} />
              <SnapshotItem label="Reason" value={appointment?.reason || 'No appointment note'} />
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Clinical Presets</CardTitle>
              <CardDescription>Use common-case templates to reduce repeat typing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {templatePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{preset.name}</p>
                    <Badge variant="outline">{preset.visibility}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{preset.description}</p>
                </button>
              ))}
              {!templatePresets.length ? (
                <p className="text-sm text-slate-500">No presets available for this template yet.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Medicine Library</CardTitle>
              <CardDescription>Frequently reused medicine options for faster prescription entry.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {medicationSuggestions.map((medicine) => (
                <span
                  key={medicine}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                >
                  {medicine}
                </span>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function FieldRenderer({
  field,
  value,
  optionSetMap,
  onChange,
  onToggleMultiSelect,
  medicationSuggestions,
  onMedicationChange,
  onMedicationAdd,
  onMedicationRemove,
}) {
  if (field.type === 'textarea') {
    return (
      <Textarea
        id={field.id}
        value={value || ''}
        onChange={(event) => onChange(field.key, event.target.value)}
        placeholder={field.placeholder}
        className="min-h-[96px]"
      />
    )
  }

  if (field.type === 'select') {
    const options = getOptionsForField(field, optionSetMap)

    return (
      <Select value={value || undefined} onValueChange={(nextValue) => onChange(field.key, nextValue)}>
        <SelectTrigger className="w-full">
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
    const options = getOptionsForField(field, optionSetMap)

    return (
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 p-3">
        {options.map((option) => {
          const isActive = (value || []).includes(option)

          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggleMultiSelect(field.key, option)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition',
                isActive
                  ? 'border-indigo-200 bg-indigo-100 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              )}
            >
              {option}
            </button>
          )
        })}
      </div>
    )
  }

  if (field.type === 'switch') {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
        <p className="text-sm text-slate-600">{field.placeholder || 'Toggle this field for the current visit.'}</p>
        <Switch checked={Boolean(value)} onCheckedChange={(checked) => onChange(field.key, checked)} />
      </div>
    )
  }

  if (field.type === 'medication_list') {
    const medications = value || []

    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
        {medications.map((row, index) => (
          <div key={`${field.id}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="xl:col-span-2">
                <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Medicine</Label>
                <Select
                  value={row.medicine || undefined}
                  onValueChange={(nextValue) => onMedicationChange(index, 'medicine', nextValue)}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicationSuggestions.map((medicine) => (
                      <SelectItem key={medicine} value={medicine}>
                        {medicine}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <CompactInput
                label="Dosage"
                value={row.dosage}
                onChange={(nextValue) => onMedicationChange(index, 'dosage', nextValue)}
                placeholder="1 tab"
              />
              <CompactInput
                label="Frequency"
                value={row.frequency}
                onChange={(nextValue) => onMedicationChange(index, 'frequency', nextValue)}
                placeholder="BD"
              />
              <CompactInput
                label="Duration"
                value={row.duration}
                onChange={(nextValue) => onMedicationChange(index, 'duration', nextValue)}
                placeholder="5 days"
              />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">Instructions</Label>
                <Input
                  value={row.instructions}
                  onChange={(event) => onMedicationChange(index, 'instructions', event.target.value)}
                  placeholder="After meals / SOS / Avoid empty stomach"
                  className="bg-white"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-rose-200 text-rose-700 hover:bg-rose-50 md:w-auto"
                  onClick={() => onMedicationRemove(index)}
                  disabled={medications.length === 1}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" className="w-full" onClick={onMedicationAdd}>
          <Pill className="h-4 w-4" />
          Add Medication Row
        </Button>
      </div>
    )
  }

  return (
    <Input
      id={field.id}
      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
      value={value || ''}
      onChange={(event) => onChange(field.key, event.target.value)}
      placeholder={field.placeholder}
    />
  )
}

function CompactInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-500">{label}</Label>
      <Input
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="bg-white"
      />
    </div>
  )
}

function QuickSummary({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

function SnapshotItem({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}
