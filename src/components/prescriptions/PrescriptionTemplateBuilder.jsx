'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { X, Plus, Trash2, GripVertical, Eye, EyeOff, Settings, BookOpen, Layers } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
 * 1. Create new templates from scratch with customizable sections
 * 2. Toggle default sections (History, Examination, Medications, etc.)
 * 3. Add custom sections for specialized workflows
 * 4. Add/remove/configure fields within each section
 * 5. Set field properties (required, type, removable, etc.)
 * 6. Scope templates to doctor (private) or hospital (shared)
 */

const DEFAULT_SECTIONS = [
  {
    id: 'section-history',
    key: 'history',
    title: 'History',
    description: 'Patient medical history and background',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'section-examination',
    key: 'examination',
    title: 'Examination',
    description: 'Physical examination findings',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'section-medications',
    key: 'medications',
    title: 'Medications',
    description: 'Prescribed medications',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'section-advice',
    key: 'advice',
    title: 'Advice',
    description: 'Patient instructions and advice',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'section-followup',
    key: 'followup',
    title: 'Follow-up',
    description: 'Follow-up appointments and schedule',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'section-diagnosis',
    key: 'diagnosis',
    title: 'Diagnosis',
    description: 'Clinical diagnosis',
    enabled: false,
    isDefault: true,
  },
  {
    id: 'section-investigations',
    key: 'investigations',
    title: 'Investigations',
    description: 'Test recommendations',
    enabled: false,
    isDefault: true,
  },
]

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input', icon: '📝' },
  { value: 'textarea', label: 'Text Area', icon: '📄' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'date', label: 'Date Picker', icon: '📅' },
  { value: 'datetime', label: 'Date & Time', icon: '⏰' },
  { value: 'select', label: 'Dropdown', icon: '▼' },
  { value: 'multi_select', label: 'Multi-select', icon: '✓✓' },
  { value: 'checkbox', label: 'Checkbox', icon: '☑' },
  { value: 'radio', label: 'Radio Group', icon: '◉' },
  { value: 'switch', label: 'Toggle', icon: '⚪' },
  { value: 'medication_list', label: 'Medication List', icon: '💊' },
  { value: 'json', label: 'Advanced (JSON)', icon: '{}' },
]

