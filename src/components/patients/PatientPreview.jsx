'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Calendar } from 'lucide-react'

export function PatientPreview({ patient, onConfirm, onEdit, isLoading }) {
  if (!patient) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Patient information not available</AlertDescription>
      </Alert>
    )
  }

  const profile = patient.profile || {}
  const getValue = (value) => (value === null || value === undefined || value === '' ? 'N/A' : value)
  const formattedDob = patient.date_of_birth || profile.date_of_birth
    ? new Date(patient.date_of_birth || profile.date_of_birth).toLocaleDateString()
    : 'N/A'

  return (
    <div className="flex flex-col bg-white" style={{ height: '600px' }}>
      {/* Header */}
      <div className="border-b px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Patient Registered</h2>
            <p className="text-xs text-gray-500">Step 1 of 2</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Patient Summary */}
        <div className="border rounded-lg p-4 space-y-3 bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-lg">
              {patient.profile?.name?.charAt(0) || 'P'}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">{patient.profile?.name || 'N/A'}</h3>
              <p className="text-sm text-gray-600 font-mono">{patient.id || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-gray-600">Mobile</p>
              <p className="font-semibold text-gray-900">{patient.profile?.mobile || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">Gender</p>
              <p className="font-semibold text-gray-900 capitalize">{patient.profile?.gender || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">Age</p>
              <p className="font-semibold text-gray-900">
                {patient.profile?.date_of_birth
                  ? new Date().getFullYear() - new Date(patient.profile.date_of_birth).getFullYear()
                  : 'N/A'}
              </p>
            </div>
          </div>

          {(patient.profile?.email || patient.chronic_conditions || patient.allergies) && (
            <div className="pt-3 border-t space-y-1 text-xs">
              {patient.profile?.email && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Email</span>
                  <span className="font-medium text-gray-900 truncate max-w-[200px]">{patient.profile.email}</span>
                </div>
              )}
              {patient.chronic_conditions && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Chronic Conditions</span>
                  <span className="font-medium text-gray-900 truncate max-w-[200px]">{patient.chronic_conditions}</span>
                </div>
              )}
              {patient.allergies && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Allergies</span>
                  <span className="font-medium text-red-600 truncate max-w-[200px]">{patient.allergies}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {patient.emergency_contact_name && (
          <div className="border rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">Emergency Contact</p>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Name</span>
                <span className="font-medium">{patient.emergency_contact_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mobile</span>
                <span className="font-medium">{patient.emergency_contact_mobile || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 bg-gray-50 flex gap-3">
        <Button
          variant="outline"
          onClick={onEdit}
          disabled={isLoading}
          className="flex-1 h-9 text-xs"
        >
          Edit Details
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 h-9 text-xs bg-gray-900 hover:bg-gray-800"
        >
          <Calendar className="h-3 w-3 mr-1" />
          Book Appointment
        </Button>
      </div>
    </div>
  )
}
