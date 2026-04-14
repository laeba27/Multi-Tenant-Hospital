'use client'

import { useEffect, useState } from 'react'
import { getHospitalAppointments } from '@/actions/appointments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Calendar, Clock, User, Stethoscope, Search, X } from 'lucide-react'

export function AppointmentsList({ hospitalId, onAppointmentSelect }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'scheduled', 'completed', 'cancelled'
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchAppointments()
  }, [hospitalId])

  const fetchAppointments = async () => {
    try {
      if (!hospitalId) {
        console.warn('No hospital ID provided')
        setLoading(false)
        return
      }
      
      setLoading(true)
      console.log('Fetching appointments for hospital:', hospitalId)
      const data = await getHospitalAppointments(hospitalId)
      console.log('Fetched appointments:', data)
      setAppointments(data || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
      toast.error('Failed to fetch appointments')
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  // Filter appointments based on search and status
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch =
      apt.patients?.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.doctor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.patients?.profiles?.registration_no?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const handleViewAppointment = (apt) => {
    setSelectedAppointment(apt)
    setShowModal(true)
    if (onAppointmentSelect) {
      onAppointmentSelect(apt)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
          <CardDescription>Loading appointments...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <p className="text-gray-500">Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Hospital Appointments</CardTitle>
          <CardDescription>
            Showing {filteredAppointments.length} of {appointments.length} appointments
          </CardDescription>
        </CardHeader>

        <CardContent>
        {/* Search and Filter Section */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by patient name, doctor, or appointment ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'scheduled', 'completed', 'cancelled'].map(status => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Appointments Table */}
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No appointments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appointment ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Patient Reg. No.</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map(apt => (
                  <TableRow key={apt.id}>
                    <TableCell className="font-medium">{apt.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{apt.patients?.profiles?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {apt.patients?.profiles?.registration_no || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-blue-400" />
                        <span>{apt.doctor?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(apt.appointment_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{apt.appointment_slot}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {apt.appointment_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(apt.status)}>
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleViewAppointment(apt)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Appointment Details Modal */}
    {selectedAppointment && (
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <DialogTitle>Appointment Details</DialogTitle>
                <DialogDescription>ID: {selectedAppointment.id}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Appointment Info */}
            <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
              <h3 className="font-semibold text-base">Appointment Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Patient Name</p>
                  <p className="font-medium text-sm mt-1">{selectedAppointment.patients?.profiles?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Patient Reg. No.</p>
                  <p className="font-medium text-sm mt-1">{selectedAppointment.patients?.profiles?.registration_no || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Doctor Name</p>
                  <p className="font-medium text-sm mt-1">{selectedAppointment.doctor?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Contact</p>
                  <p className="font-medium text-sm mt-1">{selectedAppointment.doctor?.mobile || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Date</p>
                  <p className="font-medium text-sm mt-1">{formatDate(selectedAppointment.appointment_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Time</p>
                  <p className="font-medium text-sm mt-1">{selectedAppointment.appointment_slot}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Type</p>
                  <p className="font-medium text-sm mt-1 capitalize">{selectedAppointment.appointment_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Status</p>
                  <Badge className={getStatusColor(selectedAppointment.status)}>
                    {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Notes</p>
                  <p className="font-medium text-sm mt-1">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>

            {/* Patient Information */}
            {selectedAppointment.patients?.profiles && (
              <div className="border rounded-lg p-4 space-y-4 bg-blue-50">
                <h3 className="font-semibold text-base">Patient Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-semibold">Email</p>
                    <p className="font-medium text-sm mt-1">{selectedAppointment.patients.profiles.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-semibold">Mobile</p>
                    <p className="font-medium text-sm mt-1">{selectedAppointment.patients.profiles.mobile || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-semibold">Address</p>
                    <p className="font-medium text-sm mt-1">{selectedAppointment.patients.profiles.address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-semibold">City</p>
                    <p className="font-medium text-sm mt-1">{selectedAppointment.patients.profiles.city || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-semibold">Blood Group</p>
                    <p className="font-medium text-sm mt-1">{selectedAppointment.patients.profiles.blood_group || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-semibold">Gender</p>
                    <p className="font-medium text-sm mt-1 capitalize">{selectedAppointment.patients.profiles.gender || '-'}</p>
                  </div>
                </div>

                {selectedAppointment.patients.profiles.date_of_birth && (
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-semibold">Date of Birth</p>
                    <p className="font-medium text-sm mt-1">{formatDate(selectedAppointment.patients.profiles.date_of_birth)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  )
}
