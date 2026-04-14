'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

import { Label } from '@/components/ui/label'

import { departmentSchema } from '@/lib/validations/department'
import { createDepartment, updateDepartment } from '@/actions/departments'

export function DepartmentDialog({
    open,
    onOpenChange,
    department,
    hospitalId,
    onSuccess
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [saveAndAdd, setSaveAndAdd] = useState(false)
    const isEditing = !!department

    const form = useForm({
        resolver: zodResolver(departmentSchema),
        defaultValues: {
            name: '',
            code: '',
            description: '',
            is_active: true,
        },
    })

    // Reset form when dialog opens/closes or department changes
    useEffect(() => {
        if (open) {
            if (department) {
                form.reset({
                    name: department.name.charAt(0).toUpperCase() + department.name.slice(1),
                    code: department.code || '',
                    description: department.description || '',
                    is_active: department.is_active,
                })
            } else {
                form.reset({
                    name: '',
                    code: '',
                    description: '',
                    is_active: true,
                })
            }
        }
    }, [department, open, form])

    async function onSubmit(data) {
        if (!hospitalId) {
            toast.error('Hospital ID is missing')
            return
        }

        setIsSubmitting(true)

        try {
            let result

            if (isEditing) {
                result = await updateDepartment(department.id, data)
            } else {
                result = await createDepartment({
                    ...data,
                    hospital_id: hospitalId,
                })
            }

            if (result.error) {
                toast.error(result.error)
                return
            }

            toast.success(
                isEditing
                    ? 'Department updated successfully'
                    : 'Department created successfully'
            )

            if (onSuccess) onSuccess()

            if (saveAndAdd && !isEditing) {
                form.reset({
                    name: '',
                    code: '',
                    description: '',
                    is_active: true,
                })
            } else {
                onOpenChange(false)
            }
        } catch (error) {
            toast.error('Something went wrong')
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Department' : 'Add Department'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Make changes to the department details here.'
                            : 'Add a new department to your hospital.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Cardiology"
                                            {...field}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                const capitalized = value.charAt(0).toUpperCase() + value.slice(1)
                                                field.onChange(capitalized)
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Code (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="CARD" {...field} />
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
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Department description..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Active Status</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {!isEditing && (
                            <div className="flex items-center space-x-2 py-2">
                                <Switch
                                    id="save-and-add"
                                    checked={saveAndAdd}
                                    onCheckedChange={setSaveAndAdd}
                                />
                                <Label htmlFor="save-and-add">Save and update another</Label>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Save Changes' : 'Create Department'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
