'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pill, Plus, ChevronRight } from 'lucide-react'
import { createPrescriptionFromAppointment } from '@/actions/prescriptions'
import { PrescriptionComposer } from './PrescriptionComposer'

/**
 * Component to manage prescriptions within an appointment context
 * Allows doctor to:
 * - View prescription history for the appointment
 * - Create new prescriptions
 * - View prescription status
 * 
 * Can be used in two ways:
 * 1. Standalone with internal Dialog (no isOpen prop)
 * 2. Controlled from parent (with isOpen and onOpenChange props)
 */
export function AppointmentPrescriptionManager({
  appointmentId,
  patientId,
  hasExistingPrescription = false,
  prescriptions = [],
  templates = [],
  optionSets = [],
  presets = [],
  defaultTemplate = null,
  isOpen: controlledIsOpen = undefined,
  onOpenChange = undefined,
  onClose = undefined,
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplate)
  const [isPending, startTransition] = useTransition()

  // Use controlled or internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = (value) => {
    if (onOpenChange) {
      onOpenChange(value)
    } else {
      setInternalIsOpen(value)
    }
    // Call onClose when dialog closes
    if (!value && onClose) {
      onClose()
    }
  }

  const handleCreatePrescription = (prescriptionData) => {
    startTransition(async () => {
      try {
        const result = await createPrescriptionFromAppointment({
          appointmentId,
          patientId,
          templateId: selectedTemplate?.id,
          templateVersionId: selectedTemplate?.versionId,
          prescriptionValues: prescriptionData.values || [],
          clinicalSummary: prescriptionData.clinicalSummary,
          followUpDate: prescriptionData.followUpDate,
          status: 'draft',
        })

        if (result.success) {
          toast.success('Prescription created successfully', {
            description: `Prescription ID: ${result.prescription_id}`,
          })
          setIsOpen(false)
          setIsComposing(false)
          // Optionally refresh or update UI
        }
      } catch (error) {
        console.error('Error creating prescription:', error)
        toast.error('Failed to create prescription', {
          description: error.message,
        })
      }
    })
  }

  const getPrescriptionStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      issued: 'bg-green-100 text-green-800',
      amended: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status] || colors.draft
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Prescription</h3>
            {hasExistingPrescription && (
              <Badge variant="secondary" className="ml-2">
                {prescriptions.length} {prescriptions.length === 1 ? 'record' : 'records'}
              </Badge>
            )}
          </div>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="gap-2"
              disabled={isPending}
            >
              <Plus className="w-4 h-4" />
              New Prescription
            </Button>
          </DialogTrigger>
        </div>

        {/* Prescription History */}
        {prescriptions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Prescription History</p>
            {prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Prescription #{prescription.id.slice(0, 8)}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getPrescriptionStatusColor(prescription.status)}`}
                    >
                      {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Created: {new Date(prescription.created_at).toLocaleDateString()}
                    {prescription.issued_at && (
                      <span>
                        {' '}
                        • Issued: {new Date(prescription.issued_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                  {prescription.clinical_summary && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {prescription.clinical_summary}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 border border-dashed rounded-lg bg-gray-50 text-center">
            <p className="text-sm text-gray-500">No prescriptions yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Create a new prescription to get started
            </p>
          </div>
        )}
      </div>

      {/* Prescription Composer Dialog */}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Prescription</DialogTitle>
          <DialogDescription>
            Create a new prescription for this appointment
          </DialogDescription>
        </DialogHeader>

        {!isComposing ? (
          // Template Selection View
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-3">Select a template:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template)
                      setIsComposing(true)
                    }}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    {template.isDefault && (
                      <Badge variant="secondary" className="mt-2">
                        Recommended
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setIsComposing(true)}
                disabled={!selectedTemplate}
              >
                Continue with {selectedTemplate?.name || 'Template'}
              </Button>
            </div>
          </div>
        ) : (
          // Prescription Composer View
          <div>
            <PrescriptionComposer
              template={selectedTemplate}
              optionSets={optionSets}
              presets={presets}
              onSubmit={handleCreatePrescription}
              onBack={() => setIsComposing(false)}
              isLoading={isPending}
              appointmentContext={{
                appointmentId,
                patientId,
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