export function PrescriptionTemplateBuilder({ 
  template = null, 
  mode = 'create', 
  isOpen = false, 
  onClose = () => {}, 
  onSuccess = () => {} 
}) {
  const [activeTab, setActiveTab] = useState('info')
  const [templateName, setTemplateName] = useState(template?.name || '')
  const [templateDesc, setTemplateDesc] = useState(template?.description || '')
  const [visibility, setVisibility] = useState(template?.visibility || 'doctor')
  const [sections, setSections] = useState(
    template?.sections || DEFAULT_SECTIONS.map(s => ({ ...s }))
  )
  const [expandedSection, setExpandedSection] = useState(null)
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
      id: `section-custom-${Date.now()}`,
      key: `custom_${Date.now()}`,
      title: 'New Custom Section',
      description: 'Custom section',
      enabled: true,
      isDefault: false,
      customFields: [],
    }
    setSections(prev => [...prev, newSection])
    setExpandedSection(newSection.id)
  }, [])

  // Handle remove section
  const handleRemoveSection = useCallback((sectionId) => {
    setSections(prev => prev.filter(s => s.id !== sectionId))
    if (expandedSection === sectionId) setExpandedSection(null)
  }, [expandedSection])

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
    toast.success('Field added to section')
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

  const enabledSections = sections.filter(s => s.enabled)
  const totalFields = sections.reduce((sum, s) => sum + (s.customFields?.length || 0), 0)

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            {mode === 'create' ? 'Create New Prescription Template' : 'Customize Template'}
          </DialogTitle>
          <DialogDescription>
            Build your custom prescription template by enabling sections and adding fields
          </DialogDescription>
        </DialogHeader>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Template Info
            </TabsTrigger>
            <TabsTrigger value="sections" className="gap-2">
              <Layers className="w-4 h-4" />
              Sections
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Settings className="w-4 h-4" />
              Summary
            </TabsTrigger>
          </TabsList>

          {/* Template Info Tab */}
          <TabsContent value="info" className="flex-1 overflow-y-auto p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
                <CardDescription>Name and description for your prescription template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template-name" className="text-sm font-medium">Template Name *</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., Cold & Fever, Post-extraction Care, Routine Checkup"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used to identify this template when creating prescriptions</p>
                </div>

                <div>
                  <Label htmlFor="template-desc" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="template-desc"
                    placeholder="Describe when and how to use this template..."
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    className="mt-2"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">Help yourself and colleagues understand the purpose of this template</p>
                </div>

                <div>
                  <Label htmlFor="visibility" className="text-sm font-medium">Visibility & Sharing</Label>
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doctor">
                        <div>
                          <p className="font-medium">Personal (Only Me)</p>
                          <p className="text-xs text-gray-500">Private template for your use only</p>
                        </div>
                      </SelectItem>
                      <SelectItem value="hospital">
                        <div>
                          <p className="font-medium">Hospital (All Doctors)</p>
                          <p className="text-xs text-gray-500">Shared across your hospital</p>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections" className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-sm">Configure Prescription Sections</h3>
                <p className="text-xs text-gray-500">Enable/disable default sections or create custom ones</p>
              </div>
              <Button
                size="sm"
                onClick={handleAddSection}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Custom Section
              </Button>
            </div>

            <div className="space-y-3">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className={`border rounded-lg transition-all ${
                    expandedSection === section.id ? 'ring-2 ring-indigo-500 shadow-md' : ''
                  }`}
                >
                  {/* Section Header */}
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <div className={`p-2 rounded-lg ${section.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {section.enabled ? (
                          <Eye className="w-4 h-4 text-green-700" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">{section.title}</p>
                        <p className="text-xs text-gray-500 truncate">{section.description}</p>
                      </div>
                      {section.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {(section.customFields?.length || 0)} fields
                      </Badge>
                    </div>
                  </button>

                  {/* Section Expanded Content */}
                  {expandedSection === section.id && (
                    <div className="border-t bg-gray-50 p-4 space-y-4">
                      {/* Section Title Edit (only for custom) */}
                      {!section.isDefault && (
                        <div>
                          <Label className="text-xs font-medium">Section Title</Label>
                          <Input
                            value={section.title}
                            onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                            className="mt-1 text-sm"
                            placeholder="Enter section title"
                          />
                        </div>
                      )}

                      {/* Custom Fields */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">Custom Fields</h4>
                          {section.enabled && newFieldSection !== section.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setNewFieldSection(section.id)}
                              className="h-7 text-xs gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Add Field
                            </Button>
                          )}
                        </div>

                        {/* Existing Custom Fields */}
                        {section.customFields && section.customFields.length > 0 && (
                          <div className="space-y-2">
                            {section.customFields.map((field) => (
                              <div
                                key={field.id}
                                className="flex items-center justify-between p-3 bg-white border rounded-lg"
                              >
                                <div className="text-sm flex-1">
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
                                  className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Custom Field Form */}
                        {newFieldSection === section.id && (
                          <Card className="border-indigo-200 bg-indigo-50">
                            <CardContent className="pt-4 space-y-3">
                              <div>
                                <Label className="text-xs font-medium">Field Label *</Label>
                                <Input
                                  placeholder="e.g., Symptoms, Blood Pressure, Pain Level"
                                  value={newFieldData.label}
                                  onChange={(e) => setNewFieldData(prev => ({ ...prev, label: e.target.value }))}
                                  className="mt-1 text-sm"
                                />
                              </div>

                              <div>
                                <Label className="text-xs font-medium">Field Type *</Label>
                                <Select value={newFieldData.type} onValueChange={(type) => 
                                  setNewFieldData(prev => ({ ...prev, type }))
                                }>
                                  <SelectTrigger className="mt-1 text-sm h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {FIELD_TYPES.map(ft => (
                                      <SelectItem key={ft.value} value={ft.value}>
                                        {ft.icon} {ft.label}
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
                                  id="field-required"
                                />
                                <Label htmlFor="field-required" className="text-xs font-medium">Make this field required</Label>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleAddField(section.id)}
                                  className="flex-1 h-8 text-sm"
                                >
                                  Add Field
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setNewFieldSection(null)}
                                  className="flex-1 h-8 text-sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {section.customFields?.length === 0 && newFieldSection !== section.id && (
                          <p className="text-xs text-gray-500 italic">No custom fields yet</p>
                        )}
                      </div>

                      {/* Section Actions */}
                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          size="sm"
                          variant={section.enabled ? 'outline' : 'default'}
                          onClick={() => handleToggleSection(section.id)}
                          className="flex-1 h-8 text-sm"
                        >
                          {section.enabled ? 'Disable Section' : 'Enable Section'}
                        </Button>
                        {!section.isDefault && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveSection(section.id)}
                            className="h-8 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Preview/Summary Tab */}
          <TabsContent value="preview" className="flex-1 overflow-y-auto p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Template Summary</CardTitle>
                <CardDescription>Overview of your prescription template configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Template Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Template Name</p>
                    <p className="font-semibold text-gray-900">{templateName || '(Not set)'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Visibility</p>
                    <Badge variant="outline">
                      {visibility === 'doctor' ? 'Personal' : 'Hospital-wide'}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                {templateDesc && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Description</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{templateDesc}</p>
                  </div>
                )}

                {/* Sections Overview */}
                <div>
                  <p className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Enabled Sections ({enabledSections.length})
                  </p>
                  <div className="space-y-2">
                    {enabledSections.map(section => (
                      <div key={section.id} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm text-gray-900">{section.title}</p>
                          {section.customFields && section.customFields.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {section.customFields.length} custom field{section.customFields.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{section.description}</p>
                        {section.customFields && section.customFields.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {section.customFields.map(field => (
                              <Badge key={field.id} variant="outline" className="text-xs">
                                {field.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">{enabledSections.length}</p>
                    <p className="text-xs text-gray-600 mt-1">Sections</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">{totalFields}</p>
                    <p className="text-xs text-gray-600 mt-1">Custom Fields</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">{sections.length}</p>
                    <p className="text-xs text-gray-600 mt-1">Total Sections</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="border-t pt-4 flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !templateName.trim() || enabledSections.length === 0}
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Template' : 'Update Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
