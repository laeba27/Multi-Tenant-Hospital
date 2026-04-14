'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search as SearchIcon, DollarSign, Clock, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { useUserDetails } from '@/hooks/use-user-details'
import { getTreatments, deleteTreatment, updateTreatmentStatus } from '@/actions/treatments'
import { getDepartments } from '@/actions/departments'
import { AddTreatmentDialog } from './add-treatment-dialog'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Helper function to capitalize names
const capitalizeWords = (str) => {
  if (!str) return ''
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

export default function TreatmentsPage() {
  const router = useRouter()
  const { hospital, isLoading: isUserLoading } = useUserDetails()
  const [treatments, setTreatments] = useState([])
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  const fetchTreatments = useCallback(async () => {
    if (!hospital?.id) return

    setIsLoading(true)
    try {
      const { data, error } = await getTreatments(hospital.id)
      if (error) throw new Error(error)
      setTreatments(data || [])
    } catch (error) {
      toast.error('Failed to load treatments')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [hospital])

  const fetchDepartments = useCallback(async () => {
    if (!hospital?.id) return
    try {
      const { data } = await getDepartments(hospital.id)
      setDepartments(data || [])
    } catch (error) {
      console.error(error)
    }
  }, [hospital])

  useEffect(() => {
    if (hospital?.id) {
      fetchTreatments()
      fetchDepartments()
    } else if (!isUserLoading && !hospital) {
      setIsLoading(false)
    }
  }, [hospital, isUserLoading, fetchTreatments, fetchDepartments])

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const result = await deleteTreatment(deleteId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setTreatments(prev => prev.filter(t => t.id !== deleteId))
      toast.success('Treatment deleted successfully')
    } catch (error) {
      toast.error('Failed to delete treatment')
      console.error(error)
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const handleStatusChange = async (treatmentId, newStatus) => {
    setUpdatingId(treatmentId)
    try {
      const result = await updateTreatmentStatus(treatmentId, newStatus)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setTreatments(prev => prev.map(t => 
        t.id === treatmentId ? { ...t, is_active: newStatus } : t
      ))
      toast.success(`Treatment ${newStatus ? 'activated' : 'deactivated'}`)
    } catch (error) {
      toast.error('Failed to update treatment status')
      console.error(error)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredTreatments = treatments.filter(t =>
    t.treatment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.treatment_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.departments?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!hospital) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Treatments Management</h2>
          <p className="text-muted-foreground">
            Manage treatment services and pricing
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Treatment
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Treatments List</CardTitle>
          <CardDescription>
            You have {treatments.length} total treatments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <SearchIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Treatment Name</TableHead>
                   
                    <TableHead>Department</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTreatments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No treatments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTreatments.map((treatment) => (
                      <TableRow
                        key={treatment.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/dashboard/hospital/treatments/${treatment.id}`)}
                      >
                        <TableCell>
                          <span className="font-medium">{capitalizeWords(treatment.treatment_name)}</span>
                        </TableCell>
                       
                        <TableCell>
                          {treatment.departments?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            {treatment.base_price.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {treatment.duration_minutes ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {treatment.duration_minutes} min
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select 
                            value={treatment.is_active ? 'active' : 'inactive'}
                            onValueChange={(val) => handleStatusChange(treatment.id, val === 'active')}
                            disabled={updatingId === treatment.id}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {treatment.created_at ? format(new Date(treatment.created_at), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(treatment.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Treatment Dialog */}
      <AddTreatmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        hospitalId={hospital?.id}
        departments={departments}
        onSuccess={fetchTreatments}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => !isDeleting && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Treatment?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            This action cannot be undone. The treatment will be permanently deleted.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end pt-4">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
