'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Building2, Search as SearchIcon } from 'lucide-react'
import { toast } from 'sonner'

import { useUserDetails } from '@/hooks/use-user-details'
import { getDepartments, deleteDepartment } from '@/actions/departments'
import { DepartmentDialog } from './department-dialog'

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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DepartmentsPage() {
    const { hospital, isLoading: isUserLoading } = useUserDetails()
    const [departments, setDepartments] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedDepartment, setSelectedDepartment] = useState(null)

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [departmentToDelete, setDepartmentToDelete] = useState(null)

    const fetchDepartments = useCallback(async () => {
        if (!hospital || !hospital.id) return

        setIsLoading(true)
        try {
            const { data, error } = await getDepartments(hospital.id)
            if (error) throw new Error(error)
            setDepartments(data || [])
        } catch (error) {
            toast.error('Failed to load departments')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }, [hospital])

    useEffect(() => {
        if (hospital?.id) {
            fetchDepartments()
        } else if (!isUserLoading && !hospital) {
            setIsLoading(false)
        }
    }, [hospital, isUserLoading, fetchDepartments])

    const handleCreate = () => {
        setSelectedDepartment(null)
        setIsDialogOpen(true)
    }

    const handleEdit = (dept) => {
        setSelectedDepartment(dept)
        setIsDialogOpen(true)
    }

    const handleDeleteClick = (dept) => {
        setDepartmentToDelete(dept)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!departmentToDelete) return

        try {
            const { error } = await deleteDepartment(departmentToDelete.id)
            if (error) throw new Error(error)

            toast.success('Department deleted successfully')
            fetchDepartments()
        } catch (error) {
            toast.error('Failed to delete department')
            console.error(error)
        } finally {
            setDeleteDialogOpen(false)
            setDepartmentToDelete(null)
        }
    }

    const filteredDepartments = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dept.code && dept.code.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    if (isUserLoading) {
        return <div className="flex items-center justify-center p-8">Loading user details...</div>
    }

    if (!hospital) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Hospital Profile</h3>
                <p className="text-muted-foreground">You need to have a hospital profile to manage departments.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Departments</h2>
                    <p className="text-muted-foreground">
                        Manage your hospital departments and units.
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Add Department
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Overview</CardTitle>
                    <CardDescription>
                        You have {departments.length} total departments.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2 mb-4">
                        <SearchIcon className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search departments..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            Loading departments...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredDepartments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No departments found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDepartments.map((dept) => (
                                        <TableRow key={dept.id}>
                                            <TableCell className="font-medium">
                                                {dept.name}
                                                {dept.description && (
                                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                        {dept.description}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>{dept.code || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={dept.is_active ? 'default' : 'secondary'}>
                                                    {dept.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(dept)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    <span className="sr-only">Edit</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => handleDeleteClick(dept)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Delete</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <DepartmentDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                department={selectedDepartment}
                hospitalId={hospital?.id}
                onSuccess={fetchDepartments}
            />

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete the <strong>{departmentToDelete?.name}</strong> department.
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
