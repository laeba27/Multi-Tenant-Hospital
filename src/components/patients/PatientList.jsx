'use client'

import { useState, useEffect } from 'react'
import { getHospitalPatients } from '@/actions/patients'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { deletePatient } from '@/actions/patients'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, FileText, CalendarPlus, Edit, Trash2 } from "lucide-react"

export function PatientList({
  hospitalId,
  userRole,
  onViewPatient,
  onEditPatient,
  onBookAppointment,
  refreshKey,
}) {
  const [patients, setPatients] = useState([])
  const [filteredPatients, setFilteredPatients] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadPatients()
  }, [hospitalId, refreshKey])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPatients(patients)
      return
    }

    const query = searchQuery.toLowerCase().trim()

    // Client-side filtering and sorting
    const filtered = patients
      .filter((patient) => {
        // Search by name
        if (patient.profile?.name?.toLowerCase().includes(query)) {
          return true
        }
        // Search by email
        if (patient.profile?.email?.toLowerCase().includes(query)) {
          return true
        }
        // Search by hospital patient ID
        if (patient.id?.toLowerCase().includes(query)) {
          return true
        }
        // Search by mobile
        if (patient.profile?.mobile?.includes(query)) {
          return true
        }
        return false
      })
      .sort((a, b) => {
        // Sort alphabetically by name
        const nameA = a.profile?.name || ''
        const nameB = b.profile?.name || ''
        return nameA.localeCompare(nameB)
      })

    setFilteredPatients(filtered)
  }, [searchQuery, patients])

  async function loadPatients() {
    try {
      setIsLoading(true)
      
      let currentHospitalId = hospitalId
      if (!currentHospitalId) {
        const response = await fetch('/api/auth/user')
        if (!response.ok) throw new Error('Failed to fetch user session details')
        const { user: userDetails } = await response.json()
        currentHospitalId = userDetails?.profile?.hospital_id
      }
      
      if (!currentHospitalId) {
        setPatients([])
        setFilteredPatients([])
        return
      }

      const data = await getHospitalPatients(currentHospitalId)
      setPatients(data)
      setFilteredPatients(data)
    } catch (error) {
      toast.error('Failed to load patients')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(patientId) {
    setIsDeleting(true)
    try {
      let currentHospitalId = hospitalId
      if (!currentHospitalId) {
        const response = await fetch('/api/auth/user')
        if (response.ok) {
           const { user: userDetails } = await response.json()
           currentHospitalId = userDetails?.profile?.hospital_id
        }
      }

      await deletePatient(patientId, currentHospitalId)
      toast.success('Patient deleted successfully')
      setDeleteDialogOpen(false)
      loadPatients()
    } catch (error) {
      toast.error('Failed to delete patient')
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusColor = (isActive) => {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800'
  }

  const canDelete = ['hospital_admin'].includes(userRole)

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading patients...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Search by name, email, patient ID, or mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Patient ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan="7" className="text-center py-8">
                  No patients found
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => (
                <TableRow
                  key={patient.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onViewPatient?.(patient)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={patient.profile?.avatar_url}
                          alt={patient.profile?.name}
                        />
                        <AvatarFallback>
                          {patient.profile?.name
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{patient.profile?.name}</div>
                        <div className="text-xs text-gray-500">Patient ID: {patient.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{patient.id}</span>
                  </TableCell>
                  <TableCell>{patient.profile?.email || '-'}</TableCell>
                  <TableCell>{patient.profile?.mobile}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(patient.is_active)}>
                      {patient.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(patient.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onViewPatient?.(patient)}>
                          <FileText className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditPatient?.(patient)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onBookAppointment?.(patient)}>
                          <CalendarPlus className="mr-2 h-4 w-4" /> Book Appointment
                        </DropdownMenuItem>
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setSelectedPatientId(patient.id)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Patient
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Patient</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this patient? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(selectedPatientId)}
              disabled={isDeleting}
              className="bg-destructive"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
