'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Copy } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState('customized')
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [builderMode, setBuilderMode] = useState('create')

  // Filter: customized = doctor templates, templates = system templates
  const customizedTemplates = templates.filter((t) => t.visibility === 'doctor')
  const systemTemplates = templates.filter((t) => t.visibility !== 'doctor')

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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
            <p className="text-sm text-gray-600">Create and manage your custom prescription templates</p>
          </div>
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Custom
          </Button>
        </div>

        {/* Doctor Info Mini */}
        <div className="flex gap-6 text-sm bg-indigo-50 p-3 rounded-lg border border-indigo-100">
          <div>
            <span className="text-gray-600">Doctor:</span>
            <p className="font-semibold text-gray-900">{doctor.name || 'Dr. [Name]'}</p>
          </div>
          <div>
            <span className="text-gray-600">Specialty:</span>
            <p className="font-semibold text-gray-900">{doctor.specialization || 'General'}</p>
          </div>
          <div>
            <span className="text-gray-600">Hospital:</span>
            <p className="font-semibold text-gray-900">{hospital.name || 'Hospital'}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab Navigation */}
          <div className="bg-white border-b border-gray-200 px-6">
            <TabsList className="grid w-fit grid-cols-2 bg-transparent border-b-0">
              <TabsTrigger value="customized" className="rounded-t-lg rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600">
                My Custom Templates
                <Badge variant="outline" className="ml-2 bg-indigo-50 text-indigo-700">
                  {customizedTemplates.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="templates" className="rounded-t-lg rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600">
                System Templates
                <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-700">
                  {systemTemplates.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Customized Tab */}
          <TabsContent value="customized" className="flex-1 overflow-y-auto p-6">
            {customizedTemplates.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Card className="w-full max-w-md border-dashed">
                  <CardContent className="pt-12 text-center pb-12">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Plus className="w-8 h-8 text-indigo-600" />
                    </div>
                    <p className="text-gray-900 font-semibold mb-2">No Custom Templates Yet</p>
                    <p className="text-sm text-gray-600 mb-6">
                      Create your first template to customize fields, sections, and workflow
                    </p>
                    <Button onClick={handleCreateNew} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Create Template
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customizedTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={handleEditTemplate}
                    onDuplicate={handleDuplicateTemplate}
                    onDelete={handleDeleteTemplate}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="flex-1 overflow-y-auto p-6">
            {systemTemplates.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Card className="w-full max-w-md border-dashed">
                  <CardContent className="pt-12 text-center pb-12">
                    <p className="text-gray-500 mb-4">No system templates available.</p>
                    <p className="text-sm text-gray-400">
                      System templates will appear here once available
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemTemplates.map((template) => (
                  <SystemTemplateCard
                    key={template.id}
                    template={template}
                    onDuplicate={handleDuplicateTemplate}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

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
 * Custom Template Card Component
 */
function TemplateCard({ template, onEdit, onDuplicate, onDelete }) {
  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-2">{template.name}</CardTitle>
            <CardDescription className="line-clamp-1 text-xs mt-1">
              {template.description}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="flex-shrink-0 text-xs">
            Custom
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-3 space-y-3">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-gray-50 rounded text-center">
            <p className="text-gray-600">Sections</p>
            <p className="font-bold text-gray-900">{template.sections?.length || 0}</p>
          </div>
          <div className="p-2 bg-gray-50 rounded text-center">
            <p className="text-gray-600">Fields</p>
            <p className="font-bold text-gray-900">
              {template.sections?.reduce((sum, s) => sum + (s.fields?.length || 0), 0) || 0}
            </p>
          </div>
          <div className="p-2 bg-gray-50 rounded text-center">
            <p className="text-gray-600">Status</p>
            <p className="font-bold text-green-700">Active</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(template)}
            className="flex-1 h-8 text-xs gap-1"
          >
            <Edit2 className="w-3 h-3" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDuplicate(template)}
            className="h-8 px-2"
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(template.id)}
            className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * System Template Card Component
 */
function SystemTemplateCard({ template, onDuplicate }) {
  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
      <CardHeader className="pb-3 bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-2">{template.name}</CardTitle>
            <CardDescription className="line-clamp-1 text-xs mt-1">
              {template.description}
            </CardDescription>
          </div>
          <Badge className="flex-shrink-0 text-xs bg-blue-600">
            System
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-3 space-y-3">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-blue-50 rounded text-center">
            <p className="text-gray-600">Sections</p>
            <p className="font-bold text-blue-900">{template.sections?.length || 0}</p>
          </div>
          <div className="p-2 bg-blue-50 rounded text-center">
            <p className="text-gray-600">Fields</p>
            <p className="font-bold text-blue-900">
              {template.sections?.reduce((sum, s) => sum + (s.fields?.length || 0), 0) || 0}
            </p>
          </div>
          <div className="p-2 bg-blue-50 rounded text-center">
            <p className="text-gray-600">Type</p>
            <p className="font-bold text-blue-900">{template.specialty}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => onDuplicate(template)}
            className="flex-1 h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
          >
            <Copy className="w-3 h-3" />
            Use Template
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
