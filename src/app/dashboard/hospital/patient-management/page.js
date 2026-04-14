'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { usePermissions } from '@/hooks/use-permissions'
import { PatientForm } from '@/components/patients/PatientForm'
import { PatientList } from '@/components/patients/PatientList'
import { PatientDetails } from '@/components/patients/PatientDetails'
import { BookAppointment } from '@/components/appointments/BookAppointment'
import { AppointmentConfirmation } from '@/components/appointments/AppointmentConfirmation'
import { InvoiceGeneration } from '@/components/invoices/InvoiceGeneration'
import { AppointmentInvoicePrint } from '@/components/appointments/AppointmentInvoicePrint'
import { AppointmentsList } from '@/components/appointments/AppointmentsList'
import { PatientPreview } from '@/components/patients/PatientPreview'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Lock, Calendar } from 'lucide-react'
import { PatientLookup } from '@/components/patients/PatientLookup'
import { PatientTypeChoice } from '@/components/patients/PatientTypeChoice'
import { bookAppointment } from '@/actions/appointments'

export default function PatientManagementPage() {
  const { user, loading: userLoading } = useUser()
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingPatient, setEditingPatient] = useState(null)
  
  // Wizard States: choice -> lookup/register -> preview -> appointment -> appointmentConfirm -> invoice -> print
  const [wizardStep, setWizardStep] = useState('choice')
  // 'choice' | 'lookup' | 'register' | 'preview' | 'appointment' | 'appointmentConfirm' | 'invoice' | 'print'
  const [patientTypeChoice, setPatientTypeChoice] = useState(null) // 'existing' | 'new'
  const [selectedPatientForAppointment, setSelectedPatientForAppointment] = useState(null)
  const [appointmentDraft, setAppointmentDraft] = useState(null)
  const [createdInvoice, setCreatedInvoice] = useState(null)
  const [createdAppointment, setCreatedAppointment] = useState(null)
  const [invoiceHospitalDetails, setInvoiceHospitalDetails] = useState(null)
  const [isBookingAppointment, setIsBookingAppointment] = useState(false)

  // Temporary RBAC bypass for development
  const canViewPatients = true 
  const canCreatePatients = true 
  const canUpdatePatients = true 
  const canDeletePatients = true 

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          You must be logged in to access patient management.
        </AlertDescription>
      </Alert>
    )
  }

  /*
  if (!canViewPatients) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Your role ({user.profile?.role}) does not have access to patient
            management.
          </p>
        </CardContent>
      </Card>
    )
  }
  */

  const handlePatientCreated = (result) => {
    if (result?.patient) {
      setSelectedPatientForAppointment(result.patient)
      setWizardStep('preview') // Move to preview after registration
    } else {
      setShowForm(false)
    }
    setEditingPatient(null)
    setRefreshKey((prev) => prev + 1)
  }

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient)
  }

  const handleEditPatient = (patient) => {
    setEditingPatient(patient)
    setShowForm(true)
  }

  const handleDirectBookAppointment = (patient) => {
    setSelectedPatientForAppointment(patient)
    setWizardStep('appointment') // Go to appointment when booking from patient list
    setShowForm(true)
  }

  // Handle initial choice: Existing Patient
  const handleChoiceExisting = () => {
    setPatientTypeChoice('existing')
    setWizardStep('lookup')
  }

  // Handle initial choice: New Patient
  const handleChoiceNew = () => {
    setPatientTypeChoice('new')
    setWizardStep('register')
  }

  // Handle patient selection from lookup
  const handlePatientSelected = (patient) => {
    setSelectedPatientForAppointment(patient)
    setWizardStep('preview') // Go to preview after patient lookup
  }

  // Handle preview confirmation - go directly to appointment
  const handlePreviewConfirm = () => {
    setWizardStep('appointment')
  }

  const handleAppointmentPreview = (draft) => {
    setAppointmentDraft(draft)
    setWizardStep('appointmentConfirm')
  }

  const handleAppointmentConfirmBooking = async () => {
    if (!appointmentDraft) return
    setIsBookingAppointment(true)
    try {
      const res = await bookAppointment({
        hospital_id: appointmentDraft.hospital_id,
        patient_id: appointmentDraft.patient_id,
        department_id: appointmentDraft.department_id,
        doctor_id: appointmentDraft.doctor_id,
        appointment_date: appointmentDraft.appointment_date,
        appointment_slot: appointmentDraft.appointment_slot,
        appointment_type: appointmentDraft.appointment_type,
        reason: appointmentDraft.reason,
        consultation_fee_snapshot: appointmentDraft.consultation_fee_snapshot,
        treatment_details: appointmentDraft.treatment_details
      }, user.id)

      if (res.success) {
        const enrichedAppointment = {
          ...res.appointment,
          department_name: appointmentDraft.department_name,
          doctor_name: appointmentDraft.doctor_name,
          appointment_type: appointmentDraft.appointment_type,
          appointment_slot: appointmentDraft.appointment_slot,
          appointment_date: appointmentDraft.appointment_date,
          reason: appointmentDraft.reason,
          consultation_fee_snapshot: appointmentDraft.consultation_fee_snapshot,
          treatment_details: appointmentDraft.treatment_details,
          treatmentPrice: appointmentDraft.treatmentPrice,
          treatmentDiscount: appointmentDraft.treatmentDiscount
        }
        setCreatedAppointment(enrichedAppointment)
        setWizardStep('invoice')
      } else {
        toast.error('Failed to book appointment')
      }
    } catch (error) {
      console.error(error)
      toast.error('Appointment booking failed')
    } finally {
      setIsBookingAppointment(false)
    }
  }

  const handleInvoiceGenerated = (invoice) => {
    setCreatedInvoice(invoice)
    if (invoice.hospital) {
      setInvoiceHospitalDetails(invoice.hospital)
    }
    setWizardStep('print') // After invoice, show print
  }

  const resetModal = (isOpen) => {
    setShowForm(isOpen)
    if (!isOpen) {
      setEditingPatient(null)
      setPatientTypeChoice(null)
      setSelectedPatientForAppointment(null)
      setAppointmentDraft(null)
      setCreatedAppointment(null)
      setCreatedInvoice(null)
      setInvoiceHospitalDetails(null)
      setWizardStep('choice') // Reset to choice
    }
  }

  const handleCloseDetails = () => {
    setSelectedPatient(null)
  }

  const getRoleDescription = (role) => {
    const descriptions = {
      hospital_admin: 'Full access to patient management',
      doctor: 'Can view and manage patient records',
      reception: 'Can register and manage patient appointments',
      super_admin: 'Full system access',
    }
    return descriptions[role] || 'Limited access'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Patient Management</h1>
        <div className="flex items-center gap-2">
           {/* <Button variant="outline" onClick={() => resetModal(true)}>
             + New Registration Flow
           </Button> */}
        </div>
        <p className="text-gray-600 mt-2">
          Manage patient profiles, registrations, and hospital associations
        </p>
      </div>

      {/* User Role Info */}
      {/* <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium">{user.profile?.role}</span>:{' '}
          {getRoleDescription(user.profile?.role)}
        </AlertDescription>
      </Alert> */}

      {/* Main Content */}
      {selectedPatient ? (
        // Patient Details View
        <Card>
          <CardHeader>
            <CardTitle>Patient Details</CardTitle>
          </CardHeader>
          <CardContent>
            <PatientDetails
              patient={selectedPatient}
              userRole={user.profile?.role}
              onEdit={canUpdatePatients ? handleEditPatient : null}
              onClose={handleCloseDetails}
            />
          </CardContent>
        </Card>
      ) : (
        // Tabs View
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Patient List</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
          </TabsList>

          {/* Patient List Tab */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Patients</CardTitle>
                    <CardDescription>
                      Manage patients registered with your hospital
                    </CardDescription>
                  </div>
                  {canCreatePatients && (
                    <Dialog open={showForm} onOpenChange={resetModal}>
                      <Button onClick={() => setShowForm(true)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        + New Appointment
                      </Button>
                      <DialogContent className="max-w-4xl! max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {wizardStep === 'choice' ? 'New Appointment Booking'
                              : wizardStep === 'lookup' ? 'Step 1: Search Existing Patient'
                              : wizardStep === 'register' ? (editingPatient ? 'Edit Patient' : 'Step 1: Register New Patient')
                              : wizardStep === 'preview' ? 'Step 2: Review Patient Details'
                              : wizardStep === 'appointment' ? 'Step 3: Book Appointment'
                              : wizardStep === 'appointmentConfirm' ? 'Step 4: Confirm Appointment'
                              : wizardStep === 'invoice' ? 'Step 5: Generate Invoice'
                              : 'Appointment Complete'}
                           </DialogTitle>
                          <DialogDescription>
                            {wizardStep === 'choice' ? 'Are you an existing patient or registering for the first time?'
                              : wizardStep === 'lookup' ? 'Search by Patient ID, Email, Phone, or Name'
                              : wizardStep === 'register' ? 'Fill in the patient information below.'
                              : wizardStep === 'preview' ? 'Please review the patient details before proceeding.'
                              : wizardStep === 'appointment' ? 'Select department and doctor to book schedule.'
                              : wizardStep === 'appointmentConfirm' ? 'Review appointment details with hospital and doctor information.'
                              : wizardStep === 'invoice' ? 'Review billing details and process payment.'
                              : 'Print the receipt below.'}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="mt-4">
                          {wizardStep === 'choice' && (
                            <PatientTypeChoice
                              onSelectExisting={handleChoiceExisting}
                              onSelectNew={handleChoiceNew}
                              isLoading={false}
                            />
                          )}

                          {wizardStep === 'lookup' && (
                            <PatientLookup
                              hospitalId={user.profile?.hospital_id}
                              onSelectPatient={handlePatientSelected}
                              onCreateNew={handleChoiceNew}
                              isLoading={false}
                            />
                          )}

                          {wizardStep === 'register' && (
                            <PatientForm
                              onSuccess={handlePatientCreated}
                              currentUser={user}
                              editingPatient={editingPatient}
                            />
                          )}

                          {wizardStep === 'preview' && selectedPatientForAppointment && (
                            <PatientPreview
                              patient={selectedPatientForAppointment}
                              onConfirm={handlePreviewConfirm}
                              onEdit={() => {
                                if (patientTypeChoice === 'existing') {
                                  setWizardStep('lookup')
                                } else {
                                  setEditingPatient(selectedPatientForAppointment)
                                  setWizardStep('register')
                                }
                              }}
                              isLoading={false}
                            />
                          )}

                          {wizardStep === 'appointment' && selectedPatientForAppointment && (
                            <BookAppointment 
                              hospitalId={user.profile?.hospital_id} 
                              patient={selectedPatientForAppointment} 
                              currentUser={user}
                              onPreview={handleAppointmentPreview}
                              onSkip={() => resetModal(false)}
                            />
                          )}

                          {wizardStep === 'appointmentConfirm' && selectedPatientForAppointment && appointmentDraft && (
                            <AppointmentConfirmation
                              patient={selectedPatientForAppointment}
                              appointment={appointmentDraft}
                              onConfirm={handleAppointmentConfirmBooking}
                              onEdit={() => setWizardStep('appointment')}
                              isLoading={isBookingAppointment}
                            />
                          )}

                          {wizardStep === 'invoice' && selectedPatientForAppointment && createdAppointment && (
                            <InvoiceGeneration 
                              hospitalId={user.profile?.hospital_id} 
                              patient={selectedPatientForAppointment} 
                              appointment={createdAppointment}
                              currentUser={user}
                              onSuccess={handleInvoiceGenerated}
                              onSkip={() => resetModal(false)}
                            />
                          )}

                          {wizardStep === 'print' && selectedPatientForAppointment && createdInvoice && createdAppointment && (
                            <AppointmentInvoicePrint
                              hospital={invoiceHospitalDetails || user.profile?.hospital}
                              patient={selectedPatientForAppointment}
                              appointment={createdAppointment}
                              invoice={createdInvoice}
                            />
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <PatientList
                  hospitalId={user.profile?.hospital_id}
                  userRole={user.profile?.role}
                  onViewPatient={handleSelectPatient}
                  onEditPatient={handleEditPatient}
                  onBookAppointment={handleDirectBookAppointment}
                  refreshKey={refreshKey}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments">
            <AppointmentsList
              hospitalId={user.profile?.hospital_id}
              onAppointmentSelect={(appointment) => {
                // Handle appointment selection if needed
                console.log('Selected appointment:', appointment)
              }}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
