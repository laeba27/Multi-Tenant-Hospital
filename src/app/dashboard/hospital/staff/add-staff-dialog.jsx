'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Info, AlertCircle, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { staffSchema, DAYS_OF_WEEK } from '@/lib/validations/staff'
import { inviteStaff } from '@/actions/staff'

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

export function AddStaffDialog({
    open,
    onOpenChange,
    hospitalName,
    hospitalId,
    departments = [],
    onSuccess
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm({
        resolver: zodResolver(staffSchema),
        mode: 'onSubmit',
        defaultValues: {
            name: '',
            email: '',
            mobile: '',
            role: '',
            department_id: '',
            employment_type: '',
            joining_date: '',
            specialization: '',
            qualification: '',
            license_number: '',
            license_expiry: '',
            years_of_experience: '',
            gender: '',
            date_of_birth: '',
            shift_name: '',
            shift_start_time: '',
            shift_end_time: '',
            consultation_fee: '',
            max_patients_per_day: '',
            address: '',
            emergency_contact: '',
            salary: '',
            avatar_url: '',
            notes: '',
            work_days: [],
        },
    })

    const selectedRole = useWatch({ control: form.control, name: 'role' })
    const isDoctor = selectedRole === 'doctor'
    const formErrors = form.formState.errors
    const requiredFields = ['name', 'email', 'mobile', 'role']
    const missingRequired = requiredFields.filter(field => formErrors[field])
    const hasValidationErrors = Object.keys(formErrors).length > 0

    async function onSubmit(data) {
        console.log('Form submitted with data:', data)
        console.log('HospitalId:', hospitalId)
        console.log('Form errors:', form.formState.errors)
        
        if (!hospitalId) {
            toast.error('Hospital ID is missing. Please reload the page.')
            return
        }

        setIsSubmitting(true)

        try {
            // Send all form fields when inviting staff
            const inviteData = {
                name: data.name,
                email: data.email,
                mobile: data.mobile,
                role: data.role,
                hospital_id: hospitalId,
                department_id: data.department_id || null,
                employment_type: data.employment_type || null,
                joining_date: data.joining_date || null,
                specialization: data.specialization || null,
                qualification: data.qualification || null,
                license_number: data.license_number || null,
                license_expiry: data.license_expiry || null,
                years_of_experience: data.years_of_experience || null,
                gender: data.gender || null,
                date_of_birth: data.date_of_birth || null,
                shift_name: data.shift_name || null,
                shift_start_time: data.shift_start_time || null,
                shift_end_time: data.shift_end_time || null,
                consultation_fee: data.consultation_fee || null,
                max_patients_per_day: data.max_patients_per_day || null,
                address: data.address || null,
                emergency_contact: data.emergency_contact || null,
                salary: data.salary || null,
                avatar_url: data.avatar_url || null,
                notes: data.notes || null,
                work_days: data.work_days || null,
            }

            console.log('Calling inviteStaff with:', inviteData)
            const result = await inviteStaff(inviteData, hospitalName)

            console.log('Result:', result)

            if (result.error) {
                toast.error(result.error)
                return
            }

            if (result.warning) {
                toast.warning(result.warning)
            } else {
                toast.success('Staff invited successfully')
            }

            form.reset()
            if (onSuccess) onSuccess()
            onOpenChange(false)
        } catch (error) {
            toast.error('Something went wrong')
            console.error('Submit error:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitButtonClick = async () => {
        console.log('Submit button clicked')
        console.log('Form state:', form.formState)
        
        // Get all form values
        const formData = form.getValues()
        console.log('Form values:', formData)
        
        // Just call onSubmit directly, bypassing validation
        await onSubmit(formData)
    }

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            if (!newOpen) form.reset()
            onOpenChange(newOpen)
        }}>
            <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto">
                <DialogHeader className="sticky top-0 bg-white z-10 pb-4">
                    <DialogTitle>Add Staff Member</DialogTitle>
                    {hasValidationErrors && missingRequired.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded">
                            <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>Please fill in required fields:</span>
                            </div>
                            <ul className="text-sm text-red-600 ml-6 space-y-1">
                                {missingRequired.map(field => (
                                    <li key={field} className="list-disc">
                                        {formErrors[field]?.message || `${field.charAt(0).toUpperCase() + field.slice(1)} is required`}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <DialogDescription className="mt-3">
                        Invite a new staff member to your hospital. They will receive an email with a secure invitation link to set their password and activate their account.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form id="addStaffForm" className="space-y-6 pb-20">

                        {/* Section 1: Basic Information */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm">Basic Information</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                Name *
                                                {formErrors.name && <AlertCircle className="h-4 w-4 text-red-600" />}
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="John Doe" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                Email *
                                                {formErrors.email && <AlertCircle className="h-4 w-4 text-red-600" />}
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="john@example.com" type="email" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="mobile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                Mobile No. * (10 digits)
                                                {formErrors.mobile && <AlertCircle className="h-4 w-4 text-red-600" />}
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="9876543210" 
                                                    type="tel"
                                                    maxLength="10"
                                                    {...field} 
                                                    value={field.value || ''} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="gender"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Gender <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select gender" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {GENDER_OPTIONS.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
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
                                            <FormLabel>Date of Birth <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} value={field.value || ''} />
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
                                            <FormLabel>Avatar URL <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://..." {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Section 2: Role & Assignment */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm">Role & Assignment</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                Role *
                                                {formErrors.role && <AlertCircle className="h-4 w-4 text-red-600" />}
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select role" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {ROLES.map((role) => (
                                                        <SelectItem key={role.value} value={role.value}>
                                                            {role.label}
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
                                    name="department_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Department <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <Select onValueChange={(value) => field.onChange(value === 'all' ? '' : value)} defaultValue={field.value || 'all'}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select department" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="all">All Departments (General)</SelectItem>
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
                                <FormField
                                    control={form.control}
                                    name="employment_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Employment Type <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {EMPLOYMENT_TYPES.map((type) => (
                                                        <SelectItem key={type.value} value={type.value}>
                                                            {type.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Section 3: Doctor-Specific Fields */}
                        {isDoctor && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-sm">Doctor Information</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="specialization"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Specialization <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Cardiology" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="qualification"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Qualification <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., MBBS, MD" {...field} value={field.value || ''} />
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
                                                <FormLabel>License Number <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Medical license #" {...field} value={field.value || ''} />
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
                                                <FormLabel>License Expiry <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="consultation_fee"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Consultation Fee <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="0.00" step="0.01" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="max_patients_per_day"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max Patients/Day <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="20" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Section 4: Work Details */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm">Work Details</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="joining_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Joining Date <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} value={field.value || ''} />
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
                                            <FormLabel>Years of Experience <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="5" {...field} value={field.value || ''} />
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
                                            <FormLabel>Salary <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="0.00" step="0.01" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Section 5: Schedule */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm">Schedule & Shifts</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="shift_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Shift Name <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="Morning, Evening, Night" {...field} value={field.value || ''} />
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
                                            <FormLabel>Start Time <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} value={field.value || ''} />
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
                                            <FormLabel>End Time <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Work Days Selection */}
                            <div className="space-y-2">
                                <FormField
                                    control={form.control}
                                    name="work_days"
                                    render={() => (
                                        <FormItem>
                                            <FormLabel>Work Days <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <div className="grid grid-cols-7 gap-2">
                                                {DAYS_OF_WEEK.map((day) => (
                                                    <FormField
                                                        key={day.value}
                                                        control={form.control}
                                                        name="work_days"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-0 flex flex-col items-center">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(day.value) || false}
                                                                        onCheckedChange={(checked) => {
                                                                            const current = field.value || []
                                                                            if (checked) {
                                                                                field.onChange([...current, day.value])
                                                                            } else {
                                                                                field.onChange(current.filter(d => d !== day.value))
                                                                            }
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <label className="text-xs font-medium cursor-pointer mt-1">
                                                                    {day.label.substring(0, 3)}
                                                                </label>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Section 6: Additional Details */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm">Additional Details</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Address <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="Street, City" {...field} value={field.value || ''} />
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
                                            <FormLabel>Emergency Contact <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="Name & number" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Additional notes about this staff member..." {...field} value={field.value || ''} rows={3} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-sm">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                            <div className="text-blue-700">
                                Fields marked with <span className="font-semibold">*</span> are required. Other fields are optional and can be updated later.
                            </div>
                        </div>
                    </form>

                    {/* Sticky Footer - Inside Form Context */}
                    <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleSubmitButtonClick}
                            className="min-w-32"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Inviting...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Invite Staff
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

