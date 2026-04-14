'use client'

import { useState, useEffect } from 'react'
import { getDoctorAvailableSlots } from '@/actions/appointments'
import { getTreatments } from '@/actions/treatments'
import { useHospitalDoctorsAndDepartments } from '@/hooks/useHospitalDoctorsAndDepartments'
import { usePatientDetails } from '@/hooks/usePatientDetails'
import { useUserDetails } from '@/hooks/use-user-details'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Calendar, Stethoscope, Clock, Pill, Plus, X } from 'lucide-react'
import React from 'react'

export function BookAppointment({ hospitalId: hospitalIdProp, patientId, patient: passedPatient, onPreview, onSuccess, onSkip }) {
  const { profile, hospital, isLoading: loadingUser } = useUserDetails()
  const hospitalId = hospitalIdProp || hospital?.registration_no || profile?.hospital_id
  const { departments, doctors: allDoctors, loading: loadingDeptsDocs, error: deptError } = useHospitalDoctorsAndDepartments(hospitalId)

  const [treatments, setTreatments] = useState([])
  const [loadingTreatments, setLoadingTreatments] = useState(false)
  const [filteredTreatments, setFilteredTreatments] = useState([])

  const actualPatientId = patientId || passedPatient?.id
  const shouldFetch = !passedPatient || !passedPatient.profile
  const { patient: fetchedPatient, loading: loadingPatient } = usePatientDetails(
    shouldFetch ? actualPatientId : null,
    hospitalId
  )

  const patient = fetchedPatient || (passedPatient ? {
    id: passedPatient.id,
    profile_id: passedPatient.profile_id,
    name: passedPatient.profile?.name || passedPatient.name || 'Unknown',
    registration_no: passedPatient.profile?.registration_no || passedPatient.registration_no || 'N/A',
    mobile: passedPatient.profile?.mobile || passedPatient.mobile || 'N/A',
    gender: passedPatient.profile?.gender || passedPatient.gender || 'N/A',
    date_of_birth: passedPatient.profile?.date_of_birth || passedPatient.date_of_birth,
    blood_group: passedPatient.blood_group,
    avatar_url: passedPatient.profile?.avatar_url,
    height: passedPatient.height,
    weight: passedPatient.weight,
    marital_status: passedPatient.marital_status,
    emergency_contact_name: passedPatient.emergency_contact_name,
    emergency_contact_mobile: passedPatient.emergency_contact_mobile,
    insurance_provider: passedPatient.insurance_provider,
    insurance_number: passedPatient.insurance_number,
    allergies: passedPatient.allergies,
    chronic_conditions: passedPatient.chronic_conditions,
    medical_notes: passedPatient.medical_notes
  } : null)

  const [filteredDoctors, setFilteredDoctors] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedDoc, setSelectedDoc] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [appointmentType, setAppointmentType] = useState('consultation')
  const [reason, setReason] = useState('')
  const [selectedTreatments, setSelectedTreatments] = useState([])
  const [customTreatmentName, setCustomTreatmentName] = useState('')
  const [customTreatmentPrice, setCustomTreatmentPrice] = useState('')
  const [isFetchingSlots, setIsFetchingSlots] = useState(false)

  const showTreatment = appointmentType === 'treatment' || appointmentType === 'both'
  const selectedDoctorObj = filteredDoctors.find(d => d.id === selectedDoc)

  useEffect(() => {
    if (selectedDept && allDoctors.length > 0) {
      const filtered = allDoctors.filter(d => d.department_id === selectedDept)
      setFilteredDoctors(filtered)
      setSelectedDoc('')
      setAvailableSlots([])
    } else {
      setFilteredDoctors([])
    }
  }, [selectedDept, allDoctors])

  useEffect(() => {
    async function fetchSlots() {
      if (!selectedDoc || !selectedDate || !hospitalId) return
      setIsFetchingSlots(true)
      try {
        const result = await getDoctorAvailableSlots(selectedDoc, selectedDate, hospitalId)
        setAvailableSlots(result.slots || [])
      } catch (e) {
        toast.error('Failed to load slots')
      } finally {
        setIsFetchingSlots(false)
      }
    }
    fetchSlots()
  }, [selectedDoc, selectedDate, hospitalId])

  // Filter treatments by selected department
  useEffect(() => {
    if (selectedDept && treatments.length > 0) {
      const filtered = treatments.filter(t => !t.department_id || t.department_id === selectedDept)
      setFilteredTreatments(filtered)
    } else {
      setFilteredTreatments(treatments)
    }
  }, [selectedDept, treatments])

  useEffect(() => {
    async function loadTreatments() {
      if (!hospitalId) return
      setLoadingTreatments(true)
      try {
        const result = await getTreatments(hospitalId)
        if (result.data) {
          setTreatments(result.data)
          setFilteredTreatments(result.data)
        }
      } catch (e) {
        console.error('Failed to load treatments:', e)
      } finally {
        setLoadingTreatments(false)
      }
    }
    loadTreatments()
  }, [hospitalId])

  const addTreatment = (treatment) => {
    if (selectedTreatments.find(t => t.id === treatment.id)) {
      toast.error('Treatment already added')
      return
    }
    setSelectedTreatments([...selectedTreatments, {
      id: treatment.id,
      name: treatment.treatment_name,
      price: parseFloat(treatment.base_price),
      discount: 0
    }])
  }

  const addCustomTreatment = () => {
    if (!customTreatmentName || !customTreatmentPrice) {
      toast.error('Please enter treatment name and price')
      return
    }
    setSelectedTreatments([...selectedTreatments, {
      id: `custom-${Date.now()}`,
      name: customTreatmentName,
      price: parseFloat(customTreatmentPrice),
      discount: 0,
      isCustom: true
    }])
    setCustomTreatmentName('')
    setCustomTreatmentPrice('')
  }

  const removeTreatment = (treatmentId) => {
    setSelectedTreatments(selectedTreatments.filter(t => t.id !== treatmentId))
  }

  const updateTreatmentDiscount = (treatmentId, discount) => {
    setSelectedTreatments(selectedTreatments.map(t =>
      t.id === treatmentId ? { ...t, discount: parseFloat(discount) || 0 } : t
    ))
  }

  // Calculate totals properly
  const consultationFee = (appointmentType === 'consultation' || appointmentType === 'both')
    ? parseFloat(selectedDoctorObj?.consultation_fee || 0)
    : 0

  const treatmentsTotal = selectedTreatments.reduce((sum, t) => sum + (parseFloat(t.price || 0) - parseFloat(t.discount || 0)), 0)
  const totalAmount = consultationFee + treatmentsTotal

  const handlePreview = () => {
    if (!selectedDept || !selectedDoc || !selectedDate || !selectedSlot) {
      toast.error('Please fill all required fields')
      return
    }

    // Validate based on appointment type
    if (showTreatment && selectedTreatments.length === 0) {
      toast.error('Please add at least one treatment')
      return
    }

    const doc = filteredDoctors.find(d => d.id === selectedDoc)
    const dept = departments.find(d => d.id === selectedDept)

    // Build treatment_details array properly
    const treatmentDetailsArray = selectedTreatments.map(t => ({
      id: t.id,
      name: t.name,
      price: t.price,
      discount: t.discount
    }))

    const data = {
      hospital_id: hospitalId,
      hospital_name: hospital?.name || 'Hospital',
      hospital_registration_no: hospital?.registration_no,
      patient_id: patient?.id || patientId,
      department_id: selectedDept,
      department_name: dept?.name || null,
      doctor_id: selectedDoc,
      doctor_name: doc?.name || null,
      doctor_consultation_fee: doc?.consultation_fee || 0,
      appointment_date: selectedDate,
      appointment_slot: selectedSlot,
      appointment_type: appointmentType,
      reason: reason || null,
      consultation_fee_snapshot: consultationFee,
      treatment_details: treatmentDetailsArray,
      treatmentsTotal: treatmentsTotal,
      // Legacy fields for backward compatibility
      treatmentPrice: treatmentsTotal,
      treatmentDiscount: 0
    }
    onPreview?.(data)
    onSuccess?.(data)
  }

  const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="flex flex-col bg-white" style={{ height: '600px' }}>
      {/* Progress Header */}
      <div className="border-b px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Book Appointment</h2>
            <p className="text-xs text-gray-500">Step 3 of 5</p>
          </div>
        </div>
      </div>

      {loadingUser && (
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      )}

      {!loadingUser && !hospitalId && (
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm text-red-500">Unable to load hospital information</p>
        </div>
      )}

      {!loadingUser && hospitalId && (
        <div className="flex flex-1 overflow-hidden">
          {/* Patient Sidebar */}
          <div className="w-56 border-r bg-gray-50 flex-shrink-0 overflow-y-auto">
            <div className="p-3 space-y-3">
              {loadingPatient ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-12 w-12 rounded-full bg-gray-200 mx-auto" />
                  <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto" />
                  <div className="h-2 bg-gray-200 rounded w-1/2 mx-auto" />
                </div>
              ) : patient ? (
                <div className="space-y-3">
                  {/* Patient Avatar & Name */}
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-base font-semibold mx-auto mb-2">
                      {getInitials(patient.name)}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">{patient.name}</p>
                    <p className="text-xs font-mono text-gray-600 truncate">{patient.id || patient.registration_no}</p>
                  </div>

                  {/* Patient Details */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Age</p>
                        <p className="font-semibold text-gray-900">
                          {patient.date_of_birth || patient.profile?.date_of_birth
                            ? new Date().getFullYear() - new Date(patient.date_of_birth || patient.profile?.date_of_birth).getFullYear()
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Gender</p>
                        <p className="font-semibold capitalize text-gray-900">{patient.gender || patient.profile?.gender || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Blood</p>
                        <p className="font-semibold text-gray-900">{patient.blood_group || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Mobile</p>
                        <p className="font-medium text-gray-900 text-xs truncate">{patient.mobile || patient.profile?.mobile || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Allergies Warning */}
                    {patient.allergies && (
                      <div className="bg-amber-50 border border-amber-200 rounded p-2">
                        <p className="text-xs font-medium text-amber-700 mb-0.5">Allergies</p>
                        <p className="text-xs text-amber-900 truncate">{patient.allergies}</p>
                      </div>
                    )}

                    {/* Chronic Conditions */}
                    {patient.chronic_conditions && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-xs font-medium text-blue-700 mb-0.5">Conditions</p>
                        <p className="text-xs text-blue-900 truncate">{patient.chronic_conditions}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center">Unable to load patient</p>
              )}
            </div>
          </div>

          {/* Booking Form */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">

              {deptError && (
                <div className="bg-red-50 border border-red-200 rounded px-3 py-2">
                  <p className="text-xs text-red-700">{deptError}</p>
                </div>
              )}

              {/* Appointment Type */}
              <div className="grid grid-cols-3 gap-2">
                <Label className="text-xs font-medium text-gray-700 col-span-3">Booking Type</Label>
                <div className="flex rounded border border-gray-200 p-0.5 bg-gray-50 gap-0.5 col-span-3">
                  {[
                    { value: 'consultation', label: 'Consultation', icon: Stethoscope },
                    { value: 'treatment', label: 'Treatment', icon: Pill },
                    { value: 'both', label: 'Both', icon: Stethoscope },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setAppointmentType(value)
                        // Clear treatments when switching type
                        if (value === 'consultation') {
                          setSelectedTreatments([])
                        }
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded text-xs font-medium transition-all ${
                        appointmentType === value
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department + Doctor */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">Department *</Label>
                  <Select value={selectedDept} onValueChange={(val) => {
                    setSelectedDept(val)
                    setSelectedDoc('')
                  }} disabled={departments.length === 0 && !loadingDeptsDocs}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={loadingDeptsDocs ? 'Loading...' : departments.length === 0 ? 'None' : 'Select'} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">Doctor *</Label>
                  <Select value={selectedDoc} onValueChange={setSelectedDoc} disabled={!selectedDept || filteredDoctors.length === 0}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={
                        !selectedDept ? 'Select dept' : filteredDoctors.length === 0 ? 'None' : 'Select'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDoctors.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          <div className="flex items-center justify-between w-full pr-4">
                            <span className="font-medium text-sm">Dr. {d.name}</span>
                            {d.consultation_fee && appointmentType !== 'treatment' && (
                              <span className="text-xs text-gray-600 whitespace-nowrap">
                                Fee: ₹{d.consultation_fee}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date + Slot */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">Date *</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    disabled={!selectedDoc}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">Time Slot *</Label>
                  <Select
                    value={selectedSlot}
                    onValueChange={setSelectedSlot}
                    disabled={!selectedDate || availableSlots.length === 0 || isFetchingSlots}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={
                        !selectedDate ? 'Select date' : isFetchingSlots ? 'Loading...' : availableSlots.length === 0 ? 'No slots' : 'Select'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSlots.map(s => (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">{s}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Consultation Fee Display */}
              {(appointmentType === 'consultation' || appointmentType === 'both') && selectedDoctorObj?.consultation_fee && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                    <p className="text-xs text-blue-900 font-medium">Consultation Fee</p>
                  </div>
                  <p className="text-sm font-bold text-blue-600">₹{selectedDoctorObj.consultation_fee}</p>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">Reason / Notes</Label>
                <Textarea
                  placeholder="Purpose of visit..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={1}
                  className="resize-none text-sm"
                />
              </div>

              {/* Treatments */}
              {showTreatment && (
                <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-gray-600" />
                      <p className="text-xs font-semibold text-gray-700">Treatments</p>
                    </div>
                    <span className="text-xs font-medium text-gray-900">Total: ₹{treatmentsTotal.toFixed(2)}</span>
                  </div>

                  {/* Treatment Selection */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6">
                      <Label className="text-[10px] text-gray-500">Select Treatment</Label>
                      <Select
                        value=""
                        onValueChange={(val) => {
                          if (val === 'custom') return
                          const treatment = filteredTreatments.find(t => t.id === val)
                          if (treatment) addTreatment(treatment)
                        }}
                        disabled={filteredTreatments.length === 0 || loadingTreatments}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder={loadingTreatments ? 'Loading...' : filteredTreatments.length === 0 ? 'No treatments' : 'Add treatment'} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredTreatments.filter(t => t.is_active !== false).map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex items-center justify-between w-full pr-4">
                                <span className="text-xs truncate">{t.treatment_name}</span>
                                <span className="text-xs text-gray-600">₹{t.base_price}</span>
                              </div>
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">+ Custom Treatment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-3">
                      <Label className="text-[10px] text-gray-500">Custom Name</Label>
                      <Input
                        placeholder="Name"
                        value={customTreatmentName}
                        onChange={(e) => setCustomTreatmentName(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] text-gray-500">Price</Label>
                      <Input
                        type="number"
                        placeholder="₹"
                        value={customTreatmentPrice}
                        onChange={(e) => setCustomTreatmentPrice(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        onClick={addCustomTreatment}
                        size="sm"
                        className="h-8 w-full px-1"
                        disabled={!customTreatmentName || !customTreatmentPrice}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Selected Treatments List */}
                  {selectedTreatments.length > 0 && (
                    <div className="space-y-1.5 max-h-28 overflow-y-auto">
                      {selectedTreatments.map(t => (
                        <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-2">
                          <span className="flex-1 text-xs font-medium truncate">{t.name}</span>
                          <span className="text-xs text-gray-600">₹{t.price}</span>
                          <Input
                            type="number"
                            placeholder="Disc"
                            value={t.discount || ''}
                            onChange={(e) => updateTreatmentDiscount(t.id, e.target.value)}
                            className="h-6 w-12 text-xs px-1"
                          />
                          <span className="text-xs font-semibold text-gray-900 w-14 text-right">₹{(parseFloat(t.price || 0) - parseFloat(t.discount || 0)).toFixed(2)}</span>
                          <button
                            onClick={() => removeTreatment(t.id)}
                            className="text-red-500 hover:text-red-700 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="border-t px-4 py-3 bg-gray-50 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-gray-500">Total: </span>
                <span className="font-bold text-gray-900">₹{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onSkip} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="button"
                  onClick={handlePreview}
                  className="h-8 text-xs bg-gray-900 hover:bg-gray-800"
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
