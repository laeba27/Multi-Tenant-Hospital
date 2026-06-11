'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createPrescriptionFromAppointment } from '@/actions/prescriptions'
import { PrescriptionComposer } from './PrescriptionComposer'

/**
 * Component to manage prescriptions within an appointment context
 */
export function AppointmentPrescriptionManager({
  appointmentId,
  appointment = null,
  patientId,
  doctor = null,
  hospital = null,
  hasExistingPrescription = false,
  prescriptions = [],
  templates = [],
  optionSets = [],
  presets = [],
  defaultTemplate = null,
}) {
  const initialTemplateId = (defaultTemplate || templates[0] || null)?.id || ''
  const [activeTemplateId, setActiveTemplateId] = useState(initialTemplateId)
  const [isPending, startTransition] = useTransition()

  const resolvedTemplate = templates.find((template) => template.id === activeTemplateId)
    || defaultTemplate
    || templates[0]
    || null

  useEffect(() => {
    setActiveTemplateId((defaultTemplate || templates[0] || null)?.id || '')
  }, [defaultTemplate, templates])

  const handleCreatePrescription = (prescriptionData) => {
    startTransition(async () => {
      try {
        const result = await createPrescriptionFromAppointment({
          appointmentId,
          patientId,
          templateId: resolvedTemplate?.id,
          templateVersionId: resolvedTemplate?.versionId,
          prescriptionValues: prescriptionData.values || [],
          clinicalSummary: prescriptionData.clinicalSummary,
          followUpDate: prescriptionData.followUpDate,
          status: 'issued',
        })

        if (result.success) {
          toast.success('Prescription issued successfully')
        }
      } catch (error) {
        console.error('Error creating prescription:', error)
        toast.error('Failed to issue prescription', {
          description: error.message,
        })
      }
    })
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-800">No prescription templates available</p>
      </div>
    )
  }

  return (
    <PrescriptionComposer
      appointment={appointment || { id: appointmentId, patient: { id: patientId } }}
      doctor={doctor || { specialization: 'General practice' }}
      hospital={hospital || { name: 'Hospital' }}
      templates={templates}
      optionSets={optionSets}
      selectedTemplate={resolvedTemplate}
      onTemplateChange={setActiveTemplateId}
      presets={presets}
      onSubmit={handleCreatePrescription}
      isLoading={isPending}
    />
  )
}
