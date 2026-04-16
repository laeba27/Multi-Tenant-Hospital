'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PrescriptionTemplateBuilder } from './PrescriptionTemplateBuilder'
import { toast } from 'sonner'

/**
 * Prescription Template Studio
 * 
 * Main component for doctors to manage their prescription templates
 * Allows creating, customizing, duplicating, and deleting templates
 */

export function PrescriptionTemplateStudio({
  doctor = {},
  hospital = {},
  templates = [],
  optionSets = [],
  presets = [],
}) {
  const [activeTab, setActiveTab] = useState('templates')
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [builderMode, setBuilderMode] = useState('create')

  const handleCreateNew = () => {
    setSelectedTemplate(null)
    setBuilderMode('create')
    setIsBuilderOpen(true)
  }

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template)
    setBuilderMode('edit')
    setIsBuilderOpen(true)
  }

  const handleDuplicateTemplate = (template) => {
    setSelectedTemplate({
      ...template,
      name: `${template.name} (Copy)`,
      id: null,
    })
    setBuilderMode('create')
    setIsBuilderOpen(true)
  }

  const handleDeleteTemplate = (templateId) => {
    toast.success('Template deleted') // TODO: Implement deletion
  }

  const handleCloseBuilder = () => {
    setIsBuilderOpen(false)
    setSelectedTemplate(null)
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prescription Templates</h1>
          <p className="text-gray-600 mt-2">
            Create and manage custom prescription templates for your specialty
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2" size="lg">
          <Plus className="w-5 h-5" />
          New Template
        </Button>
      </div>

      {/* Doctor Info Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Doctor</p>
              <p className="font-semibold text-gray-900">{doctor.name || 'Dr. [Name]'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Specialization</p>
              <p className="font-semibold text-gray-900">{doctor.specialization || 'General'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Hospital</p>
              <p className="font-semibold text-gray-900">{hospital.name || 'Hospital'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">
            My Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="presets">
            Presets ({presets.length})
          </TabsTrigger>
          <TabsTrigger value="fields">
            Field Reference
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEditTemplate}
                onDuplicate={handleDuplicateTemplate}
                onDelete={handleDeleteTemplate}
              />
            ))}

            {templates.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="pt-12 text-center pb-12">
                  <p className="text-gray-500 mb-4">No templates yet.</p>
                  <p className="text-sm text-gray-400 mb-6">
                    Create your first template by clicking "New Template"
                  </p>
                  <Button onClick={handleCreateNew} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Template
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Presets Tab */}
        <TabsContent value="presets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {presets.map((preset) => (
              <PresetCard key={preset.id} preset={preset} />
            ))}

            {presets.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="pt-12 text-center pb-12">
                  <p className="text-gray-500 mb-4">No presets yet.</p>
                  <p className="text-sm text-gray-400">
                    Create preset templates for common cases like cold, fever, extraction care, etc.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Field Reference Tab */}
        <TabsContent value="fields" className="space-y-4">
          <FieldReferenceCards />
        </TabsContent>
      </Tabs>

      {/* Template Builder Modal */}
      <PrescriptionTemplateBuilder
        template={selectedTemplate}
        mode={builderMode}
        isOpen={isBuilderOpen}
        onClose={handleCloseBuilder}
        onSuccess={() => {
          handleCloseBuilder()
          toast.success(
            builderMode === 'create' ? 'Template created!' : 'Template updated!'
          )
        }}
      />
    </div>
  )
}

/**
 * Template Card Component
 */
