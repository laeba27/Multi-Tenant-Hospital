'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
    ArrowLeft, 
    Mail, 
    Phone, 
    Calendar, 
    Briefcase, 
    Award, 
    Clock,
    DollarSign,
    User,
    MapPin,
    Edit,
    Trash2,
    AlertTriangle,
    Loader2,
    Check,
    X
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { getStaffById, updateStaff, deleteStaff } from '@/actions/staff'
import { staffSchema, DAYS_OF_WEEK } from '@/lib/validations/staff'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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

const ROLES = [
    { value: 'doctor', label: 'Doctor' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'receptionist', label: 'Receptionist' },
    { value: 'lab_technician', label: 'Lab Technician' },
    { value: 'pharmacist', label: 'Pharmacist' },
    { value: 'admin', label: 'Admin' },
    { value: 'other', label: 'Other' },
]

const EMPLOYMENT_TYPES = [
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'temporary', label: 'Temporary' },
    { value: 'permanent', label: 'Permanent' },
]

const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
]

export default function StaffDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [staff, setStaff] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const form = useForm({
        resolver: zodResolver(staffSchema),
        mode: 'onBlur',
    })

    // Watch the role field to conditionally show doctor-specific fields
    const selectedRole = useWatch({ control: form.control, name: 'role' })
    const isDoctor = selectedRole === 'doctor'

    useEffect(() => {
        const fetchStaffDetails = async () => {
            if (!params.id) return

            setIsLoading(true)
            try {
                const { data, error } = await getStaffById(params.id)
                if (error) throw new Error(error)
                setStaff(data)
                
                // Populate form with current data
                form.reset({
                    name: data.name || '',
                    email: data.profiles?.email || '',
                    mobile: data.profiles?.mobile || '',
                    role: data.role || '',
                    department_id: data.department_id || '',
                    employment_type: data.employment_type || '',
                    joining_date: data.joining_date || '',
                    gender: data.gender || '',
                    date_of_birth: data.date_of_birth || '',
                    specialization: data.specialization || '',
                    qualification: data.qualification || '',
                    license_number: data.license_number || '',
                    license_expiry: data.license_expiry || '',
                    years_of_experience: data.years_of_experience?.toString() || '',
                    shift_name: data.shift_name || '',
                    shift_start_time: data.shift_start_time || '',
                    shift_end_time: data.shift_end_time || '',
                    consultation_fee: data.consultation_fee?.toString() || '',
                    max_patients_per_day: data.max_patients_per_day?.toString() || '',
                    address: data.address || '',
                    emergency_contact: data.emergency_contact || '',
                    salary: data.salary?.toString() || '',
                    avatar_url: data.avatar_url || '',
                    notes: data.notes || '',
                    work_days: data.work_days || [],
                })
            } catch (error) {
                toast.error('Failed to load staff details')
                console.error(error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchStaffDetails()
    }, [params.id, form])

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteStaff(params.id)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success('Staff member deleted successfully')
            router.push('/dashboard/hospital/staff')
        } catch (error) {
            toast.error('Failed to delete staff member')
            console.error(error)
        } finally {
            setIsDeleting(false)
            setShowDeleteDialog(false)
        }
    }

    const handleSave = async (data) => {
        setIsSaving(true)
        try {
            const result = await updateStaff(params.id, data)
            
            if (result.error) {
                toast.error(result.error)
                return
            }

            // Re-fetch the updated staff data with relationships
            const { data: updatedStaff, error: fetchError } = await getStaffById(params.id)
            if (fetchError) {
                toast.error('Updated but failed to reload data')
                return
            }

            setStaff(updatedStaff)
            toast.success('Staff member updated successfully')
            setIsEditing(false)
        } catch (error) {
            toast.error('Failed to update staff member')
            console.error(error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        setIsEditing(false)
        form.reset()
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading staff details...</p>
                </div>
            </div>
        )
    }

    if (!staff) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h2 className="text-2xl font-bold mb-2">Staff Member Not Found</h2>
                <p className="text-muted-foreground mb-4">The staff member you're looking for doesn't exist.</p>
                <Button onClick={() => router.push('/dashboard/hospital/staff')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Staff List
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with Back Button and Action Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push('/dashboard/hospital/staff')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Staff Profile</h2>
                        <p className="text-muted-foreground">
                            Detailed information about {staff.name}
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
                                onClick={handleCancel}
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

            {/* Profile Header Card */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center md:items-start">
                            <Avatar className="h-32 w-32">
                                <AvatarImage src={staff.avatar_url} />
                                <AvatarFallback className="text-4xl">
                                    {staff.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <Badge 
                                variant={staff.is_active ? 'default' : 'secondary'} 
                                className="mt-4"
                            >
                                {staff.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold">{staff.name}</h3>
                                <p className="text-muted-foreground">
                                    {staff.employee_registration_no}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Role:</span>
                                    <Badge variant="outline" className="capitalize">
                                        {staff.role.replace('_', ' ')}
                                    </Badge>
                                </div>

                                {staff.departments?.name && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Department:</span>
                                        <span>{staff.departments.name}</span>
                                    </div>
                                )}

                                {staff.profiles?.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <a 
                                            href={`mailto:${staff.profiles.email}`}
                                            className="text-primary hover:underline"
                                        >
                                            {staff.profiles.email}
                                        </a>
                                    </div>
                                )}

                                {staff.profiles?.mobile && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <a 
                                            href={`tel:${staff.profiles.mobile}`}
                                            className="text-primary hover:underline"
                                        >
                                            {staff.profiles.mobile}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Form - Show when in edit mode */}
            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                        {/* Edit Mode Tabs */}
                        <Tabs defaultValue="personal" className="w-full">
                            <TabsList className="grid w-full max-w-2xl grid-cols-5">
                                <TabsTrigger value="personal">Personal</TabsTrigger>
                                <TabsTrigger value="professional">Professional</TabsTrigger>
                                <TabsTrigger value="employment">Employment</TabsTrigger>
                                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                                <TabsTrigger value="additional">Additional</TabsTrigger>
                            </TabsList>

                            {/* Personal Information Tab - Edit */}
                            <TabsContent value="personal" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Personal Information</CardTitle>
                                        <CardDescription>Basic personal details</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Name *</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Full name" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="gender"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Gender</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select gender" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {GENDER_OPTIONS.map((option) => (
                                                                    <SelectItem key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="date_of_birth"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Date of Birth</FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="address"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Address</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="residential address" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="emergency_contact"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Emergency Contact</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Phone or name" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Professional Information Tab - Edit */}
                            <TabsContent value="professional" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Professional Details</CardTitle>
                                        <CardDescription>Qualifications and experience</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="qualification"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Qualification</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g., MBBS, RN, etc" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="specialization"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Specialization</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g., Cardiology, Surgery, etc" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="years_of_experience"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Years of Experience</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" placeholder="0" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="license_number"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>License Number</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Professional license no." {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="license_expiry"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>License Expiry</FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {isDoctor && (
                                                <FormField
                                                    control={form.control}
                                                    name="consultation_fee"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Consultation Fee</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" placeholder="0.00" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}

                                            {isDoctor && (
                                                <FormField
                                                    control={form.control}
                                                    name="max_patients_per_day"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Max Patients Per Day</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" placeholder="0" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Employment Information Tab - Edit */}
                            <TabsContent value="employment" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Employment Details</CardTitle>
                                        <CardDescription>Work information and compensation</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="employment_type"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Employment Type</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select type" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {EMPLOYMENT_TYPES.map((option) => (
                                                                    <SelectItem key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="joining_date"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Joining Date</FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="salary"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Salary</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" placeholder="0.00" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="role"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Role *</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select role" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {ROLES.map((option) => (
                                                                    <SelectItem key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Schedule Information Tab - Edit */}
                            <TabsContent value="schedule" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Schedule & Shifts</CardTitle>
                                        <CardDescription>Work schedule information</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="shift_name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Shift Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g., Morning, Evening" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="shift_start_time"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Shift Start Time</FormLabel>
                                                        <FormControl>
                                                            <Input type="time" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="shift_end_time"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Shift End Time</FormLabel>
                                                        <FormControl>
                                                            <Input type="time" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Work Days */}
                                        <div className="mt-6">
                                            <FormLabel className="text-base font-semibold mb-4 block">Work Days</FormLabel>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {DAYS_OF_WEEK.map((day) => (
                                                    <FormField
                                                        key={day.value}
                                                        control={form.control}
                                                        name="work_days"
                                                        render={({ field }) => {
                                                            const isChecked = field.value && field.value.includes(day.value)
                                                            return (
                                                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            checked={isChecked}
                                                                            onCheckedChange={(checked) => {
                                                                                const current = field.value || []
                                                                                const updated = checked
                                                                                    ? [...current, day.value]
                                                                                    : current.filter(d => d !== day.value)
                                                                                field.onChange(updated)
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                    <FormLabel className="font-normal cursor-pointer">
                                                                        {day.label}
                                                                    </FormLabel>
                                                                </FormItem>
                                                            )
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Additional Information Tab - Edit */}
                            <TabsContent value="additional" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Additional Information</CardTitle>
                                        <CardDescription>Extra details and notes</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="notes"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Notes</FormLabel>
                                                    <FormControl>
                                                        <Textarea 
                                                            placeholder="Additional notes or remarks" 
                                                            {...field} 
                                                            rows={6}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="avatar_url"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Avatar URL</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="https://..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </form>
                </Form>
            )}

            {/* View Mode - Show when not editing */}
            {!isEditing && (
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full max-w-2xl grid-cols-5">
                    <TabsTrigger value="personal">Personal</TabsTrigger>
                    <TabsTrigger value="professional">Professional</TabsTrigger>
                    <TabsTrigger value="employment">Employment</TabsTrigger>
                    <TabsTrigger value="schedule">Schedule</TabsTrigger>
                    <TabsTrigger value="additional">Additional</TabsTrigger>
                </TabsList>

                {/* Personal Information Tab */}
                <TabsContent value="personal" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>Basic personal details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Gender</label>
                                    <p className="text-base capitalize">{staff.gender || 'Not specified'}</p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-base">
                                            {staff.date_of_birth 
                                                ? format(new Date(staff.date_of_birth), 'MMMM d, yyyy')
                                                : 'Not specified'
                                            }
                                        </p>
                                    </div>
                                </div>

                                {staff.address && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Address
                                        </label>
                                        <p className="text-base mt-1">{staff.address}</p>
                                    </div>
                                )}

                                {staff.emergency_contact && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Emergency Contact</label>
                                        <p className="text-base">{staff.emergency_contact}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Professional Information Tab */}
                <TabsContent value="professional" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Professional Details</CardTitle>
                            <CardDescription>Qualifications and experience</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Award className="h-4 w-4" />
                                        Qualification
                                    </label>
                                    <p className="text-base mt-1">{staff.qualification || 'Not specified'}</p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Briefcase className="h-4 w-4" />
                                        Specialization
                                    </label>
                                    <p className="text-base mt-1">{staff.specialization || 'Not specified'}</p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Years of Experience
                                    </label>
                                    <p className="text-base mt-1">
                                        {staff.years_of_experience 
                                            ? `${staff.years_of_experience} years` 
                                            : 'Not specified'
                                        }
                                    </p>
                                </div>

                                {staff.license_number && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">License Number</label>
                                        <p className="text-base">{staff.license_number}</p>
                                    </div>
                                )}

                                {staff.license_expiry && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">License Expiry</label>
                                        <p className="text-base">
                                            {format(new Date(staff.license_expiry), 'MMMM d, yyyy')}
                                        </p>
                                    </div>
                                )}

                                {staff.consultation_fee && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Consultation Fee</label>
                                        <p className="text-base">${staff.consultation_fee}</p>
                                    </div>
                                )}

                                {staff.max_patients_per_day && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Max Patients/Day</label>
                                        <p className="text-base">{staff.max_patients_per_day}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Employment Information Tab */}
                <TabsContent value="employment" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Employment Details</CardTitle>
                            <CardDescription>Work information and compensation</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {staff.employment_type && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Employment Type</label>
                                        <p className="text-base capitalize">{staff.employment_type.replace('_', ' ')}</p>
                                    </div>
                                )}

                                {staff.joining_date && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Joining Date
                                        </label>
                                        <p className="text-base mt-1">
                                            {format(new Date(staff.joining_date), 'MMMM d, yyyy')}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Salary
                                    </label>
                                    <p className="text-base mt-1">
                                        {staff.salary 
                                            ? `$${staff.salary.toLocaleString()}` 
                                            : 'Not disclosed'
                                        }
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Record Created
                                    </label>
                                    <p className="text-base mt-1">
                                        {staff.created_at 
                                            ? format(new Date(staff.created_at), 'MMMM d, yyyy')
                                            : 'Not specified'
                                        }
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Employee ID
                                    </label>
                                    <p className="text-base mt-1 font-mono">
                                        {staff.employee_registration_no}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <div className="mt-1">
                                        <Badge variant={staff.is_active ? 'default' : 'secondary'}>
                                            {staff.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Schedule Information Tab */}
                <TabsContent value="schedule" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Schedule & Shifts</CardTitle>
                            <CardDescription>Work schedule information</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {staff.shift_name && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Shift Name</label>
                                        <p className="text-base">{staff.shift_name}</p>
                                    </div>
                                )}

                                {staff.shift_start_time && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Start Time
                                        </label>
                                        <p className="text-base mt-1">{staff.shift_start_time}</p>
                                    </div>
                                )}

                                {staff.shift_end_time && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            End Time
                                        </label>
                                        <p className="text-base mt-1">{staff.shift_end_time}</p>
                                    </div>
                                )}

                                {staff.work_days && staff.work_days.length > 0 && (
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium text-muted-foreground mb-3 block">Work Days</label>
                                        <div className="grid grid-cols-7 gap-2">
                                            {DAYS_OF_WEEK.map((day) => (
                                                <div key={day.value} className="flex flex-col items-center">
                                                    <Checkbox
                                                        checked={staff.work_days?.includes(day.value) || false}
                                                        disabled
                                                        className="mb-2"
                                                    />
                                                    <label className="text-xs font-medium cursor-default">
                                                        {day.label.substring(0, 3)}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Additional Information Tab */}
                <TabsContent value="additional" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Additional Information</CardTitle>
                            <CardDescription>Extra details and notes</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {staff.notes && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                                    <p className="text-base mt-2 p-3 bg-muted rounded">
                                        {staff.notes}
                                    </p>
                                </div>
                            )}

                            {!staff.notes && (
                                <div className="text-center py-6 text-muted-foreground">
                                    <p>No additional notes available</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <AlertDialogTitle>Delete Staff Member?</AlertDialogTitle>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogDescription>
                        This action cannot be undone. You are about to permanently delete {staff.name} from the system.
                    </AlertDialogDescription>
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                        <strong>Warning:</strong> All associated records will be removed.
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

