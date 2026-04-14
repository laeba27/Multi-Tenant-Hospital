'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Loader2,
  Check,
  X,
  DollarSign,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { getTreatmentById, updateTreatment, deleteTreatment } from '@/actions/treatments'
import { getDepartments } from '@/actions/departments'
import { treatmentSchema } from '@/lib/validations/treatments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const capitalizeWords = (str) => {
  if (!str) return ''
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

export default function TreatmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [treatment, setTreatment] = useState(null)
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm({
    resolver: zodResolver(treatmentSchema),
    mode: 'onBlur',
  })

  useEffect(() => {
    const fetchTreatmentDetails = async () => {
      if (!params.id) return

      setIsLoading(true)
      try {
        const { data, error } = await getTreatmentById(params.id)
        if (error) throw new Error(error)
        setTreatment(data)
        
        // Populate form
        form.reset({
          treatment_name: data.treatment_name || '',
          treatment_code: data.treatment_code || '',
          description: data.description || '',
          department_id: data.department_id || '',
          base_price: data.base_price?.toString() || '',
          duration_minutes: data.duration_minutes?.toString() || '',
          preparation_instructions: data.preparation_instructions || '',
          post_treatment_instructions: data.post_treatment_instructions || '',
          is_active: data.is_active || true,
        })

        // Fetch departments
        const { data: depts } = await getDepartments(data.hospital_id)
        setDepartments(depts || [])
      } catch (error) {
        toast.error('Failed to load treatment details')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTreatmentDetails()
  }, [params.id, form])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteTreatment(params.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Treatment deleted successfully')
      router.push('/dashboard/hospital/treatments')
    } catch (error) {
      toast.error('Failed to delete treatment')
      console.error(error)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleSave = async (data) => {
    setIsSaving(true)
    try {
      const result = await updateTreatment(params.id, data)
      if (result.error) {
        toast.error(result.error)
        return
      }

      setTreatment({
        ...treatment,
        ...data,
      })
      toast.success('Treatment updated successfully')
      setIsEditing(false)
    } catch (error) {
      toast.error('Failed to update treatment')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!treatment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-2">Treatment Not Found</h2>
        <p className="text-muted-foreground mb-4">The treatment you're looking for doesn't exist.</p>
        <Button onClick={() => router.push('/dashboard/hospital/treatments')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Treatments
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/dashboard/hospital/treatments')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Treatment Details</h2>
            <p className="text-muted-foreground">
              {capitalizeWords(treatment.treatment_name)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsEditing(false)
                  form.reset()
                }}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={form.handleSubmit(handleSave)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Treatment Overview Card */}
      {!isEditing && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Treatment Code</label>
                <p className="text-base mt-1">{treatment.treatment_code || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Department</label>
                <p className="text-base mt-1">{treatment.departments?.name || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Base Price
                </label>
                <p className="text-base mt-1 font-semibold">${treatment.base_price.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration
                </label>
                <p className="text-base mt-1">{treatment.duration_minutes ? `${treatment.duration_minutes} minutes` : '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={treatment.is_active ? 'default' : 'secondary'}>
                    {treatment.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-base mt-1">
                  {treatment.created_at ? format(new Date(treatment.created_at), 'MMM d, yyyy') : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="treatment_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treatment Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Physiotherapy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="treatment_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treatment Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., PT001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Treatment description..." {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Pricing & Duration */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Duration</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="base_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (Minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="preparation_instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preparation Instructions</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Instructions before treatment..." {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="post_treatment_instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Post-Treatment Instructions</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Instructions after treatment..." {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </form>
        </Form>
      )}

      {/* Description and Instructions (View Mode) */}
      {!isEditing && (
        <>
          {(treatment.description || treatment.preparation_instructions || treatment.post_treatment_instructions) && (
            <>
              {treatment.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base text-gray-700 whitespace-pre-wrap">{treatment.description}</p>
                  </CardContent>
                </Card>
              )}

              {treatment.preparation_instructions && (
                <Card>
                  <CardHeader>
                    <CardTitle>Preparation Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base text-gray-700 whitespace-pre-wrap">{treatment.preparation_instructions}</p>
                  </CardContent>
                </Card>
              )}

              {treatment.post_treatment_instructions && (
                <Card>
                  <CardHeader>
                    <CardTitle>Post-Treatment Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base text-gray-700 whitespace-pre-wrap">{treatment.post_treatment_instructions}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDialogTitle>Delete Treatment?</AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          <AlertDialogDescription>
            This action cannot be undone. You are about to permanently delete {capitalizeWords(treatment.treatment_name)} from the system.
          </AlertDialogDescription>
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
            <strong>Warning:</strong> All references to this treatment will be removed.
          </div>
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