function TemplateCard({ template, onEdit, onDuplicate, onDelete }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </div>
          {template.isDefault && (
            <Badge variant="secondary" className="ml-2 flex-shrink-0">
              Recommended
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Statistics */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Sections:</span>
            <span className="font-medium">{template.sections?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Fields:</span>
            <span className="font-medium">
              {template.sections?.reduce((sum, s) => sum + (s.fields?.length || 0), 0) || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Visibility:</span>
            <Badge variant="outline" className="text-xs">
              {template.visibility === 'doctor' ? 'Personal' : 'Hospital'}
            </Badge>
          </div>
        </div>

        {/* Sections Preview */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Enabled Sections:</p>
          <div className="flex flex-wrap gap-1">
            {template.sections?.map((section) => (
              <Badge key={section.id} variant="secondary" className="text-xs">
                {section.title}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(template)}
            className="flex-1 gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Customize
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDuplicate(template)}
            className="gap-2"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(template.id)}
            className="gap-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Preset Card Component
 */
function PresetCard({ preset }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{preset.name}</CardTitle>
        <CardDescription>{preset.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p className="text-gray-600 mb-1">Based on Template:</p>
          <p className="font-medium text-gray-900">{preset.templateName}</p>
        </div>
        <div className="text-sm">
          <p className="text-gray-600 mb-1">Pre-filled Fields:</p>
          <p className="font-medium text-gray-900">{preset.fieldCount || 0}</p>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1 gap-2">
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Field Reference Cards
 */
function FieldReferenceCards() {
  const fieldTypes = [
    { type: 'text', label: 'Text Input', desc: 'Single line text' },
    { type: 'textarea', label: 'Text Area', desc: 'Multi-line text' },
    { type: 'number', label: 'Number', desc: 'Numeric values' },
    { type: 'date', label: 'Date Picker', desc: 'Select date' },
    { type: 'datetime', label: 'Date & Time', desc: 'Select date and time' },
    { type: 'select', label: 'Dropdown', desc: 'Single option selection' },
    { type: 'multi_select', label: 'Multi-select', desc: 'Multiple options' },
    { type: 'checkbox', label: 'Checkbox', desc: 'Boolean value' },
    { type: 'radio', label: 'Radio Group', desc: 'Mutually exclusive options' },
    { type: 'switch', label: 'Toggle', desc: 'On/Off switch' },
    { type: 'medication_list', label: 'Medications', desc: 'Medicine prescriptions' },
    { type: 'json', label: 'Advanced', desc: 'Complex data structure' },
  ]

  const defaultSections = [
    { name: 'History', desc: 'Patient medical history and background' },
    { name: 'Examination', desc: 'Physical examination findings' },
    { name: 'Medications', desc: 'Prescribed medications' },
    { name: 'Advice', desc: 'Patient instructions and advice' },
    { name: 'Follow-up', desc: 'Follow-up appointments and schedule' },
    { name: 'Diagnosis', desc: 'Clinical diagnosis' },
    { name: 'Investigations', desc: 'Test recommendations' },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Field Types</CardTitle>
          <CardDescription>
            All field types you can add to your custom template sections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {fieldTypes.map((field) => (
              <div
                key={field.type}
                className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <p className="font-medium text-sm text-gray-900">{field.label}</p>
                <p className="text-xs text-gray-600 mt-1">{field.desc}</p>
                <p className="text-xs text-gray-400 mt-2 font-mono">{field.type}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Sections</CardTitle>
          <CardDescription>
            Standard sections provided by our system. You can enable/disable them in any template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {defaultSections.map((section, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{section.name}</p>
                  <p className="text-sm text-gray-600">{section.desc}</p>
                </div>
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">How to Build Your Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <Badge className="bg-blue-600">1</Badge>
            </div>
            <div>
              <p className="font-medium text-gray-900">Click "New Template"</p>
              <p className="text-sm text-gray-600">Start with a template name and description</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <Badge className="bg-blue-600">2</Badge>
            </div>
            <div>
              <p className="font-medium text-gray-900">Select Default Sections</p>
              <p className="text-sm text-gray-600">Enable/disable sections based on your needs</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <Badge className="bg-blue-600">3</Badge>
            </div>
            <div>
              <p className="font-medium text-gray-900">Add Custom Fields</p>
              <p className="text-sm text-gray-600">Add specific fields to each section</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <Badge className="bg-blue-600">4</Badge>
            </div>
            <div>
              <p className="font-medium text-gray-900">Save & Use</p>
              <p className="text-sm text-gray-600">
                Your template is ready to use when creating prescriptions from appointments
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
