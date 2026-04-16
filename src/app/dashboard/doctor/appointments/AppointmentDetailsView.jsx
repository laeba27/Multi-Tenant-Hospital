'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AppointmentPrescriptionManager } from '@/components/prescriptions/AppointmentPrescriptionManager'
import { Calendar, User, Pill, ChevronLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'

/**
 * Appointment Details View Component
 * 
 * Displays appointment information and integrates prescription manager
 * Defaults to showing the prescription creation interface
 */
export function AppointmentDetailsView({
  appointmentData,
  composerData = null,
  appointmentId,
  showPrescriptionComposer = true,
}) {
  const { appointment, prescriptions, appointmentStatus, hasPrescription } = appointmentData
  const {
    templates = [],
    optionSets = [],
    selectedTemplate = null,
    presets = [],
  } = composerData || {}

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    draft: 'bg-blue-100 text-blue-800',
    issued: 'bg-green-100 text-green-800',
    amended: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/doctor/appointments">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Write Prescription</h1>
              <p className="text-sm text-gray-600">for {appointment.patient.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/dashboard/doctor/ai/${appointmentId}/prescribe/ai`}>
                <Sparkles className="h-4 w-4" />
                AI Prescribe
              </Link>
            </Button>
            {appointmentStatus && (
              <Badge className={statusColors[appointmentStatus] || 'bg-gray-100 text-gray-800'}>
                {appointmentStatus}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Two Column Layout */}
        <div className={`grid grid-cols-1 ${showPrescriptionComposer ? 'lg:grid-cols-3' : ''} gap-6`}>
          {/* Left Column: Patient & Appointment Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Patient Information Card */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Patient Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold tracking-wide">Full Name</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{appointment.patient.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold tracking-wide">Registration No</p>
                  <p className="font-mono text-sm text-gray-900 mt-1">{appointment.patient.registrationNo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold tracking-wide">Email</p>
                  <p className="text-sm text-gray-900 mt-1">{appointment.patient.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold tracking-wide">Mobile</p>
                  <p className="text-sm text-gray-900 mt-1">{appointment.patient.mobile || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Appointment Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Appointment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold tracking-wide">Date</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold tracking-wide">Time Slot</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{appointment.appointmentSlot || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold tracking-wide">Department</p>
                  <p className="text-sm text-gray-900 mt-1">{appointment.department}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold tracking-wide">Chief Complaint</p>
                  <div className="mt-1 p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="text-sm text-gray-900">
                      {appointment.reason || 'No chief complaint recorded'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {showPrescriptionComposer && (
            <div className="lg:col-span-2">
              <Card className="border-2 border-indigo-200 bg-white shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 text-white p-2 rounded-lg">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-indigo-900">New Prescription</CardTitle>
                      <CardDescription>
                        Select a template and fill in prescription details
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {templates.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">No templates available</p>
                      <Link href="/dashboard/doctor/prescriptions">
                        <Button variant="outline">Create a template first</Button>
                      </Link>
                    </div>
                  ) : (
                    <AppointmentPrescriptionManager
                      appointmentId={appointmentId}
                      patientId={appointment.patient.id}
                      hasExistingPrescription={hasPrescription}
                      prescriptions={prescriptions}
                      templates={templates}
                      optionSets={optionSets}
                      presets={presets}
                      defaultTemplate={selectedTemplate}
                    />
                  )}
                </CardContent>
              </Card>

              {selectedTemplate && templates.length > 0 && (
                <Card className="mt-6 border-indigo-100">
                  <CardHeader>
                    <CardTitle className="text-base">Selected Template</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium text-gray-900">{selectedTemplate.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{selectedTemplate.description}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-indigo-50 p-3 rounded">
                        <p className="text-xs text-gray-600 uppercase font-semibold">Sections</p>
                        <p className="text-2xl font-bold text-indigo-600 mt-1">
                          {selectedTemplate.sections?.length || 0}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-xs text-gray-600 uppercase font-semibold">Fields</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                          {selectedTemplate.sections?.reduce((sum, s) => sum + (s.fields?.length || 0), 0) || 0}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded">
                        <p className="text-xs text-gray-600 uppercase font-semibold">Type</p>
                        <p className="text-lg font-bold text-purple-600 mt-1">
                          {selectedTemplate.specialty || 'General'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
