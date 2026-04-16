'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { X, Plus, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Flexible Prescription Template Builder
 * 
 * Allows doctors to:
 * 1. Create new templates from scratch
 * 2. Customize existing templates
 * 3. Add/remove/configure sections
 * 4. Add custom fields to sections
 * 5. Enable/disable default sections
 * 6. Set field properties (required, removable, locked, etc.)
 */

const DEFAULT_SECTIONS = [
  {
    id: 'section-history',
    key: 'history',
    title: 'History',
    description: 'Patient medical history and background',
    enabled: true,
  },
  {
    id: 'section-examination',
    key: 'examination',
    title: 'Examination',
    description: 'Physical examination findings',
    enabled: true,
  },
  {
    id: 'section-medications',
    key: 'medications',
    title: 'Medications',
    description: 'Prescribed medications',
    enabled: true,
  },
  {
    id: 'section-advice',
    key: 'advice',
    title: 'Advice',
    description: 'Patient instructions and advice',
    enabled: true,
  },
  {
    id: 'section-followup',
    key: 'followup',
    title: 'Follow-up',
    description: 'Follow-up appointments and schedule',
    enabled: true,
  },
  {
    id: 'section-diagnosis',
    key: 'diagnosis',
    title: 'Diagnosis',
    description: 'Clinical diagnosis',
    enabled: false,
  },
  {
    id: 'section-investigations',
    key: 'investigations',
    title: 'Investigations',
    description: 'Test recommendations',
    enabled: false,
  },
]

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date Picker' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multi_select', label: 'Multi-select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio Group' },
  { value: 'switch', label: 'Toggle' },
  { value: 'medication_list', label: 'Medication List' },
  { value: 'json', label: 'Advanced (JSON)' },
]

export function PrescriptionTemplateBuilder({ 
  template = null, 
  mode = 'create', 
  isOpen = false, 
  onClose = () => {}, 
  onSuccess = () => {} 
}) {
  const [templateName, setTemplateName] = useState(template?.name || '')
  const [templateDesc, setTemplateDesc] = useState(template?.description || '')
  const [visibility, setVisibility] = useState(template?.visibility || 'doctor')
  const [sections, setSections] = useState(
    template?.sections || DEFAULT_SECTIONS.map(s => ({ ...s }))
  )
  const [newFieldSection, setNewFieldSection] = useState(null)
  const [newFieldData, setNewFieldData] = useState({ label: '', type: 'text', required: false })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle section toggle
  const handleToggleSection = useCallback((sectionId) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    ))
  }, [])

  // Handle add section
  const handleAddSection = useCallback(() => {
    const newSection = {
      id: `section-${Date.now()}`,
      key: `custom_${Date.now()}`,
      title: 'New Section',
      description: 'Custom section',
      enabled: true,
      customFields: [],
    }
    setSections(prev => [...prev, newSection])
  }, [])

  // Handle remove section
  const handleRemoveSection = useCallback((sectionId) => {
    setSections(prev => prev.filter(s => s.id !== sectionId))
  }, [])

  // Handle update section
  const handleUpdateSection = useCallback((sectionId, updates) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    ))
  }, [])

  // Handle add custom field to section
  const handleAddField = useCallback((sectionId) => {
    if (!newFieldData.label.trim()) {
      toast.error('Field label is required')
      return
    }

    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        const customFields = s.customFields || []
        return {
          ...s,
          customFields: [
            ...customFields,
            {
              id: `field-${Date.now()}`,
              label: newFieldData.label,
              type: newFieldData.type,
              required: newFieldData.required,
              removable: true,
            }
          ]
        }
      }
      return s
    }))

    setNewFieldData({ label: '', type: 'text', required: false })
    setNewFieldSection(null)
    toast.success('Field added')
  }, [newFieldData])

  // Handle remove custom field
  const handleRemoveField = useCallback((sectionId, fieldId) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          customFields: (s.customFields || []).filter(f => f.id !== fieldId)
        }
      }
      return s
    }))
  }, [])

  // Handle submit
  const handleSubmit = async () => {
    try {
      if (!templateName.trim()) {
        toast.error('Template name is required')
        return
      }

      if (sections.filter(s => s.enabled).length === 0) {
        toast.error('At least one section must be enabled')
        return
      }

      setIsSubmitting(true)

      const templateData = {
        name: templateName,
        description: templateDesc,
        visibility,
        sections: sections.filter(s => s.enabled),
      }

      // TODO: Call server action to save template
      console.log('Template data:', templateData)

      toast.success(mode === 'create' ? 'Template created!' : 'Template updated!')
      onSuccess()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Template' : 'Customize Template'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a prescription template by selecting sections and adding custom fields'
              : 'Modify template sections and fields'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Cold & Fever, Post-extraction Care"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="template-desc">Description</Label>
                <Textarea
                  id="template-desc"
                  placeholder="Describe when to use this template..."
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="visibility">Visibility</Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">Personal (Only Me)</SelectItem>
                    <SelectItem value="hospital">Hospital (All Doctors)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sections Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Sections</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddSection}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Custom Section
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {sections.map((section) => (
                <div key={section.id} className="border rounded-lg p-4 space-y-3">
                  {/* Section Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <Input
                          value={section.title}
                          onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                          className="font-semibold"
                          size="sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">{section.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => handleToggleSection(section.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                      >
                        {section.enabled ? (
                          <Eye className="w-5 h-5 text-green-600" />
                        ) : (
                          <EyeOff className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {/* Remove if not default */}
                      {section.id.startsWith('section-custom') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveSection(section.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Custom Fields for Section */}
                  {section.enabled && (
                    <div className="ml-8 border-t pt-3 space-y-2">
                      {/* Existing Custom Fields */}
                      {section.customFields?.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">{field.label}</p>
                            <p className="text-xs text-gray-500">
                              {FIELD_TYPES.find(t => t.value === field.type)?.label}
                              {field.required && ' • Required'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveField(section.id, field.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      {/* Add Custom Field Form */}
                      {newFieldSection === section.id ? (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded space-y-3">
                          <div>
                            <Label className="text-sm">Field Label *</Label>
                            <Input
                              placeholder="e.g., Patient Symptoms"
                              value={newFieldData.label}
                              onChange={(e) => setNewFieldData(prev => ({ ...prev, label: e.target.value }))}
                              size="sm"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label className="text-sm">Field Type *</Label>
                            <Select value={newFieldData.type} onValueChange={(type) => 
                              setNewFieldData(prev => ({ ...prev, type }))
                            }>
                              <SelectTrigger size="sm" className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map(ft => (
                                  <SelectItem key={ft.value} value={ft.value}>
                                    {ft.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={newFieldData.required}
                              onCheckedChange={(required) => 
                                setNewFieldData(prev => ({ ...prev, required }))
                              }
                            />
                            <Label className="text-sm">Required field</Label>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAddField(section.id)}
                              className="flex-1"
                            >
                              Add Field
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setNewFieldSection(null)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setNewFieldSection(section.id)}
                          className="w-full gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Custom Field
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Disabled state */}
                  {!section.enabled && (
                    <div className="ml-8 text-sm text-gray-500 italic">
                      Section disabled - click eye icon to enable
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-gray-50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Enabled Sections:</p>
                  <p className="font-semibold">{sections.filter(s => s.enabled).length}</p>
                </div>
                <div>
                  <p className="text-gray-600">Custom Fields:</p>
                  <p className="font-semibold">
                    {sections.reduce((sum, s) => sum + (s.customFields?.length || 0), 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Visibility:</p>
                  <Badge variant="outline">{visibility}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !templateName.trim()}
            >
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Template' : 'Update Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
