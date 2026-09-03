'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { ChevronLeft } from 'lucide-react'


export function PatientDetails({ patient, userRole, onEdit, onClose }) {
  if (!patient) {
    return null
  }

  const profile = patient.profile
  const canEdit = ['hospital_admin', 'doctor', 'receptionist'].includes(userRole)

  return (
    <div className="space-y-6">
      {/* Breadcrumb.
          This replaces the old "Close" button: a details view reached by
          clicking a row reads as a place you navigated to, so the way back
          should look like navigation rather than dismissing a dialog. */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm">
          <li>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-gray-500 transition hover:text-brand-blue"
            >
              <ChevronLeft className="h-4 w-4" />
              Patients
            </button>
          </li>
          <li aria-hidden className="text-gray-300">
            /
          </li>
          <li className="font-medium text-gray-900" aria-current="page">
            {profile?.name || 'Patient'}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url} alt={profile?.name} />
            <AvatarFallback>
              {profile?.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">{profile?.name}</h2>
            {/* Both identifiers, labelled, so it is obvious which is which:
                the registration number works across hospitals, the patient ID
                is issued by this hospital alone. */}
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              {profile?.registration_no && (
                <span>
                  Registration No.{' '}
                  <span className="font-mono text-gray-700">{profile.registration_no}</span>
                </span>
              )}
              {patient.id && (
                <span>
                  Patient ID <span className="font-mono text-gray-700">{patient.id}</span>
                </span>
              )}
            </div>
            <Badge className={`mt-2 ${patient.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {patient.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => onEdit?.(patient)}>Edit</Button>
        )}
      </div>

      <hr className="my-6 border-gray-200" />

      {/* Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{profile?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{profile?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mobile</p>
                  <p className="font-medium">{profile?.mobile}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gender</p>
                  <p className="font-medium">{profile?.gender || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="font-medium">
                    {profile?.date_of_birth
                      ? new Date(profile.date_of_birth).toLocaleDateString()
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Blood Group</p>
                  <p className="font-medium">{profile?.blood_group || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Aadhar Number</p>
                  <p className="font-medium">{profile?.aadhaar_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Registration Number</p>
                  <p className="font-medium font-mono">{profile?.registration_no || '-'}</p>
                  <p className="mt-0.5 text-xs text-gray-500">Valid across hospitals</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Patient ID</p>
                  <p className="font-medium font-mono">{patient.id || '-'}</p>
                  <p className="mt-0.5 text-xs text-gray-500">Issued by this hospital</p>
                </div>
              </div>

              <hr className="my-4 border-gray-200" />

              <div>
                <p className="text-sm text-gray-600 mb-2">Address</p>
                <p className="font-medium">
                  {profile?.address || '-'}, {profile?.city || ''}{' '}
                  {profile?.state || ''} {profile?.pincode || ''}
                </p>
                <p className="text-sm text-gray-600">{profile?.country || ''}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Information */}
        <TabsContent value="medical">
          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Medical History</p>
                <p className="font-medium">{patient.chronic_conditions || '-'}</p>
              </div>

              <hr className="my-4 border-gray-200" />

              <div>
                <p className="text-sm text-gray-600 mb-2">Allergies</p>
                <p className="font-medium">{patient.allergies || '-'}</p>
              </div>

              <hr className="my-4 border-gray-200" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Last Visit</p>
                  <p className="font-medium">
                    {patient.last_visit
                      ? new Date(patient.last_visit).toLocaleDateString()
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Registration Date</p>
                  <p className="font-medium">
                    {new Date(
                      patient.created_at
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {patient.medical_notes && (
                <>
                  <hr className="my-4 border-gray-200" />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Notes</p>
                    <p className="font-medium">{patient.medical_notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Information */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Contact Name</p>
                  <p className="font-medium">
                    {patient.emergency_contact_name || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contact Phone</p>
                  <p className="font-medium">
                    {patient.emergency_contact_mobile || '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insurance Information */}
        <TabsContent value="insurance">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Insurance Provider</p>
                  <p className="font-medium">
                    {patient.insurance_provider || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Policy Number</p>
                  <p className="font-medium">
                    {patient.insurance_number || '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
